import React from "react";

export default function KpiCard({ label, value, unit }) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {value}
                {unit && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                        {unit}
                    </span>
                )}
            </p>
        </div>
    );
}
