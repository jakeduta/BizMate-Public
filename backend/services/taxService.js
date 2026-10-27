/**
 * taxService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Core tax business logic service for BizMate Tax Integration module.
 * Aggregates data from all BizMate modules and computes tax estimates.
 *
 * DISCLAIMER: All calculations are estimates for preparation purposes only.
 * Users should verify all figures with a qualified tax professional.
 */

import { pool } from '../db.js';
import { getStateRules, estimateStateIncomeTax } from './stateTaxRules.js';

// ── Federal Tax Constants (2025 Tax Year — update annually) ──────────────────
const FEDERAL_STANDARD_DEDUCTION_SOLE_PROP = 15000;  // Single filer
const SE_TAX_RATE = 0.1530;          // 15.3% self-employment tax
const SE_TAX_DEDUCTIBLE_HALF = 0.5;  // Half of SE tax is deductible
const QUALIFIED_BUSINESS_INCOME_DEDUCTION = 0.20; // 20% QBI deduction (Section 199A)
const CORPORATE_TAX_RATE = 0.21;     // C-Corp flat federal rate
const ADDITIONAL_MEDICARE_THRESHOLD = 200000; // $200k threshold for extra 0.9%

// Federal ordinary income brackets for 2025 (Single filer — for pass-through estimation)
const FEDERAL_BRACKETS_2025 = [
  { min: 0,      max: 11925,   rate: 0.10 },
  { min: 11925,  max: 48475,   rate: 0.12 },
  { min: 48475,  max: 103350,  rate: 0.22 },
  { min: 103350, max: 197300,  rate: 0.24 },
  { min: 197300, max: 250525,  rate: 0.32 },
  { min: 250525, max: 626350,  rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

// ── Quarterly Estimated Tax Due Dates ────────────────────────────────────────
export const FEDERAL_QUARTERLY_DEADLINES = [
  { quarter: 'Q1', label: 'Q1 2025', dueDate: '2025-04-15', period: 'Jan–Mar' },
  { quarter: 'Q2', label: 'Q2 2025', dueDate: '2025-06-16', period: 'Apr–May' },
  { quarter: 'Q3', label: 'Q3 2025', dueDate: '2025-09-15', period: 'Jun–Aug' },
  { quarter: 'Q4', label: 'Q4 2025', dueDate: '2026-01-15', period: 'Sep–Dec' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateFederalBracketTax(income) {
  let tax = 0;
  let remaining = income;
  for (const bracket of FEDERAL_BRACKETS_2025) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }
  return Math.max(0, tax);
}

function safeNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// ── Data Aggregation ─────────────────────────────────────────────────────────

/**
 * Aggregate invoice revenue data for the business
 */
async function getInvoiceRevenue(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT
         SUM(total)       AS gross_revenue,
         SUM(paid_amount) AS collected_revenue,
         SUM(tax)         AS sales_tax_collected,
         COUNT(*)         AS invoice_count,
         SUM(CASE WHEN status IN ('paid','partial') THEN paid_amount ELSE 0 END) AS received_revenue
       FROM invoices
       WHERE business_id = ? AND YEAR(date) = ?`,
      [businessId, taxYear]
    );
    return rows[0] || {};
  } catch {
    return {};
  }
}

/**
 * Aggregate payment data for the business
 */
async function getPaymentData(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT
         SUM(p.amount)   AS total_payments,
         COUNT(*)        AS payment_count
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.business_id = ? AND YEAR(p.date) = ?`,
      [businessId, taxYear]
    );
    return rows[0] || {};
  } catch {
    return {};
  }
}

/**
 * Aggregate employee / payroll data
 */
async function getEmployeeData(businessId, taxYear) {
  try {
    const [employees] = await pool.query(
      `SELECT COUNT(*) AS employee_count,
              SUM(hourly_rate) AS total_hourly_rates
       FROM employees WHERE business_id = ? AND active = TRUE`,
      [businessId]
    );
    const [clockHours] = await pool.query(
      `SELECT
         SUM(TIMESTAMPDIFF(MINUTE, clock_in_time, COALESCE(clock_out_time, NOW())) / 60) AS total_hours
       FROM clockins
       WHERE business_id = ? AND YEAR(clock_in_time) = ?`,
      [businessId, taxYear]
    );
    return {
      ...(employees[0] || {}),
      total_hours: safeNum(clockHours[0]?.total_hours),
    };
  } catch (err) {
    console.error('[TAX] getEmployeeData error:', err.sqlMessage || err.message);
    return {};
  }
}

/**
 * Fetch manual tax entries grouped by category
 */
async function getManualEntries(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT category, SUM(amount) AS total, COUNT(*) AS count
       FROM tax_manual_entries
       WHERE business_id = ? AND tax_year = ?
       GROUP BY category`,
      [businessId, taxYear]
    );
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fetch the tax profile for a business
 */
export async function getTaxProfile(businessId) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_profiles WHERE business_id = ?`,
      [businessId]
    );
    if (rows[0]?.nexus_states && typeof rows[0].nexus_states === 'string') {
      rows[0].nexus_states = JSON.parse(rows[0].nexus_states);
    }
    return rows[0] || null;
  } catch (err) {
    console.error('[TAX] getTaxProfile error:', err.sqlMessage || err.message);
    return null;
  }
}

