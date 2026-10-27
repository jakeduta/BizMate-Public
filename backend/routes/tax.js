/**
 * tax.js — Tax Integration API Routes
 * All routes require authenticated business-scoped JWT (via /api middleware).
 * Admin and Manager roles only for most actions.
 */

import express from 'express';
import { pool } from '../db.js';
import { authorize } from '../middleware/auth.js';
import {
  buildTaxDashboard,
  getTaxProfile,
  computeFederalEstimate,
  getContractorSummary,
  getSalesTaxSummary,
  logTaxAction,
} from '../services/taxService.js';
import { getStateRules, getAllStateCodes, getStateOptions, estimateStateIncomeTax } from '../services/stateTaxRules.js';
import {
  computeFormReadiness,
  saveFormReadiness,
  getStoredFormReadiness,
  FORM_DEFINITIONS,
} from '../services/formReadinessService.js';

const router = express.Router();
const ADMIN_MANAGER = ['Admin', 'Manager'];

// ── GET /api/tax/dashboard ───────────────────────────────────────────────────
router.get('/dashboard', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId } = req.user;
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const dashboard = await buildTaxDashboard(businessId, taxYear);
    res.json(dashboard);
  } catch (err) {
    console.error('Tax dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/profile ─────────────────────────────────────────────────────
router.get('/profile', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    console.log('[TAX] GET profile for businessId:', req.user.businessId);
    const profile = await getTaxProfile(req.user.businessId);
    console.log('[TAX] profile result:', profile);
    res.json(profile || {});
  } catch (err) {
    console.error('[TAX] GET profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/profile ────────────────────────────────────────────────────
router.post('/profile', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    console.log('[TAX] POST profile for businessId:', businessId, '| body:', JSON.stringify(req.body));
    const {
      legal_name, ein, entity_type, tax_year, fiscal_year_end_month,
      primary_state, industry_type, sales_tax_enabled, payroll_enabled,
      contractor_tracking, estimated_payments_enabled, home_office_deduction,
      mileage_deduction, asset_depreciation, nexus_states,
    } = req.body;

    const nexusJson = JSON.stringify(Array.isArray(nexus_states) ? nexus_states : []);

    // Upsert profile
    await pool.query(
      `INSERT INTO tax_profiles
         (id, business_id, legal_name, ein, entity_type, tax_year, fiscal_year_end_month,
          primary_state, industry_type, sales_tax_enabled, payroll_enabled,
          contractor_tracking, estimated_payments_enabled, home_office_deduction,
          mileage_deduction, asset_depreciation, nexus_states)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         legal_name = VALUES(legal_name),
         ein = VALUES(ein),
         entity_type = VALUES(entity_type),
         tax_year = VALUES(tax_year),
         fiscal_year_end_month = VALUES(fiscal_year_end_month),
         primary_state = VALUES(primary_state),
         industry_type = VALUES(industry_type),
         sales_tax_enabled = VALUES(sales_tax_enabled),
         payroll_enabled = VALUES(payroll_enabled),
         contractor_tracking = VALUES(contractor_tracking),
         estimated_payments_enabled = VALUES(estimated_payments_enabled),
         home_office_deduction = VALUES(home_office_deduction),
         mileage_deduction = VALUES(mileage_deduction),
         asset_depreciation = VALUES(asset_depreciation),
         nexus_states = VALUES(nexus_states),
         updated_at = CURRENT_TIMESTAMP`,
      [
        businessId, legal_name, ein, entity_type, tax_year || 2025,
        fiscal_year_end_month || 12, primary_state, industry_type,
        sales_tax_enabled ? 1 : 0, payroll_enabled ? 1 : 0,
        contractor_tracking ? 1 : 0, estimated_payments_enabled ? 1 : 0,
        home_office_deduction ? 1 : 0, mileage_deduction ? 1 : 0,
        asset_depreciation ? 1 : 0, nexusJson,
      ]
    );

    await logTaxAction(businessId, 'profile_updated', 'tax_profile', null, req.body, userId);
    res.json({ success: true, message: 'Tax profile saved.' });
  } catch (err) {
    console.error('Tax profile save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/manual-entries ──────────────────────────────────────────────
router.get('/manual-entries', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT * FROM tax_manual_entries WHERE business_id = ? AND tax_year = ? ORDER BY date DESC`,
      [req.user.businessId, taxYear]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/manual-entries ─────────────────────────────────────────────
router.post('/manual-entries', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { category, description, amount, date, tax_year, is_deductible, notes } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tax_manual_entries
         (id, business_id, category, description, amount, date, tax_year, is_deductible, notes, created_by)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, category, description, amount, date, tax_year || 2025, is_deductible !== false ? 1 : 0, notes, userId]
    );

    await logTaxAction(businessId, 'manual_entry_created', 'tax_manual_entries', null,
      { category, amount, date }, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Manual entry error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tax/manual-entries/:id ──────────────────────────────────────────
router.put('/manual-entries/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { category, description, amount, date, is_deductible, notes } = req.body;

    await pool.query(
      `UPDATE tax_manual_entries
       SET category=?, description=?, amount=?, date=?, is_deductible=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [category, description, amount, date, is_deductible !== false ? 1 : 0, notes, req.params.id, businessId]
    );
    await logTaxAction(businessId, 'manual_entry_updated', 'tax_manual_entries', req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tax/manual-entries/:id ───────────────────────────────────────
router.delete('/manual-entries/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM tax_manual_entries WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/contractors ─────────────────────────────────────────────────
router.get('/contractors', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const contractors = await getContractorSummary(req.user.businessId, taxYear);
    res.json(contractors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/contractors ────────────────────────────────────────────────
router.post('/contractors', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { contractor_name, tin, w9_on_file, total_paid, tax_year, notes } = req.body;

    await pool.query(
      `INSERT INTO tax_contractor_records
         (id, business_id, contractor_name, tin, w9_on_file, total_paid, tax_year, notes)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, contractor_name, tin, w9_on_file ? 1 : 0, total_paid, tax_year || 2025, notes]
    );
    await logTaxAction(businessId, 'contractor_added', 'tax_contractor_records', null, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tax/contractors/:id ──────────────────────────────────────────────
router.put('/contractors/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { contractor_name, tin, w9_on_file, total_paid, notes } = req.body;
    await pool.query(
      `UPDATE tax_contractor_records
       SET contractor_name=?, tin=?, w9_on_file=?, total_paid=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [contractor_name, tin, w9_on_file ? 1 : 0, total_paid, notes, req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tax/contractors/:id ──────────────────────────────────────────
router.delete('/contractors/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM tax_contractor_records WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/sales-summaries ─────────────────────────────────────────────
router.get('/sales-summaries', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const summaries = await getSalesTaxSummary(req.user.businessId, taxYear);
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/sales-summaries ────────────────────────────────────────────
router.post('/sales-summaries', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { period_start, period_end, taxable_revenue, non_taxable_revenue,
            sales_tax_collected, sales_tax_remitted, state_code, notes } = req.body;

    await pool.query(
      `INSERT INTO tax_sales_summaries
         (id, business_id, period_start, period_end, taxable_revenue, non_taxable_revenue,
          sales_tax_collected, sales_tax_remitted, state_code, notes)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, period_start, period_end, taxable_revenue, non_taxable_revenue,
       sales_tax_collected, sales_tax_remitted, state_code, notes]
    );
    await logTaxAction(businessId, 'sales_summary_added', 'tax_sales_summaries', null, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/estimate ─────────────────────────────────────────────────────
router.get('/estimate', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const netIncome = parseFloat(req.query.income) || 0;
    const entityType = req.query.entity || 'sole_prop';
    const stateCode = req.query.state || null;

    const federal = computeFederalEstimate(netIncome, entityType);
    let stateEst = 0;
    if (stateCode) {
      stateEst = estimateStateIncomeTax(stateCode, netIncome);
    }

    res.json({ federal, stateTax: stateEst, stateCode, disclaimer: federal.disclaimer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/state-rules ──────────────────────────────────────────────────
router.get('/state-rules', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const stateCode = req.query.state;
    if (stateCode) {
      const rules = getStateRules(stateCode);
      if (!rules) return res.status(404).json({ error: 'State not found' });
      return res.json(rules);
    }
    res.json(getStateOptions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/audit-log ────────────────────────────────────────────────────
router.get('/audit-log', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_audit_log WHERE business_id = ? ORDER BY created_at DESC LIMIT 100`,
      [req.user.businessId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/report ───────────────────────────────────────────────────────
router.get('/report', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const { businessId } = req.user;

    // Aggregate a full tax report
    const dashboard = await buildTaxDashboard(businessId, taxYear);
    const contractors = await getContractorSummary(businessId, taxYear);
    const salesSummaries = await getSalesTaxSummary(businessId, taxYear);

    const [manualRows] = await pool.query(
      `SELECT * FROM tax_manual_entries WHERE business_id = ? AND tax_year = ? ORDER BY date`,
      [businessId, taxYear]
    );

    res.json({
      taxYear,
      generatedAt: new Date().toISOString(),
      dashboard,
      contractors,
      salesSummaries,
      manualEntries: manualRows,
      disclaimer: 'This report is for informational and preparation purposes only. Consult a licensed CPA or tax attorney before filing.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/tax/forms ────────────────────────────────────────────────────────
router.get('/forms', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId } = req.user;
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const dashboard = await buildTaxDashboard(businessId, taxYear);
    const profile   = dashboard.profile;
    const computed  = computeFormReadiness(profile, dashboard);
    const stored    = await getStoredFormReadiness(businessId, taxYear);

    // Merge stored reviewer notes / overrides into computed results
    const storedMap = {};
    for (const s of stored) storedMap[s.form_code] = s;

    const merged = computed.map(f => ({
      ...f,
      storedStatus:    storedMap[f.code]?.status || null,
      reviewerNotes:   storedMap[f.code]?.reviewer_notes || null,
      lockedAt:        storedMap[f.code]?.locked_at || null,
      exportedAt:      storedMap[f.code]?.exported_at || null,
    }));

    res.json({ forms: merged, taxYear });
  } catch (err) {
    console.error('forms readiness error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/forms/:code/status ─────────────────────────────────────────
router.post('/forms/:code/status', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { code } = req.params;
    const { status, reviewer_notes, tax_year } = req.body;
    const year = parseInt(tax_year) || new Date().getFullYear();

    const dashboard = await buildTaxDashboard(businessId, year);
    const profile   = dashboard.profile;
    const computed  = computeFormReadiness(profile, dashboard);
    const form      = computed.find(f => f.code === code);

    await saveFormReadiness(
      businessId, code, year,
      status || form?.status || 'in_progress',
      form?.completionPct || 0,
      form?.missingFields || [],
      reviewer_notes,
      userId
    );
    await logTaxAction(businessId, 'form_status_updated', 'tax_form_readiness', code, { status, reviewer_notes }, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/documents ────────────────────────────────────────────────────
router.get('/documents', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { status, document_type, tax_year } = req.query;
    let query = `SELECT * FROM tax_documents WHERE business_id = ?`;
    const params = [req.user.businessId];
    if (status)        { query += ` AND status = ?`;        params.push(status); }
    if (document_type) { query += ` AND document_type = ?`; params.push(document_type); }
    if (tax_year)      { query += ` AND tax_year = ?`;      params.push(parseInt(tax_year)); }
    query += ` ORDER BY created_at DESC`;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/documents ───────────────────────────────────────────────────
router.post('/documents', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { document_type, document_name, category, tax_year, status,
            file_name, upload_date, expiry_date, associated_entity, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_documents
         (id, business_id, document_type, document_name, category, tax_year,
          status, file_name, upload_date, expiry_date, associated_entity, notes, created_by)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?)`,
      [businessId, document_type, document_name, category, tax_year || null,
       status || 'requested', file_name, upload_date, expiry_date, associated_entity, notes, userId]
    );
    await logTaxAction(businessId, 'document_added', 'tax_documents', null, { document_type, document_name }, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tax/documents/:id ────────────────────────────────────────────────
router.put('/documents/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { document_name, status, notes, review_flag, expiry_date, upload_date, file_name } = req.body;
    await pool.query(
      `UPDATE tax_documents
       SET document_name=?, status=?, notes=?, review_flag=?, expiry_date=?,
           upload_date=?, file_name=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [document_name, status, notes, review_flag ? 1 : 0, expiry_date,
       upload_date, file_name, req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tax/documents/:id ────────────────────────────────────────────
router.delete('/documents/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_documents WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/payments ─────────────────────────────────────────────────────
router.get('/payments', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { tax_year, status, payment_type } = req.query;
    let query = `SELECT * FROM tax_payments_ledger WHERE business_id = ?`;
    const params = [req.user.businessId];
    if (tax_year)      { query += ` AND tax_year = ?`;      params.push(parseInt(tax_year)); }
    if (status)        { query += ` AND status = ?`;        params.push(status); }
    if (payment_type)  { query += ` AND payment_type = ?`;  params.push(payment_type); }
    query += ` ORDER BY payment_date DESC, created_at DESC`;
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/payments ────────────────────────────────────────────────────
router.post('/payments', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { payment_type, payment_level, state_code, amount, payment_date,
            period_start, period_end, tax_year, quarter, status,
            confirmation_number, payment_method, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_payments_ledger
         (id, business_id, payment_type, payment_level, state_code, amount, payment_date,
          period_start, period_end, tax_year, quarter, status, confirmation_number, payment_method, notes, created_by)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [businessId, payment_type, payment_level || 'federal', state_code, amount,
       payment_date, period_start, period_end, tax_year || 2025, quarter,
       status || 'pending', confirmation_number, payment_method, notes, userId]
    );
    await logTaxAction(businessId, 'payment_logged', 'tax_payments_ledger', null,
      { payment_type, amount, payment_date }, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tax/payments/:id ─────────────────────────────────────────────────
router.put('/payments/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { amount, payment_date, status, confirmation_number, payment_method, notes } = req.body;
    await pool.query(
      `UPDATE tax_payments_ledger SET amount=?, payment_date=?, status=?,
       confirmation_number=?, payment_method=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [amount, payment_date, status, confirmation_number, payment_method, notes,
       req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tax/payments/:id ──────────────────────────────────────────────
router.delete('/payments/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_payments_ledger WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tax/compliance ───────────────────────────────────────────────────
router.get('/compliance', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_compliance_registrations WHERE business_id=? ORDER BY state_code, registration_type`,
      [req.user.businessId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tax/compliance ──────────────────────────────────────────────────
router.post('/compliance', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { registration_type, state_code, jurisdiction, status,
            account_number, registration_date, renewal_date, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_compliance_registrations
         (id, business_id, registration_type, state_code, jurisdiction, status,
          account_number, registration_date, renewal_date, notes)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?)`,
      [businessId, registration_type, state_code, jurisdiction,
       status || 'not_started', account_number, registration_date, renewal_date, notes]
    );
    await logTaxAction(businessId, 'compliance_added', 'tax_compliance_registrations', null, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tax/compliance/:id ───────────────────────────────────────────────
router.put('/compliance/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { registration_type, state_code, jurisdiction, status,
            account_number, registration_date, renewal_date, notes } = req.body;
    await pool.query(
      `UPDATE tax_compliance_registrations
       SET registration_type=?, state_code=?, jurisdiction=?, status=?,
           account_number=?, registration_date=?, renewal_date=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [registration_type, state_code, jurisdiction, status, account_number,
       registration_date, renewal_date, notes, req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tax/compliance/:id ────────────────────────────────────────────
router.delete('/compliance/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_compliance_registrations WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET/POST/PUT/DELETE /api/tax/local-config ─────────────────────────────────
router.get('/local-config', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_local_configs WHERE business_id=? AND enabled=1 ORDER BY state_code, jurisdiction`,
      [req.user.businessId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/local-config', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId } = req.user;
    const { state_code, jurisdiction, jurisdiction_type, local_income_tax_rate,
            local_sales_tax_rate, local_payroll_tax_rate, local_business_tax_rate,
            has_local_filing, filing_frequency, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_local_configs
         (id, business_id, state_code, jurisdiction, jurisdiction_type, local_income_tax_rate,
          local_sales_tax_rate, local_payroll_tax_rate, local_business_tax_rate, has_local_filing, filing_frequency, notes)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?)`,
      [businessId, state_code, jurisdiction, jurisdiction_type || 'city',
       local_income_tax_rate || 0, local_sales_tax_rate || 0,
       local_payroll_tax_rate || 0, local_business_tax_rate || 0,
       has_local_filing ? 1 : 0, filing_frequency, notes]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/local-config/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { state_code, jurisdiction, jurisdiction_type, local_income_tax_rate,
            local_sales_tax_rate, local_payroll_tax_rate, local_business_tax_rate,
            has_local_filing, filing_frequency, notes, enabled } = req.body;
    await pool.query(
      `UPDATE tax_local_configs
       SET state_code=?, jurisdiction=?, jurisdiction_type=?, local_income_tax_rate=?,
           local_sales_tax_rate=?, local_payroll_tax_rate=?, local_business_tax_rate=?,
           has_local_filing=?, filing_frequency=?, notes=?, enabled=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [state_code, jurisdiction, jurisdiction_type, local_income_tax_rate,
       local_sales_tax_rate, local_payroll_tax_rate, local_business_tax_rate,
       has_local_filing ? 1 : 0, filing_frequency, notes, enabled !== false ? 1 : 0,
       req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/local-config/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_local_configs WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET/POST/PUT/DELETE /api/tax/book-adjustments ────────────────────────────
router.get('/book-adjustments', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT * FROM tax_book_adjustments WHERE business_id=? AND tax_year=? ORDER BY adjustment_type`,
      [req.user.businessId, taxYear]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/book-adjustments', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { adjustment_type, description, book_amount, tax_amount, tax_year, requires_review, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_book_adjustments
         (id, business_id, adjustment_type, description, book_amount, tax_amount, tax_year, requires_review, notes, created_by)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?)`,
      [businessId, adjustment_type, description, book_amount || 0, tax_amount || 0,
       tax_year || 2025, requires_review ? 1 : 0, notes, userId]
    );
    await logTaxAction(businessId, 'book_adjustment_added', 'tax_book_adjustments', null, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/book-adjustments/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { adjustment_type, description, book_amount, tax_amount, requires_review, notes } = req.body;
    await pool.query(
      `UPDATE tax_book_adjustments
       SET adjustment_type=?, description=?, book_amount=?, tax_amount=?, requires_review=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [adjustment_type, description, book_amount, tax_amount, requires_review ? 1 : 0, notes,
       req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/book-adjustments/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_book_adjustments WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET/POST/PUT/DELETE /api/tax/entity-details ───────────────────────────────
router.get('/entity-details', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT * FROM tax_entity_details WHERE business_id=? AND tax_year=? ORDER BY ownership_pct DESC`,
      [req.user.businessId, taxYear]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/entity-details', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { detail_type, name, ownership_pct, tax_year, compensation,
            distributions, k1_issued, basis_amount, ssn_last4, notes } = req.body;
    await pool.query(
      `INSERT INTO tax_entity_details
         (id, business_id, detail_type, name, ownership_pct, tax_year, compensation,
          distributions, k1_issued, basis_amount, ssn_last4, notes)
       VALUES (UUID(),?,?,?,?,?,?,?,?,?,?,?)`,
      [businessId, detail_type, name, ownership_pct, tax_year || 2025,
       compensation, distributions, k1_issued ? 1 : 0, basis_amount, ssn_last4, notes]
    );
    await logTaxAction(businessId, 'entity_detail_added', 'tax_entity_details', null, req.body, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/entity-details/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { name, ownership_pct, compensation, distributions, k1_issued, basis_amount, notes } = req.body;
    await pool.query(
      `UPDATE tax_entity_details
       SET name=?, ownership_pct=?, compensation=?, distributions=?, k1_issued=?, basis_amount=?, notes=?, updated_at=NOW()
       WHERE id=? AND business_id=?`,
      [name, ownership_pct, compensation, distributions, k1_issued ? 1 : 0, basis_amount, notes,
       req.params.id, req.user.businessId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/entity-details/:id', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    await pool.query(`DELETE FROM tax_entity_details WHERE id=? AND business_id=?`,
      [req.params.id, req.user.businessId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET/POST/PUT /api/tax/workflow ────────────────────────────────────────────
router.get('/workflow', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const taxYear = parseInt(req.query.year) || new Date().getFullYear();
    const [rows] = await pool.query(
      `SELECT * FROM tax_workflow_status WHERE business_id=? AND tax_year=?`,
      [req.user.businessId, taxYear]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workflow', authorize(...ADMIN_MANAGER), async (req, res) => {
  try {
    const { businessId, userId } = req.user;
    const { tax_year, status, current_step, reviewer_notes, checklist, amendment_notes } = req.body;
    const year = parseInt(tax_year) || new Date().getFullYear();
    const checklistJson = JSON.stringify(checklist || []);
    await pool.query(
      `INSERT INTO tax_workflow_status
         (id, business_id, tax_year, status, current_step, reviewer_notes, checklist, amendment_notes)
       VALUES (UUID(),?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         status=VALUES(status), current_step=VALUES(current_step),
         reviewer_notes=VALUES(reviewer_notes), checklist=VALUES(checklist),
         amendment_notes=VALUES(amendment_notes), updated_at=NOW()`,
      [businessId, year, status || 'draft', current_step || 1, reviewer_notes, checklistJson, amendment_notes]
    );
    if (status === 'approved') {
      await pool.query(
        `UPDATE tax_workflow_status SET approved_by=?, approved_at=NOW() WHERE business_id=? AND tax_year=?`,
        [userId, businessId, year]
      );
    }
    if (status === 'locked') {
      await pool.query(
        `UPDATE tax_workflow_status SET locked_by=?, locked_at=NOW() WHERE business_id=? AND tax_year=?`,
        [userId, businessId, year]
      );
    }
    await logTaxAction(businessId, 'workflow_updated', 'tax_workflow_status', null, { status, current_step }, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
