import React from "react";
import { Lightbulb, AlertTriangle, Info, ChevronRight } from "lucide-react";

const ICON_MAP = {
  warning: AlertTriangle,
  info:    Info,
  tip:     Lightbulb,
};

const COLOR_MAP = {
  warning: {
    high:   "border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30",
    medium: "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30",
    low:    "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20",
  },
  info: {
    high:   "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30",
    medium: "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/20",
    low:    "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50",
  },
  tip: {
    high:   "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/30",
    medium: "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/20",
    low:    "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50",
  },
};

const ICON_COLOR_MAP = {
  warning: {
    high: "text-red-500", medium: "text-amber-500", low: "text-yellow-500",
  },
  info: {
    high: "text-blue-500", medium: "text-sky-500", low: "text-gray-400",
  },
  tip: {
    high: "text-purple-500", medium: "text-indigo-500", low: "text-gray-400",
  },
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function InsightCard({ insight }) {
  const type = insight.type || "info";
  const priority = insight.priority || "medium";
  const Icon = ICON_MAP[type] || Info;
  const borderBg = COLOR_MAP[type]?.[priority] || COLOR_MAP.info.medium;
  const iconColor = ICON_COLOR_MAP[type]?.[priority] || "text-gray-400";

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${borderBg}`}>
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{insight.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{insight.message}</p>
      </div>
      {priority === "high" && (
        <span className="shrink-0 text-xs font-bold text-red-600 dark:text-red-400 uppercase self-start bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
          Action
        </span>
      )}
    </div>
  );
}

export default function TaxInsightsPanel({ insights = [] }) {
  const sorted = [...insights].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
          <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Tax Insights</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Smart analysis of your tax data</p>
        </div>
        <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-medium">
          {sorted.length} insight{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="p-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No insights yet. Complete your tax profile to get started.</p>
          </div>
        ) : (
          sorted.map((insight, i) => <InsightCard key={i} insight={insight} />)
        )}
      </div>

      <div className="px-5 pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 italic border-t border-gray-100 dark:border-gray-800 pt-3">
          Insights are based on available data only. Always verify recommendations with a licensed CPA or tax professional before making financial decisions.
        </p>
      </div>
    </div>
  );
}
