import React from "react";
import {
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts";

const COLORS = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
    "#f59e0b", "#ef4444", "#ec4899", "#3b82f6",
];

function shortLabel(label, maxLen = 12) {
    if (!label) return "";
    const s = String(label);
    return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function BarResult({ data, dataKeys }) {
    if (!data?.length) return <EmptyState />;
    const keys = dataKeys?.length ? dataKeys : Object.keys(data[0]).filter(k => k !== "name");

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={v => shortLabel(v)}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip
                    contentStyle={{
                        background: "#1e1b4b",
                        border: "1px solid #4f46e5",
                        borderRadius: "8px",
                        color: "#e0e7ff",
                        fontSize: 12,
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {keys.map((key, i) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        fill={COLORS[i % COLORS.length]}
                        radius={[4, 4, 0, 0]}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

function LineResult({ data, dataKeys }) {
    if (!data?.length) return <EmptyState />;
    const keys = dataKeys?.length ? dataKeys : Object.keys(data[0]).filter(k => k !== "name");

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={v => shortLabel(v)}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip
                    contentStyle={{
                        background: "#1e1b4b",
                        border: "1px solid #4f46e5",
                        borderRadius: "8px",
                        color: "#e0e7ff",
                        fontSize: 12,
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {keys.map((key, i) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}

const PIE_RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * PIE_RADIAN);
    const y = cy + radius * Math.sin(-midAngle * PIE_RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

function PieResult({ data }) {
    if (!data?.length) return <EmptyState />;
    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    labelLine={false}
                    label={PieLabel}
                >
                    {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        background: "#1e1b4b",
                        border: "1px solid #4f46e5",
                        borderRadius: "8px",
                        color: "#e0e7ff",
                        fontSize: 12,
                    }}
                    formatter={(value, name, props) => [
                        `${value} invoice${value !== 1 ? "s" : ""}${props.payload.amount != null ? ` ($${props.payload.amount.toFixed(2)})` : ""}`,
                        name,
                    ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function EmptyState() {
    return (
        <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm">
            No chart data available for this period.
        </div>
    );
}

export default function AnalyticsChart({ chartType, data, dataKeys }) {
    if (!chartType || chartType === "none" || chartType === "kpi") return null;
    if (!data?.length) return <EmptyState />;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
                Chart
            </p>
            {chartType === "bar"  && <BarResult  data={data} dataKeys={dataKeys} />}
            {chartType === "line" && <LineResult data={data} dataKeys={dataKeys} />}
            {chartType === "pie"  && <PieResult  data={data} />}
        </div>
    );
}
