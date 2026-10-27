import express from "express";
import { checkPermission } from "../middleware/checkPermission.js";
import { parseIntent, generateSummary } from "../services/openaiService.js";
import { runAnalyticsQuery }             from "../services/analyticsService.js";

const router = express.Router();

// All routes require authenticate (applied at server.js) + feature:analytics permission.
// Admin always passes; Manager has this by default; Employee does not.

// POST /api/analytics/query
// Body: { question: string }
router.post("/query", checkPermission("feature:analytics"), async (req, res) => {
    const { question } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "A question is required." });
    }

    if (question.trim().length > 500) {
        return res.status(400).json({ error: "Question must be 500 characters or fewer." });
    }

    try {
        const parsed = await parseIntent(question.trim());
        const { intent, period, groupBy } = parsed;

        if (!intent) {
            return res.json({
                intent:    null,
                question,
                summary:   "I couldn't identify a matching analytics topic. Try asking about employee hours, labor costs, payroll, revenue, invoices, appointments, or staffing trends.",
                chartType: "none",
                data:      [],
                kpis:      [],
            });
        }

        const result  = await runAnalyticsQuery(intent, period, groupBy, req.user.businessId);
        const summary = await generateSummary(intent, result.data, question.trim());

        res.json({
            intent,
            question,
            period:  period ?? null,
            summary,
            ...result,
        });
    } catch (err) {
        console.error("Analytics query error:", err);
        res.status(500).json({ error: err?.message ?? "Failed to run analytics query. Please try again." });
    }
});

// GET /api/analytics/suggestions
// Returns example questions for the assistant UI
router.get("/suggestions", checkPermission("feature:analytics"), (_req, res) => {
    res.json({
        suggestions: [
            "Show employee hours for this week",
            "Which employees worked the most this month?",
            "Compare labor costs for the last 3 months",
            "Show payroll totals by pay period",
            "Give me a revenue overview for this month",
            "Break down invoices by status",
            "Generate a chart of weekly hours by employee",
            "Summarize staffing trends this year",
            "Show appointment summary this month",
            "How many customers do we have?",
            "Show monthly revenue trend for this year",
        ],
    });
});

export default router;
