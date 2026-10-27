/**
 * formReadinessService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Maps BizMate tax data to IRS form readiness status.
 * Returns structured readiness objects — NOT actual legal form generation.
 *
 * All output is labeled "preparation readiness" and "estimated completeness".
 * Users must work with a CPA for actual form preparation and filing.
 */

import { pool } from '../db.js';

// ── Form Definitions ─────────────────────────────────────────────────────────

export const FORM_DEFINITIONS = {
  SCHEDULE_C: {
    code: 'SCHEDULE_C',
    name: 'Schedule C',
    fullName: 'Schedule C — Profit or Loss from Business',
    description: 'For sole proprietors and single-member LLCs reporting business income.',
    applicableEntities: ['sole_prop', 'single_llc'],
    filedWith: 'Form 1040',
    fields: [
      { key: 'business_name',    label: 'Business name / legal name',   required: true  },
      { key: 'ein_or_ssn',       label: 'EIN or SSN',                   required: true  },
      { key: 'business_address', label: 'Business address',             required: false },
      { key: 'gross_receipts',   label: 'Gross receipts or sales',      required: true  },
      { key: 'deductible_expenses', label: 'Business expense totals',   required: true  },
      { key: 'home_office',      label: 'Home office deduction',        required: false },
      { key: 'vehicle_mileage',  label: 'Vehicle / mileage records',    required: false },
      { key: 'cogs',             label: 'Cost of goods sold (if any)',  required: false },
    ],
  },
  FORM_1040ES: {
    code: 'FORM_1040ES',
    name: 'Form 1040-ES',
    fullName: 'Form 1040-ES — Estimated Tax for Individuals',
    description: 'Quarterly estimated tax payments for self-employed and pass-through entity owners.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp'],
    filedWith: 'Filed quarterly',
    fields: [
      { key: 'expected_income',    label: 'Expected annual income',        required: true },
      { key: 'deductions_estimate', label: 'Estimated deductions',         required: true },
      { key: 'se_tax_estimate',    label: 'Self-employment tax estimate',  required: true },
      { key: 'prior_payments',     label: 'Prior estimated payments made', required: false },
      { key: 'withholding',        label: 'Other withholding',             required: false },
    ],
  },
  FORM_941: {
    code: 'FORM_941',
    name: 'Form 941',
    fullName: 'Form 941 — Employer\'s Quarterly Federal Tax Return',
    description: 'Reports employee wages, tips, federal income tax withheld, and FICA taxes.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    requiresPayroll: true,
    filedWith: 'Quarterly',
    fields: [
      { key: 'employee_count',   label: 'Number of employees',           required: true },
      { key: 'total_wages',      label: 'Total wages paid',              required: true },
      { key: 'federal_withheld', label: 'Federal income tax withheld',   required: true },
      { key: 'ss_wages',         label: 'Social security wages',         required: true },
      { key: 'medicare_wages',   label: 'Medicare wages',                required: true },
      { key: 'deposits',         label: 'Tax deposits made',             required: true },
    ],
  },
  FORM_940: {
    code: 'FORM_940',
    name: 'Form 940',
    fullName: 'Form 940 — Employer\'s Annual FUTA Tax Return',
    description: 'Annual federal unemployment tax (FUTA) reporting.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    requiresPayroll: true,
    filedWith: 'Annual (due Jan 31)',
    fields: [
      { key: 'futa_wages',   label: 'Total FUTA-subject wages',     required: true },
      { key: 'futa_tax',     label: 'FUTA tax before adjustments',  required: true },
      { key: 'state_ui_paid', label: 'State unemployment paid',     required: true },
      { key: 'deposits',     label: 'FUTA deposits made',           required: false },
    ],
  },
  FORM_W2: {
    code: 'FORM_W2',
    name: 'Form W-2',
    fullName: 'Form W-2 — Wage and Tax Statement',
    description: 'Annual wage and tax statement issued to each employee.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    requiresPayroll: true,
    filedWith: 'Annual — due Jan 31 to employees, Feb 28 to SSA',
    fields: [
      { key: 'employee_records', label: 'Complete employee records',    required: true },
      { key: 'annual_wages',     label: 'Annual wage totals per employee', required: true },
      { key: 'federal_withheld', label: 'Federal tax withheld',         required: true },
      { key: 'state_withheld',   label: 'State tax withheld',           required: true },
      { key: 'ss_withheld',      label: 'Social security withheld',     required: true },
      { key: 'medicare_withheld', label: 'Medicare withheld',           required: true },
    ],
  },
  FORM_W3: {
    code: 'FORM_W3',
    name: 'Form W-3',
    fullName: 'Form W-3 — Transmittal of Wage and Tax Statements',
    description: 'Summary transmittal filed with SSA along with all W-2s.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    requiresPayroll: true,
    filedWith: 'Annual — with W-2s to SSA',
    fields: [
      { key: 'w2_count',       label: 'Total number of W-2s',            required: true },
      { key: 'total_wages',    label: 'Total wages from all W-2s',        required: true },
      { key: 'total_withheld', label: 'Total federal tax withheld',       required: true },
    ],
  },
  FORM_1099NEC: {
    code: 'FORM_1099NEC',
    name: 'Form 1099-NEC',
    fullName: 'Form 1099-NEC — Nonemployee Compensation',
    description: 'Required for contractors/vendors paid $600+ in the year.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    filedWith: 'Annual — due Jan 31 to contractors, Feb 28 to IRS',
    fields: [
      { key: 'contractor_list',  label: 'Contractor payment records',    required: true },
      { key: 'tin_records',      label: 'TIN / W-9 for each contractor', required: true },
      { key: 'nec_amounts',      label: 'NEC amounts ≥$600',             required: true },
    ],
  },
  FORM_1096: {
    code: 'FORM_1096',
    name: 'Form 1096',
    fullName: 'Form 1096 — Annual Summary and Transmittal of U.S. Information Returns',
    description: 'Cover sheet transmittal for paper 1099s, W-2Gs, and other info returns.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    filedWith: 'Annual — with 1099s to IRS',
    fields: [
      { key: 'return_count',  label: 'Total 1099 count',                required: true },
      { key: 'total_amount',  label: 'Total amount from all returns',   required: true },
      { key: 'ein',           label: 'EIN of filer',                    required: true },
    ],
  },
  STATE_SALES_RETURN: {
    code: 'STATE_SALES_RETURN',
    name: 'State Sales Tax Return',
    fullName: 'State Sales & Use Tax Return (varies by state)',
    description: 'Periodic sales tax filing required in states where you collect sales tax.',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp', 'c_corp'],
    requiresSalesTax: true,
    filedWith: 'Monthly / Quarterly / Annual (state-dependent)',
    fields: [
      { key: 'taxable_sales',    label: 'Total taxable sales',          required: true },
      { key: 'exempt_sales',     label: 'Exempt / non-taxable sales',   required: true },
      { key: 'tax_collected',    label: 'Tax collected',                required: true },
      { key: 'deductions',       label: 'Allowed deductions',           required: false },
      { key: 'net_tax_due',      label: 'Net tax due',                  required: true },
    ],
  },
  STATE_ESTIMATED: {
    code: 'STATE_ESTIMATED',
    name: 'State Estimated Tax',
    fullName: 'State Estimated Income Tax Payment',
    description: 'Quarterly state estimated tax payments (state-dependent).',
    applicableEntities: ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp'],
    filedWith: 'Quarterly (state-dependent)',
    fields: [
      { key: 'state_income',     label: 'Expected state taxable income', required: true },
      { key: 'payment_amount',   label: 'Quarterly payment amount',      required: true },
    ],
  },
};

