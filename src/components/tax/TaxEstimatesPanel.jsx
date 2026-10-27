import React from "react";
import { DollarSign, Info, TrendingUp, Calculator } from "lucide-react";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

const ENTITY_LABELS = {
  sole_prop:   "Sole Proprietorship",
  single_llc:  "Single-Member LLC",
  multi_llc:   "Multi-Member LLC",
  partnership: "Partnership",
  s_corp:      "S-Corporation",
  c_corp:      "C-Corporation",
  nonprofit:   "Nonprofit",
};

function EstimateRow({ label, value, sub, highlight, indent }) {
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? "pl-4" : ""} ${highlight ? "bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 -mx-3" : ""}`}>
      <div>
        <p className={`text-sm ${highlight ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className={`text-sm font-semibold ${highlight ? "text-indigo-600 dark:text-indigo-400 text-base" : "text-gray-800 dark:text-gray-200"}`}>{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 dark:border-gray-800 my-1" />;
}

export default function TaxEstimatesPanel({ data }) {
  if (!data) return null;

  const { federalEstimates, stateTaxEstimate, stateCode, stateRules, netIncome, payroll, revenue } = data;
  const entityLabel = ENTITY_LABELS[federalEstimates?.entityType] || "Not configured";

  const totalOwed = (federalEstimates?.totalFederalTax || 0) + (stateTaxEstimate || 0);
  const perQuarter = totalOwed / 4;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Estimate Summary</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{entityLabel} · Tax Year {data.taxYear}</p>
        </div>
      </div>

      <div className="p-5 space-y-0.5">

        {/* Income */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Income Summary</p>
        <EstimateRow label="Gross Revenue" value={fmt(revenue?.grossRevenue)} />
        <EstimateRow label="Less: Deductible Expenses" value={`-${fmt(data.expenses?.deductibleExpenses)}`} indent />
        <EstimateRow label="Estimated Wages (from clock-ins)" value={`-${fmt(payroll?.estimatedWages)}`} indent />
        <Divider />
        <EstimateRow label="Net Taxable Income" value={fmt(netIncome)} highlight />

        {/* Federal */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-5">Federal Tax Estimates</p>
        {['sole_prop', 'single_llc', 'multi_llc', 'partnership'].includes(federalEstimates?.entityType) && (
          <EstimateRow
            label="Self-Employment Tax (15.3%)"
            value={fmt(federalEstimates?.selfEmploymentTax)}
            sub="On 92.35% of net SE income"
          />
        )}
        <EstimateRow
          label="Federal Income Tax"
          value={fmt(federalEstimates?.federalIncomeTax)}
          sub={`Effective rate: ${federalEstimates?.effectiveRate || 0}%`}
        />
        <Divider />
        <EstimateRow label="Total Federal Tax Estimated" value={fmt(federalEstimates?.totalFederalTax)} highlight />

        {/* State */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-5">
          State Tax Estimates
        </p>
        {stateCode && stateRules ? (
          <>
            <EstimateRow
              label={`${stateRules.name} Income Tax`}
              value={fmt(stateTaxEstimate)}
              sub={stateRules.hasIncomeTax
                ? `Top rate: ${(stateRules.incomeTaxRate * 100).toFixed(2)}%`
                : "No state income tax"}
            />
            {stateRules.hasSalesTax && (
              <EstimateRow
                label="Sales Tax Rate (state base)"
                value={`${(stateRules.salesTaxRate * 100).toFixed(3)}%`}
                sub="Excludes local add-ons"
              />
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 py-2 text-sm text-amber-600 dark:text-amber-400">
            <Info className="w-4 h-4" />
            No primary state configured — state tax cannot be estimated
          </div>
        )}

        {/* Payroll */}
        {payroll?.employeeCount > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-5">Payroll Tax Estimates</p>
            <EstimateRow label="Estimated Wages" value={fmt(payroll?.estimatedWages)} />
            <EstimateRow
              label="Employer Payroll Tax (FICA)"
              value={fmt(payroll?.payrollTaxLiability)}
              sub="6.2% SS + 1.45% Medicare (employer share)"
            />
          </>
        )}

        {/* Sales Tax */}
        {revenue?.salesTaxCollected > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-5">Sales Tax Summary</p>
            <EstimateRow label="Sales Tax Collected" value={fmt(revenue?.salesTaxCollected)} />
            <EstimateRow label="Sales Tax Already Remitted" value={fmt(revenue?.salesTaxRemitted)} />
            <Divider />
            <EstimateRow
              label="Sales Tax Still Due"
              value={fmt(revenue?.salesTaxDue)}
              highlight
            />
          </>
        )}

        {/* Quarterly */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quarterly Estimated Payment</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{fmt(perQuarter)}</p>
            <p className="text-sm text-gray-500">/quarter</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on ~{fmt(totalOwed)} total estimated tax divided into 4 quarterly payments.
          </p>
        </div>

        <p className="text-xs text-gray-400 italic mt-4">
          {federalEstimates?.disclaimer || "All estimates are for informational purposes only. Consult a licensed CPA before filing."}
        </p>
      </div>
    </div>
  );
}
