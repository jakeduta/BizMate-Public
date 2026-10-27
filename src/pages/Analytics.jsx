import React, { useState, useEffect, useRef } from "react";
import { useNavigate }                         from "react-router-dom";
import { Sparkles, Send, Loader2, RotateCcw, TrendingUp } from "lucide-react";
import { useAuth }        from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { Analytics as AnalyticsAPI } from "@/api/dbClient";
import KpiCard            from "@/components/analytics/KpiCard";
import AnalyticsChart     from "@/components/analytics/AnalyticsChart";

const ALLOWED_ROLES = ["Admin", "Manager"];

// ── Data table ────────────────────────────────────────────────────────────────

function DataTable({ tableData }) {
    if (!tableData?.length) return null;
    const columns = Object.keys(tableData[0]);

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-5 pt-4 pb-2">
                Detail Table
            </p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className="px-5 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, i) => (
                            <tr
                                key={i}
                                className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                                {columns.map(col => (
                                    <td key={col} className="px-5 py-2.5 text-gray-800 dark:text-gray-200">
                                        {row[col] ?? "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── AI summary card ───────────────────────────────────────────────────────────

function SummaryCard({ summary, question }) {
    return (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-5">
            <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
                        AI Insight
                    </p>
                    {question && (
                        <p className="text-xs text-indigo-400 dark:text-indigo-500 mb-2 italic">
                            "{question}"
                        </p>
                    )}
                    <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
                        {summary}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Suggestion chip ───────────────────────────────────────────────────────────

function SuggestionChip({ text, onClick }) {
    return (
        <button
            onClick={() => onClick(text)}
            className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors text-left"
        >
            {text}
        </button>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
    const { user }          = useAuth();
    const { hasPermission } = usePermissions();
    const navigate          = useNavigate();

    const [question,    setQuestion]    = useState("");
    const [loading,     setLoading]     = useState(false);
    const [result,      setResult]      = useState(null);
    const [error,       setError]       = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const inputRef = useRef(null);

    // Access guard — checked on both frontend and backend
    const hasAccess = user && ALLOWED_ROLES.includes(user.role) && hasPermission("feature:analytics");

    useEffect(() => {
        if (!hasAccess) return;
        AnalyticsAPI.suggestions()
            .then(d => setSuggestions(d.suggestions ?? []))
            .catch(() => {});
    }, [hasAccess]);

    if (!hasAccess) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-screen">
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Access Denied
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This page is only available to Admins and Managers.
                </p>
                <button
                    onClick={() => navigate("/Dashboard")}
                    className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    async function handleSubmit(q) {
        const trimmed = (q ?? question).trim();
        if (!trimmed) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setQuestion(trimmed);

        try {
            const data = await AnalyticsAPI.query(trimmed);
            setResult(data);
        } catch (err) {
            setError(err?.response?.data?.error ?? "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleReset() {
        setResult(null);
        setError(null);
        setQuestion("");
        inputRef.current?.focus();
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }

    const hasResult = result && result.intent;

    return (
        <div className="p-8 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Analytics Assistant
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ask questions about your business in plain English
                    </p>
                </div>
                {hasResult && (
                    <button
                        onClick={handleReset}
                        title="Start over"
                        className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        New query
                    </button>
                )}
            </div>

            {/* Input */}
            <div className="flex gap-3 mb-8">
                <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your business data…"
                    maxLength={500}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 transition-shadow disabled:opacity-60"
                />
                <button
                    onClick={() => handleSubmit()}
                    disabled={loading || !question.trim()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    Analyze
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing your business data…</p>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Suggestions (shown on initial state) */}
            {!loading && !result && !error && suggestions.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                        Try asking…
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, i) => (
                            <SuggestionChip
                                key={i}
                                text={s}
                                onClick={q => { setQuestion(q); handleSubmit(q); }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {!loading && result && (
                <div className="flex flex-col gap-5">
                    {/* No intent matched */}
                    {!result.intent && result.summary && (
                        <SummaryCard summary={result.summary} question={null} />
                    )}

                    {/* Normal results */}
                    {result.intent && (
                        <>
                            {/* AI summary */}
                            {result.summary && (
                                <SummaryCard summary={result.summary} question={result.question} />
                            )}

                            {/* KPI cards */}
                            {result.kpis?.length > 0 && (
                                <div className={`grid gap-4 ${
                                    result.kpis.length === 1 ? "grid-cols-1" :
                                    result.kpis.length === 2 ? "grid-cols-2" :
                                    result.kpis.length <= 4 ? "grid-cols-2 sm:grid-cols-4" :
                                    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                                }`}>
                                    {result.kpis.map((kpi, i) => (
                                        <KpiCard
                                            key={i}
                                            label={kpi.label}
                                            value={kpi.value}
                                            unit={kpi.unit}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Chart */}
                            {result.chartType !== "none" && result.chartType !== "kpi" && result.data?.length > 0 && (
                                <AnalyticsChart
                                    chartType={result.chartType}
                                    data={result.data}
                                    dataKeys={result.dataKeys}
                                />
                            )}

                            {/* Detail table */}
                            {result.tableData?.length > 0 && (
                                <DataTable tableData={result.tableData} />
                            )}

                            {/* Empty data notice */}
                            {result.chartType !== "kpi" && !result.data?.length && !result.tableData?.length && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        No data found for this period. Try a different time range or make sure records exist.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