// ── Readiness Calculator ─────────────────────────────────────────────────────

/**
 * Compute readiness for all applicable forms given the business context
 */
export function computeFormReadiness(profile, dashboardData) {
  const { invoiceCount, revenue, expenses, payroll, federalEstimates } = dashboardData || {};
  const entityType = profile?.entity_type;
  const results = [];

  for (const [, form] of Object.entries(FORM_DEFINITIONS)) {
    // Skip forms not applicable to entity type
    if (form.applicableEntities && !form.applicableEntities.includes(entityType)) continue;
    // Skip payroll forms if payroll not enabled
    if (form.requiresPayroll && !profile?.payroll_enabled) continue;
    // Skip sales tax forms if not enabled
    if (form.requiresSalesTax && !profile?.sales_tax_enabled) continue;

    const { completionPct, missingFields, status } = assessFormReadiness(form, profile, dashboardData);

    results.push({
      ...form,
      completionPct,
      missingFields,
      status,
      applicable: true,
    });
  }

  return results;
}

function assessFormReadiness(form, profile, data) {
  const { invoiceCount, revenue, expenses, payroll, federalEstimates } = data || {};
  const missing = [];

  const checks = {
    business_name:      !!profile?.legal_name,
    ein_or_ssn:         !!profile?.ein,
    business_address:   true, // optional
    gross_receipts:     (invoiceCount || 0) > 0,
    deductible_expenses: (expenses?.deductibleExpenses || 0) > 0,
    home_office:        !profile?.home_office_deduction || true, // optional
    vehicle_mileage:    !profile?.mileage_deduction || true,     // optional
    cogs:               true, // optional
    expected_income:    (revenue?.grossRevenue || 0) > 0,
    deductions_estimate: (expenses?.deductibleExpenses || 0) >= 0,
    se_tax_estimate:    (federalEstimates?.selfEmploymentTax || 0) >= 0,
    prior_payments:     true, // optional
    withholding:        true, // optional
    employee_count:     (payroll?.employeeCount || 0) > 0,
    total_wages:        (payroll?.estimatedWages || 0) > 0,
    federal_withheld:   (payroll?.employeeCount || 0) > 0,
    ss_wages:           (payroll?.estimatedWages || 0) > 0,
    medicare_wages:     (payroll?.estimatedWages || 0) > 0,
    deposits:           true,
    futa_wages:         (payroll?.estimatedWages || 0) > 0,
    futa_tax:           (payroll?.estimatedWages || 0) > 0,
    state_ui_paid:      true, // manual
    employee_records:   (payroll?.employeeCount || 0) > 0,
    annual_wages:       (payroll?.estimatedWages || 0) > 0,
    state_withheld:     true,
    ss_withheld:        (payroll?.estimatedWages || 0) > 0,
    medicare_withheld:  (payroll?.estimatedWages || 0) > 0,
    w2_count:           (payroll?.employeeCount || 0) > 0,
    total_withheld:     (payroll?.employeeCount || 0) > 0,
    contractor_list:    true, // from contractor module
    tin_records:        true,
    nec_amounts:        true,
    return_count:       true,
    total_amount:       true,
    ein:                !!profile?.ein,
    taxable_sales:      (revenue?.salesTaxCollected || 0) >= 0,
    exempt_sales:       true,
    tax_collected:      (revenue?.salesTaxCollected || 0) >= 0,
    deductions:         true,
    net_tax_due:        (revenue?.salesTaxDue || 0) >= 0,
    state_income:       !!profile?.primary_state,
    payment_amount:     !!profile?.primary_state,
  };

  const requiredFields = form.fields.filter(f => f.required);
  let passCount = 0;

  for (const field of form.fields) {
    const passes = checks[field.key] !== false;
    if (passes) passCount++;
    else if (field.required) missing.push(field.label);
  }

  const totalFields = form.fields.length;
  const completionPct = totalFields > 0 ? Math.round((passCount / totalFields) * 100) : 0;

  let status;
  if (missing.length === 0 && completionPct >= 80) status = 'ready';
  else if (completionPct >= 50) status = 'needs_review';
  else if (completionPct > 0) status = 'in_progress';
  else status = 'not_started';

  return { completionPct, missingFields: missing, status };
}

// ── DB Persistence ───────────────────────────────────────────────────────────

export async function saveFormReadiness(businessId, formCode, taxYear, status, completionPct, missingFields, reviewerNotes, reviewedBy) {
  try {
    await pool.query(
      `INSERT INTO tax_form_readiness
         (id, business_id, form_code, tax_year, status, completion_pct, missing_fields, reviewer_notes, reviewed_by)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         completion_pct = VALUES(completion_pct),
         missing_fields = VALUES(missing_fields),
         reviewer_notes = VALUES(reviewer_notes),
         reviewed_by = VALUES(reviewed_by),
         updated_at = NOW()`,
      [businessId, formCode, taxYear, status, completionPct,
       JSON.stringify(missingFields || []), reviewerNotes, reviewedBy]
    );
    return { success: true };
  } catch (err) {
    console.error('saveFormReadiness error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getStoredFormReadiness(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_form_readiness WHERE business_id = ? AND tax_year = ?`,
      [businessId, taxYear]
    );
    return rows;
  } catch {
    return [];
  }
}
