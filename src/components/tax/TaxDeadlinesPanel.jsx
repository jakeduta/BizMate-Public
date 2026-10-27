import React from "react";
import { Calendar, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const SEVERITY_CONFIG = {
  overdue: {
    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    row: "border-l-4 border-l-red-500",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    label: "Overdue",
  },
  due_soon: {
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    row: "border-l-4 border-l-amber-500",
    icon: Clock,
    iconColor: "text-amber-500",
    label: "Due Soon",
  },
  upcoming: {
    badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    row: "border-l-4 border-l-blue-400",
    icon: Calendar,
    iconColor: "text-blue-400",
    label: "Upcoming",
  },
  future: {
    badge: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    row: "border-l-4 border-l-gray-300 dark:border-l-gray-700",
    icon: Calendar,
    iconColor: "text-gray-400",
    label: "Scheduled",
  },
};

const TYPE_COLORS = {
  federal: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  state:   "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
};

function DeadlineRow({ deadline }) {
  const sev = SEVERITY_CONFIG[deadline.severity] || SEVERITY_CONFIG.future;
  const Icon = sev.icon;
  const dueDate = new Date(deadline.dueDate);
  const today = new Date();
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 ${sev.row}`}>
      <Icon className={`w-4 h-4 shrink-0 ${sev.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{deadline.label}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[deadline.type] || TYPE_COLORS.federal}`}>
            {deadline.type?.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{deadline.period || deadline.category}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sev.badge}`}>
          {diffDays < 0 ? `${Math.abs(diffDays)}d overdue` :
           diffDays === 0 ? "Today" :
           diffDays <= 30 ? `${diffDays}d left` : sev.label}
        </span>
      </div>
    </div>
  );
}

export default function TaxDeadlinesPanel({ deadlines = [] }) {
  const visible = deadlines.slice(0, 8); // Show next 8

  const overdueCount = deadlines.filter(d => d.severity === "overdue").length;
  const dueSoonCount = deadlines.filter(d => d.severity === "due_soon").length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Deadline Center</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming federal & state obligations</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5 font-bold">
              {overdueCount} overdue
            </span>
          )}
          {dueSoonCount > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
              {dueSoonCount} due soon
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {visible.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming deadlines found.</p>
          </div>
        ) : (
          visible.map((d, i) => <DeadlineRow key={i} deadline={d} />)
        )}
      </div>

      <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
        <p className="text-xs text-gray-400 italic">
          Deadlines are estimates based on your state and entity configuration. Verify exact dates at IRS.gov and your state revenue department.
        </p>
      </div>
    </div>
  );
}