// ── Core Tax Engine ──────────────────────────────────────────────────────────

/**
 * Main tax dashboard data aggregator
 * Returns all data needed for the Tax Integration tab dashboard
 */
export async function buildTaxDashboard(businessId, taxYear) {
  const [profile, invoiceData, paymentData, employeeData, manualEntries] =
    await Promise.all([
      getTaxProfile(businessId),
      getInvoiceRevenue(businessId, taxYear),
      getPaymentData(businessId, taxYear),
      getEmployeeData(businessId, taxYear),
      getManualEntries(businessId, taxYear),
    ]);

  // ── Revenue ─────────────────────────────────────────────────────────────
  const grossRevenue    = safeNum(invoiceData.gross_revenue);
  const collectedRev    = safeNum(invoiceData.collected_revenue);
  const salesTaxCollected = safeNum(invoiceData.sales_tax_collected);

  // Manual entries by category
  const manualByCategory = {};
  for (const entry of manualEntries) {
    manualByCategory[entry.category] = safeNum(entry.total);
  }

  // Total deductible expenses from manual entries
  const deductibleExpenses = manualEntries.reduce(
    (sum, e) => sum + safeNum(e.total), 0
  );

  // ── Payroll estimate ─────────────────────────────────────────────────────
  const estimatedWages = safeNum(employeeData.total_hours) *
    (safeNum(employeeData.total_hourly_rates) / Math.max(1, safeNum(employeeData.employee_count)));

  // Employer-side FICA: 7.65% of wages up to SS wage base
  const SS_WAGE_BASE = 176100; // 2025
  const employerSSRate = 0.062;
  const employerMedicareRate = 0.0145;
  const wagesForSS = Math.min(estimatedWages, SS_WAGE_BASE);
  const payrollTaxLiability = (wagesForSS * employerSSRate) + (estimatedWages * employerMedicareRate);

  // ── Net income ───────────────────────────────────────────────────────────
  const netIncome = Math.max(0, grossRevenue - deductibleExpenses - estimatedWages);

  // ── Federal estimates by entity type ────────────────────────────────────
  const entityType = profile?.entity_type || 'sole_prop';
  const estimates  = computeFederalEstimate(netIncome, entityType, payrollTaxLiability);

  // ── State income tax estimate ────────────────────────────────────────────
  const stateCode = profile?.primary_state;
  let stateTaxEstimate = 0;
  let stateRules = null;
  if (stateCode) {
    stateRules = getStateRules(stateCode);
    const stateNetIncome = ['sole_prop', 'single_llc', 'multi_llc', 'partnership', 's_corp'].includes(entityType)
      ? netIncome  // pass-through
      : 0;         // C-Corp pays at entity level, not individual
    stateTaxEstimate = estimateStateIncomeTax(stateCode, stateNetIncome);
  }

  // ── Sales tax due ────────────────────────────────────────────────────────
  const salesTaxRemitted = safeNum(manualByCategory['sales_tax_remitted']);
  const salesTaxDue = Math.max(0, salesTaxCollected - salesTaxRemitted);

  // ── Tax readiness score ──────────────────────────────────────────────────
  const readinessScore = computeReadinessScore(profile, manualEntries, invoiceData);

  // ── Upcoming deadlines ───────────────────────────────────────────────────
  const deadlines = buildDeadlines(profile, stateRules, stateCode);

  // ── AI Insights ──────────────────────────────────────────────────────────
  const insights = generateInsights(profile, invoiceData, manualEntries, employeeData, netIncome);

  // ── Alerts ───────────────────────────────────────────────────────────────
  const alerts = generateAlerts(profile, invoiceData, employeeData, salesTaxCollected, salesTaxRemitted);

  return {
    profile,
    revenue: {
      grossRevenue,
      collectedRevenue: collectedRev,
      salesTaxCollected,
      salesTaxRemitted,
      salesTaxDue,
    },
    expenses: {
      deductibleExpenses,
      byCategory: manualByCategory,
    },
    payroll: {
      estimatedWages,
      employeeCount: safeNum(employeeData.employee_count),
      totalHours: safeNum(employeeData.total_hours),
      payrollTaxLiability,
    },
    netIncome,
    federalEstimates: estimates,
    stateTaxEstimate,
    stateCode,
    stateRules: stateRules ? {
      name: stateRules.name,
      hasIncomeTax: stateRules.hasIncomeTax,
      incomeTaxRate: stateRules.incomeTaxRate,
      hasSalesTax: stateRules.hasSalesTax,
      salesTaxRate: stateRules.salesTaxRate,
      filingReminder: stateRules.filingReminder,
      notes: stateRules.notes,
    } : null,
    readinessScore,
    deadlines,
    insights,
    alerts,
    invoiceCount: safeNum(invoiceData.invoice_count),
    taxYear,
    disclaimer: "All estimates are for informational purposes only. Consult a licensed tax professional before filing.",
  };
}

