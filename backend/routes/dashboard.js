import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// GET /api/dashboard
router.get("/", checkPermission('feature:analytics'), async (req, res) => {
    try {
        const [[payments]] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS totalPayments FROM payments
        `);

        const [[outstanding]] = await pool.query(`
            SELECT COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) AS outstandingBalance
            FROM invoices
            WHERE status IN ('sent', 'overdue')
        `);

        const [[overdue]] = await pool.query(`
            SELECT COUNT(*) AS overdueCount FROM invoices WHERE LOWER(status) = 'overdue'
        `);

        const [[customerCount]] = await pool.query(`
            SELECT COUNT(*) AS customers FROM customers
        `);

        res.json({
            totalPayments:      Number(payments.totalPayments),
            outstandingBalance: Number(outstanding.outstandingBalance),
            overdueInvoices:    overdue.overdueCount,
            customers:          customerCount.customers,
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: "Failed to load dashboard" });
    }
});

export default router;
