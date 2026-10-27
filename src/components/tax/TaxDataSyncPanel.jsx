import React from "react";
import { RefreshCw, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

function SyncRow({ module, count, status, note }) {
  const statusConfig = {
    synced:        { icon: CheckCircle2, color: "text-emerald-500", label: "Synced" },
    partial:       { icon: AlertCircle,  color: "text-amber-500",   label: "Partial" },
    not_connected: { icon: XCircle,      color: "text-gray-400",    label: "Not Connected" },
  };
  const config = statusConfig[status] || statusConfig.not_connected;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{module}</p>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
      <div className="text-right">
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        {count !== null && count !== undefined && (
          <p className="text-xs text-gray-400">{count} record{count !== 1 ? "s" : ""}</p>
        )}
      </div>
    </div>
  );
}

export default function TaxDataSyncPanel({ data }) {
  if (!data) return null;

  const { revenue, payroll, invoiceCount } = data;

  const modules = [
    {
      module: "Invoices",
      count: invoiceCount || 0,
      status: invoiceCount > 0 ? "synced" : "not_connected",
      note: invoiceCount > 0
        ? `$${(revenue?.grossRevenue || 0).toFixed(2)} gross revenue pulled`
        : "No invoices found — create invoices to sync revenue",
    },
    {
      module: "Payments",
      count: null,
      status: (revenue?.collectedRevenue || 0) > 0 ? "synced" : "not_connected",
      note: `$${(revenue?.collectedRevenue || 0).toFixed(2)} collected revenue`,
    },
    {
      module: "Employees / Clock-ins",
      count: payroll?.employeeCount || 0,
      status: payroll?.employeeCount > 0 ? "synced" : "not_connected",
      note: payroll?.employeeCount > 0
        ? `${payroll.totalHours?.toFixed(1) || 0} total hours tracked`
        : "No employee records found",
    },
    {
      module: "Customers",
      count: null,
      status: "synced",
      note: "Customer state data available for nexus analysis",
    },
    {
      module: "Services",
      count: null,
      status: "synced",
      note: "Service categories available for sales tax classification",
    },
    {
      module: "Manual Tax Entries",
      count: Object.keys(data.expenses?.byCategory || {}).length,
      status: Object.keys(data.expenses?.byCategory || {}).length > 0 ? "synced" : "not_connected",
      note: `$${(data.expenses?.deductibleExpenses || 0).toFixed(2)} in recorded deductions`,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
          <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data Sync Status</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">BizMate module data pulled into tax calculations</p>
        </div>
      </div>

      <div className="px-5 py-3">
        {modules.map((m, i) => <SyncRow key={i} {...m} />)}
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs text-gray-400 italic">
          Data is read-only from other BizMate modules. Changes must be made in their respective tabs.
        </p>
      </div>
    </div>
  );
}