/**
 * Compute federal tax estimates based on entity type
 */
export function computeFederalEstimate(netIncome, entityType, payrollTaxLiability = 0) {
  if (netIncome <= 0) {
    return { federalIncomeTax: 0, selfEmploymentTax: 0, quarterlyPayment: 0, effectiveRate: 0, entityType };
  }

  let federalIncomeTax = 0;
  let selfEmploymentTax = 0;

  if (entityType === 'c_corp') {
    // C-Corp: 21% flat corporate tax
    federalIncomeTax = netIncome * CORPORATE_TAX_RATE;
  } else {
    // Pass-through entities: SE tax + income tax
    if (['sole_prop', 'single_llc'].includes(entityType)) {
      // Self-employment tax: 15.3% on 92.35% of net SE income
      const seTaxableIncome = netIncome * 0.9235;
      selfEmploymentTax = seTaxableIncome * SE_TAX_RATE;

      // Deductible half of SE tax
      const seDeduction = selfEmploymentTax * SE_TAX_DEDUCTIBLE_HALF;

      // QBI deduction (20% of qualified business income)
      const qbiDeduction = netIncome * QUALIFIED_BUSINESS_INCOME_DEDUCTION;

      // Adjusted gross income for federal brackets
      const adjustedIncome = Math.max(0,
        netIncome - seDeduction - qbiDeduction - FEDERAL_STANDARD_DEDUCTION_SOLE_PROP
      );

      federalIncomeTax = calculateFederalBracketTax(adjustedIncome);
    } else if (['partnership', 'multi_llc', 's_corp'].includes(entityType)) {
      // Pass-through: income taxed at individual level
      // S-Corp: reasonable salary reduces SE tax (simplified — no salary split here)
      const qbiDeduction = netIncome * QUALIFIED_BUSINESS_INCOME_DEDUCTION;
      const adjustedIncome = Math.max(0,
        netIncome - qbiDeduction - FEDERAL_STANDARD_DEDUCTION_SOLE_PROP
      );
      federalIncomeTax = calculateFederalBracketTax(adjustedIncome);
      // Partial SE tax for partners/S-Corp (simplified)
      if (entityType !== 's_corp') {
        const seTaxableIncome = netIncome * 0.9235;
        selfEmploymentTax = seTaxableIncome * SE_TAX_RATE;
      }
    }
  }

  const totalTax = federalIncomeTax + selfEmploymentTax;
  const effectiveRate = netIncome > 0 ? (totalTax / netIncome) : 0;
  const quarterlyPayment = totalTax / 4;

  return {
    federalIncomeTax: Math.round(federalIncomeTax * 100) / 100,
    selfEmploymentTax: Math.round(selfEmploymentTax * 100) / 100,
    totalFederalTax: Math.round(totalTax * 100) / 100,
    quarterlyPayment: Math.round(quarterlyPayment * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 10000) / 100,
    entityType,
    disclaimer: "Estimated values only. Actual tax depends on deductions, credits, filing status, and more.",
  };
}

