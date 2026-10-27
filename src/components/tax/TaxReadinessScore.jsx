import React from "react";
import { ShieldCheck, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const LABEL_CONFIG = {
  Ready:      { color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", ring: "border-emerald-500" },
  Good:       { color: "text-blue-600 dark:text-blue-400",       bar: "bg-blue-500",    ring: "border-blue-500"    },
  "Needs Work": { color: "text-amber-600 dark:text-amber-400",   bar: "bg-amber-500",   ring: "border-amber-500"   },
  Poor:       { color: "text-red-600 dark:text-red-400",         bar: "bg-red-500",     ring: "border-red-500"     },
  "Not Started": { color: "text-gray-500 dark:text-gray-400",   bar: "bg-gray-400",    ring: "border-gray-400"    },
};

export default function TaxReadinessScore({ readinessScore }) {
  const score = readinessScore?.score ?? 0;
  const label = readinessScore?.label ?? "Not Started";
  const issues = readinessScore?.issues ?? [];
  const config = LABEL_CONFIG[label] || LABEL_CONFIG["Not Started"];

  // Checklist items (pre-defined checks + dynamic issues)
  const baseChecklist = [
    { label: "Business entity type configured",  done: !issues.includes("Business entity type not set") },
    { label: "Primary state selected",           done: !issues.includes("Primary state not configured") },
    { label: "Legal business name entered",      done: !issues.includes("Legal business name missing") },
    { label: "Tax year selected",                done: !issues.includes("Tax year not selected") },
    { label: "Invoice / revenue data present",   done: !issues.includes("No invoice data synced") },
    { label: "Expense data entered",             done: !issues.includes("No expense data entered") },
    { label: "Tax features configured",          done: score >= 70 },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Readiness Score</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">How prepared are you for filing?</p>
        </div>
      </div>

      <div className="p-5">
        {/* Score ring */}
        <div className="flex items-center gap-6 mb-5">
          <div className={`relative w-24 h-24 rounded-full border-8 ${config.ring} flex items-center justify-center shrink-0`}>
            <div className="text-center">
              <p className={`text-2xl font-bold ${config.color}`}>{score}</p>
              <p className="text-xs text-gray-400">/ 100</p>
            </div>
          </div>
          <div>
            <p className={`text-xl font-bold ${config.color}`}>{label}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {score >= 85
                ? "Great job! Your tax profile is mostly complete."
                : score >= 65
                ? "Good progress. A few items still need attention."
                : score >= 40
                ? "Your tax profile needs more information before estimating."
                : "Start by setting up your tax profile above."}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-5">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${config.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Filing Readiness Checklist</p>
          {baseChecklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {item.done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />}
              <span className={`text-sm ${item.done ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {issues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Outstanding Items
            </p>
            <ul className="space-y-1">
              {issues.map((issue, i) => (
                <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
