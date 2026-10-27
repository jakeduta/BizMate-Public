import React from "react";
import { AlertTriangle, XCircle, Info, ShieldCheck } from "lucide-react";

const SEVERITY_CONFIG = {
  error: {
    bg: "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700",
    icon: XCircle,
    iconColor: "text-red-500",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    label: "Critical",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    label: "Warning",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    icon: Info,
    iconColor: "text-blue-500",
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    label: "Info",
  },
};

function AlertRow({ alert }) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
      </div>
      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${config.badge}`}>
        {config.label}
      </span>
    </div>
  );
}

export default function TaxAlertsPanel({ alerts = [] }) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  const criticalCount = alerts.filter(a => a.severity === "error").length;
  const warningCount  = alerts.filter(a => a.severity === "warning").length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className={`p-2 rounded-lg ${criticalCount > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}`}>
          <AlertTriangle className={`w-4 h-4 ${criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compliance Alerts</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Issues requiring your attention</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5 font-bold">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No compliance alerts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your tax setup looks complete.</p>
          </div>
        ) : (
          sorted.map((alert, i) => <AlertRow key={i} alert={alert} />)
        )}
      </div>
    </div>
  );
}