/**
 * Compute tax readiness score (0–100)
 */
function computeReadinessScore(profile, manualEntries, invoiceData) {
  let score = 0;
  const issues = [];

  if (!profile) {
    return { score: 0, label: 'Not Started', issues: ['Tax profile not configured'], pct: 0 };
  }

  // Profile completeness (40 pts)
  if (profile.entity_type) score += 10; else issues.push('Business entity type not set');
  if (profile.primary_state) score += 10; else issues.push('Primary state not configured');
  if (profile.legal_name) score += 10; else issues.push('Legal business name missing');
  if (profile.tax_year) score += 10; else issues.push('Tax year not selected');

  // Data sync (30 pts)
  if (safeNum(invoiceData.invoice_count) > 0) score += 15; else issues.push('No invoice data synced');
  if (manualEntries.length > 0) score += 15; else issues.push('No expense data entered');

  // Configuration (30 pts)
  if (profile.sales_tax_enabled !== undefined) score += 10;
  if (profile.payroll_enabled !== undefined) score += 10;
  if (profile.contractor_tracking !== undefined) score += 10;

  const label =
    score >= 85 ? 'Ready' :
    score >= 65 ? 'Good' :
    score >= 40 ? 'Needs Work' : 'Poor';

  return { score, label, issues, pct: score };
}

/**
 * Build upcoming tax deadlines
 */
function buildDeadlines(profile, stateRules, stateCode) {
  const today = new Date();
  const year = today.getFullYear();

  const deadlines = [
    ...FEDERAL_QUARTERLY_DEADLINES.map(d => ({
      ...d,
      type: 'federal',
      category: 'Estimated Tax',
      severity: getSeverity(d.dueDate, today),
    })),
    {
      label: `Federal Annual Return (${year})`,
      dueDate: `${year + 1}-04-15`,
      type: 'federal',
      category: 'Annual Filing',
      period: `Jan 1 – Dec 31, ${year}`,
      severity: getSeverity(`${year + 1}-04-15`, today),
    },
    {
      label: 'W-2 / 1099 Distribution Deadline',
      dueDate: `${year + 1}-01-31`,
      type: 'federal',
      category: 'Payroll / Contractor',
      period: `Tax Year ${year}`,
      severity: getSeverity(`${year + 1}-01-31`, today),
    },
  ];

  if (stateRules && stateCode) {
    deadlines.push({
      label: `${stateRules.name} Annual Filing`,
      dueDate: `${year + 1}-04-15`,
      type: 'state',
      category: 'State Tax',
      period: stateRules.filingReminder,
      severity: getSeverity(`${year + 1}-04-15`, today),
    });

    if (stateRules.hasStateEstimatedTax) {
      stateRules.estimatedPaymentDue?.forEach(month => {
        const dueYear = month < today.getMonth() + 1 ? year + 1 : year;
        const dueDate = `${dueYear}-${String(month).padStart(2, '0')}-15`;
        deadlines.push({
          label: `${stateRules.name} Estimated Payment`,
          dueDate,
          type: 'state',
          category: 'Estimated Tax',
          period: `Month ${month}`,
          severity: getSeverity(dueDate, today),
        });
      });
    }
  }

  return deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

function getSeverity(dueDateStr, today) {
  const due = new Date(dueDateStr);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 14) return 'due_soon';
  if (diffDays <= 30) return 'upcoming';
  return 'future';
}

/**
 * Generate AI-style tax insights
 */
