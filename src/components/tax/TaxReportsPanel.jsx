import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { FileText, Download, FileSpreadsheet, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function ReportCard({ title, description, icon: Icon, onExportCSV, onExportPDF, generating }) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={generating}
              onClick={onExportCSV}
              className="flex items-center gap-1.5 text-xs"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={generating}
              onClick={onExportPDF}
              className="flex items-center gap-1.5 text-xs"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple CSV download utility
function downloadCSV(filename, rows, headers) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    }).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Simple PDF-like text download (PDF generation would require jsPDF integration)
function downloadTextReport(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TaxReportsPanel({ data, taxYear }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: fullReport, isLoading } = useQuery({
    queryKey: ["tax-report", taxYear],
    queryFn: () => Tax.getReport(taxYear),
    enabled: open,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ["tax-audit-log"],
    queryFn: () => Tax.getAuditLog(),
    select: (d) => Array.isArray(d) ? d : [],
    enabled: open,
  });

  const generate = async (reportFn) => {
    setGenerating(true);
    try {
      await reportFn();
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const exportPnL = () => generate(() => {
    if (!fullReport) return toast.error("Report data not loaded.");
    const d = fullReport.dashboard;
    const content = [
      `BIZMATE — PROFIT & LOSS SUMMARY`,
      `Tax Year: ${taxYear}`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `REVENUE`,
      `  Gross Revenue:        ${fmt(d.revenue?.grossRevenue)}`,
      `  Collected Revenue:    ${fmt(d.revenue?.collectedRevenue)}`,
      `  Sales Tax Collected:  ${fmt(d.revenue?.salesTaxCollected)}`,
      ``,
      `EXPENSES`,
      `  Deductible Expenses:  ${fmt(d.expenses?.deductibleExpenses)}`,
      `  Estimated Wages:      ${fmt(d.payroll?.estimatedWages)}`,
      ``,
      `NET INCOME`,
      `  Net Taxable Income:   ${fmt(d.netIncome)}`,
      ``,
      `TAX ESTIMATES`,
      `  Federal Income Tax:   ${fmt(d.federalEstimates?.federalIncomeTax)}`,
      `  Self-Employment Tax:  ${fmt(d.federalEstimates?.selfEmploymentTax)}`,
      `  Total Federal Tax:    ${fmt(d.federalEstimates?.totalFederalTax)}`,
      `  State Tax Est.:       ${fmt(d.stateTaxEstimate)}`,
      ``,
      `DISCLAIMER: This report is for informational purposes only.`,
      `Verify all figures with a licensed CPA or tax professional.`,
    ].join("\n");
    downloadTextReport(`PnL-${taxYear}.txt`, content);
    toast.success("P&L summary exported.");
  });

  const exportPnLCSV = () => generate(() => {
    if (!fullReport) return toast.error("Report data not loaded.");
    const d = fullReport.dashboard;
    const rows = [
      { Category: "Gross Revenue",       Amount: d.revenue?.grossRevenue || 0 },
      { Category: "Collected Revenue",   Amount: d.revenue?.collectedRevenue || 0 },
      { Category: "Sales Tax Collected", Amount: d.revenue?.salesTaxCollected || 0 },
      { Category: "Deductible Expenses", Amount: -(d.expenses?.deductibleExpenses || 0) },
      { Category: "Estimated Wages",     Amount: -(d.payroll?.estimatedWages || 0) },
      { Category: "Net Taxable Income",  Amount: d.netIncome || 0 },
    ];
    downloadCSV(`PnL-${taxYear}.csv`, rows, ["Category", "Amount"]);
    toast.success("P&L CSV exported.");
  });

  const exportExpenses = () => generate(() => {
    const entries = fullReport?.manualEntries || [];
    if (!entries.length) return toast.error("No expense entries to export.");
    downloadCSV(`Expenses-${taxYear}.csv`, entries, ["category", "description", "amount", "date", "is_deductible", "notes"]);
    toast.success("Expense report exported.");
  });

  const exportContractors = () => generate(() => {
    const contractors = fullReport?.contractors || [];
    if (!contractors.length) return toast.error("No contractor records to export.");
    downloadCSV(`Contractors-${taxYear}.csv`, contractors, ["contractor_name", "tin", "total_paid", "w9_on_file", "requires_1099", "notes"]);
    toast.success("Contractor report exported.");
  });

  const exportSalesTax = () => generate(() => {
    const summaries = fullReport?.salesSummaries || [];
    if (!summaries.length) return toast.error("No sales tax data to export.");
    downloadCSV(`SalesTax-${taxYear}.csv`, summaries, ["period_start", "period_end", "taxable_revenue", "non_taxable_revenue", "sales_tax_collected", "sales_tax_remitted", "state_code"]);
    toast.success("Sales tax report exported.");
  });

  const exportFullPackage = () => generate(() => {
    if (!fullReport) return toast.error("Report data not loaded.");
    const d = fullReport.dashboard;
    const content = [
      `====================================================`,
      `BIZMATE TAX PACKAGE — ${taxYear}`,
      `Generated: ${new Date().toLocaleString()}`,
      `====================================================`,
      ``,
      `BUSINESS PROFILE`,
      `  Entity Type: ${d.profile?.entity_type || "Not set"}`,
      `  Primary State: ${d.stateCode || "Not set"}`,
      `  Tax Year: ${taxYear}`,
      ``,
      `INCOME SUMMARY`,
      `  Gross Revenue:          ${fmt(d.revenue?.grossRevenue)}`,
      `  Deductible Expenses:    ${fmt(d.expenses?.deductibleExpenses)}`,
      `  Net Taxable Income:     ${fmt(d.netIncome)}`,
      ``,
      `FEDERAL TAX ESTIMATES`,
      `  Federal Income Tax:     ${fmt(d.federalEstimates?.federalIncomeTax)}`,
      `  Self-Employment Tax:    ${fmt(d.federalEstimates?.selfEmploymentTax)}`,
      `  Total Federal Owed:     ${fmt(d.federalEstimates?.totalFederalTax)}`,
      `  Quarterly Payment:      ${fmt(d.federalEstimates?.quarterlyPayment)}`,
      ``,
      `STATE TAX ESTIMATES`,
      `  State:                  ${d.stateCode || "N/A"}`,
      `  State Income Tax:       ${fmt(d.stateTaxEstimate)}`,
      ``,
      `PAYROLL`,
      `  Employees:              ${d.payroll?.employeeCount || 0}`,
      `  Total Hours:            ${(d.payroll?.totalHours || 0).toFixed(1)}`,
      `  Est. Wages:             ${fmt(d.payroll?.estimatedWages)}`,
      `  Employer FICA:          ${fmt(d.payroll?.payrollTaxLiability)}`,
      ``,
      `SALES TAX`,
      `  Tax Collected:          ${fmt(d.revenue?.salesTaxCollected)}`,
      `  Tax Remitted:           ${fmt(d.revenue?.salesTaxRemitted)}`,
      `  Tax Still Due:          ${fmt(d.revenue?.salesTaxDue)}`,
      ``,
      `TAX READINESS SCORE: ${d.readinessScore?.score || 0}/100 — ${d.readinessScore?.label || "N/A"}`,
      ``,
      `====================================================`,
      `DISCLAIMER`,
      `This tax package is generated by BizMate for preparation`,
      `and planning purposes ONLY. It does not constitute legal`,
      `or tax advice. All figures are estimates based on data`,
      `entered in BizMate. Verify all amounts with a licensed`,
      `CPA or tax attorney before filing any return.`,
      `====================================================`,
    ].join("\n");
    downloadTextReport(`TaxPackage-${taxYear}.txt`, content);
    toast.success("Full tax package exported.");
  });

  const reports = [
    {
      title: "Profit & Loss Summary",
      description: "Revenue, expenses, and net income overview",
      icon: FileText,
      onExportCSV: exportPnLCSV,
      onExportPDF: exportPnL,
    },
    {
      title: "Expense Category Report",
      description: "All manual deductions by category",
      icon: FileText,
      onExportCSV: exportExpenses,
      onExportPDF: exportExpenses,
    },
    {
      title: "Contractor / 1099 Summary",
      description: "Contractor payments and 1099 status",
      icon: FileText,
      onExportCSV: exportContractors,
      onExportPDF: exportContractors,
    },
    {
      title: "Sales Tax Report",
      description: "Period-by-period sales tax collections and remittances",
      icon: FileSpreadsheet,
      onExportCSV: exportSalesTax,
      onExportPDF: exportSalesTax,
    },
    {
      title: "Year-End Tax Package",
      description: "Complete tax summary suitable for your CPA",
      icon: FileText,
      onExportCSV: exportFullPackage,
      onExportPDF: exportFullPackage,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Reports &amp; Document Center</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Generate and export tax-ready reports</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-sm text-gray-500">Loading report data...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {reports.map((r, i) => (
                  <ReportCard key={i} {...r} generating={generating} />
                ))}
              </div>

              {/* Audit log */}
              {auditLog.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent Activity</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {auditLog.slice(0, 15).map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                        <span className="truncate">{log.action?.replace(/_/g, " ")}</span>
                        <span className="text-gray-400 shrink-0 ml-3">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 italic mt-4">
                All exports contain placeholder data where actual figures are unavailable. Exported files are for preparation purposes only — not official tax filings.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
