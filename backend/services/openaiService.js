import OpenAI from "openai";

// Intent descriptions used for classification prompt
const INTENTS = [
    { id: "employee_hours_weekly",     desc: "Employee clock-in hours for the current or a recent week" },
    { id: "employee_hours_monthly",    desc: "Employee hours grouped by month or for a specific month" },
    { id: "top_workers",               desc: "Employees ranked by total hours worked in a period" },
    { id: "labor_costs",               desc: "Labor cost calculations (hours × hourly rate) by period or employee" },
    { id: "payroll_summary",           desc: "Payroll totals broken down by pay period or week" },
    { id: "revenue_overview",          desc: "Revenue totals from payments and invoices for a period" },
    { id: "invoice_status_breakdown",  desc: "Breakdown of invoices by status (paid, overdue, sent, draft)" },
    { id: "appointment_summary",       desc: "Appointment counts or revenue broken down by service" },
    { id: "staffing_trends",           desc: "Employee headcount and hours trends over time" },
    { id: "customer_metrics",          desc: "Customer count, new customers, or acquisition trends" },
    { id: "weekly_hours_chart",        desc: "Chart of hours broken down by week and employee" },
    { id: "monthly_revenue_trend",     desc: "Monthly revenue trend chart over the past year" },
];

/**
 * Keyword-based fallback for when the OpenAI API key is not configured.
 */
function fallbackParseIntent(question) {
    const q = question.toLowerCase();
    if (q.includes("payroll"))                                            return { intent: "payroll_summary",           period: "this_month", groupBy: "week" };
    if (q.includes("labor") || q.includes("cost"))                       return { intent: "labor_costs",               period: "this_month", groupBy: "employee" };
    if ((q.includes("week")) && (q.includes("hour") || q.includes("chart"))) return { intent: "weekly_hours_chart",    period: "this_month", groupBy: "week" };
    if (q.includes("hour") && q.includes("week"))                        return { intent: "employee_hours_weekly",     period: "this_week",  groupBy: "employee" };
    if (q.includes("hour") && q.includes("month"))                       return { intent: "employee_hours_monthly",    period: "this_month", groupBy: "employee" };
    if (q.includes("hour"))                                               return { intent: "employee_hours_weekly",     period: "this_week",  groupBy: "employee" };
    if (q.includes("top") || (q.includes("most") && q.includes("work"))) return { intent: "top_workers",              period: "this_month", groupBy: "employee" };
    if (q.includes("revenue") || q.includes("income") || q.includes("earn")) return { intent: "monthly_revenue_trend", period: "this_year", groupBy: "month" };
    if (q.includes("invoice"))                                            return { intent: "invoice_status_breakdown",  period: null,         groupBy: null };
    if (q.includes("appointment"))                                        return { intent: "appointment_summary",       period: "this_month", groupBy: "service" };
    if (q.includes("staff") || q.includes("trend") || q.includes("headcount")) return { intent: "staffing_trends",    period: "this_year",  groupBy: "month" };
    if (q.includes("customer"))                                           return { intent: "customer_metrics",          period: null,         groupBy: null };
    return { intent: "revenue_overview", period: "this_month", groupBy: null };
}

/**
 * Parse the user's natural-language question into a structured analytics intent.
 * Falls back to keyword matching if OPENAI_API_KEY is not set.
 */
export async function parseIntent(question) {
    if (!process.env.OPENAI_API_KEY) {
        return fallbackParseIntent(question);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are an analytics intent classifier for a business management system.

Given a user question, identify which analytics intent it matches and extract relevant filters.

Available intents:
${INTENTS.map(i => `- ${i.id}: ${i.desc}`).join("\n")}

User question: "${question}"

Respond with JSON only (no markdown, no explanation):
{
  "intent": "<intent_id or null if no match>",
  "period": "<this_week|last_week|this_month|last_month|last_3_months|last_6_months|this_year|null>",
  "groupBy": "<day|week|month|employee|service|null>"
}`;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You output only pure JSON. Never return text outside the JSON object." },
                { role: "user",   content: prompt },
            ],
            temperature: 0,
            max_tokens: 150,
            response_format: { type: "json_object" },
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        console.error("OpenAI parseIntent error:", err.message);
        return fallbackParseIntent(question);
    }
}

/**
 * Generate a short business insight summary for the analytics result.
 * Returns a plain-text fallback summary if OPENAI_API_KEY is not set or the call fails.
 */
export async function generateSummary(intent, data, question) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return "No data found for the selected period. Make sure clock-in records, invoices, or appointments exist for this time range.";
    }

    if (!process.env.OPENAI_API_KEY) {
        return `Showing results for: "${question}". Review the data below for details.`;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Only send aggregated data — never raw personal details beyond names and numbers
    const dataStr = JSON.stringify(data).slice(0, 2000);

    const prompt = `You are a business analytics assistant for a small business management platform.

A manager asked: "${question}"

Here is the aggregated result data:
${dataStr}

Write a concise 2–3 sentence insight summary. Be specific with numbers if available. Highlight notable patterns, top performers, or trends. Do not mention JSON, technical terms, or database details. Keep the tone professional and direct.`;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 180,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error("OpenAI generateSummary error:", err.message);
        return `Results loaded for: "${question}". Review the chart and data below.`;
    }
}