function generateInsights(profile, invoiceData, manualEntries, employeeData, netIncome) {
  const insights = [];

  if (!profile?.entity_type) {
    insights.push({ type: 'warning', title: 'Entity Type Not Set', message: 'Set your business entity type to unlock accurate tax estimates.', priority: 'high' });
  }

  const gross = safeNum(invoiceData.gross_revenue);
  const deductions = manualEntries.reduce((s, e) => s + safeNum(e.total), 0);

  if (gross > 0 && deductions === 0) {
    insights.push({ type: 'warning', title: 'No Expenses Recorded', message: 'You have revenue but no deductible expenses entered. Review your expenses — you may be overpaying estimated taxes.', priority: 'high' });
  }

  if (gross > 400 && !manualEntries.find(e => e.category === 'home_office')) {
    insights.push({ type: 'info', title: 'Possible Home Office Deduction', message: 'If you work from home exclusively for business, you may qualify for a home office deduction. Review recommended.', priority: 'medium' });
  }

  if (gross > 600 && !manualEntries.find(e => e.category === 'mileage')) {
    insights.push({ type: 'info', title: 'Vehicle / Mileage Deduction Available', message: 'Business driving may be deductible. Standard mileage rate is $0.67/mile (2024). Track your miles now.', priority: 'medium' });
  }

  if (safeNum(employeeData.employee_count) > 0 && !profile?.payroll_enabled) {
    insights.push({ type: 'warning', title: 'Payroll Tax Not Configured', message: 'You have employees but payroll tax is not enabled in your tax profile. Enable it to track employer payroll tax liabilities.', priority: 'high' });
  }

  if (netIncome > 1000 && !profile?.estimated_payments_enabled) {
    insights.push({ type: 'info', title: 'Consider Quarterly Estimated Payments', message: `With estimated net income of $${netIncome.toFixed(0)}, you may owe self-employment tax. Consider making quarterly estimated payments to avoid underpayment penalties.`, priority: 'medium' });
  }

  if (!profile?.primary_state) {
    insights.push({ type: 'warning', title: 'State Tax Not Configured', message: 'No primary business state selected. State income tax, sales tax, and filing deadlines cannot be calculated.', priority: 'high' });
  }

  if (gross > 100000 && !profile?.contractor_tracking) {
    insights.push({ type: 'info', title: 'Enable Contractor Tracking', message: 'For businesses with significant revenue, contractor payment tracking helps ensure 1099 compliance.', priority: 'low' });
  }

  return insights;
}

/**
 * Generate compliance alerts
 */
function generateAlerts(profile, invoiceData, employeeData, salesTaxCollected, salesTaxRemitted) {
  const alerts = [];

  if (!profile) {
    alerts.push({ severity: 'error', message: 'Tax profile not set up. Tax calculations unavailable.' });
    return alerts;
  }

  if (!profile.entity_type) {
    alerts.push({ severity: 'error', message: 'Business entity type is required for accurate tax estimation.' });
  }

  if (!profile.primary_state) {
    alerts.push({ severity: 'warning', message: 'No primary state selected. State tax obligations unknown.' });
  }

  if (!profile.legal_name) {
    alerts.push({ severity: 'warning', message: 'Legal business name not entered in tax profile.' });
  }

  if (safeNum(invoiceData.sales_tax_collected) > 0 && !profile.sales_tax_enabled) {
    alerts.push({ severity: 'error', message: 'Sales tax appears collected in invoices but Sales Tax is not enabled in your tax profile. Review immediately.' });
  }

  if (salesTaxCollected > salesTaxRemitted && profile.sales_tax_enabled) {
    const owed = salesTaxCollected - salesTaxRemitted;
    alerts.push({ severity: 'warning', message: `Estimated $${owed.toFixed(2)} in sales tax collected but not yet remitted.` });
  }

  if (safeNum(employeeData.employee_count) > 0 && !profile.payroll_enabled) {
    alerts.push({ severity: 'warning', message: 'Employee records found but payroll tax tracking is disabled.' });
  }

  return alerts;
}

// ── Contractor Service ───────────────────────────────────────────────────────

export async function getContractorSummary(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_contractor_records WHERE business_id = ? AND tax_year = ?`,
      [businessId, taxYear]
    );
    const threshold = 600;
    return rows.map(r => ({
      ...r,
      requires_1099: safeNum(r.total_paid) >= threshold,
      status: !r.w9_on_file ? 'missing_w9' : safeNum(r.total_paid) >= threshold ? 'needs_1099_review' : 'ok',
    }));
  } catch {
    return [];
  }
}

// ── Sales Tax Service ────────────────────────────────────────────────────────

export async function getSalesTaxSummary(businessId, taxYear) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tax_sales_summaries WHERE business_id = ? AND YEAR(period_start) = ?
       ORDER BY period_start`,
      [businessId, taxYear]
    );
    return rows;
  } catch {
    return [];
  }
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export async function logTaxAction(businessId, action, entityType, entityId, details, performedBy) {
  try {
    await pool.query(
      `INSERT INTO tax_audit_log (id, business_id, action, entity_type, entity_id, details, performed_by)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
      [businessId, action, entityType, entityId, JSON.stringify(details), performedBy]
    );
  } catch (err) {
    console.error('Tax audit log error:', err.message);
  }
}
