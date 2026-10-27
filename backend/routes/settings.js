import express from "express";
import { pool } from "../db.js";
import { authorize } from "../middleware/auth.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// GET /api/settings/stats — data overview counts
router.get("/stats", checkPermission('feature:settings'), async (req, res) => {
    try {
        const [[customers]]    = await pool.query("SELECT COUNT(*) AS count FROM customers");
        const [[invoices]]     = await pool.query("SELECT COUNT(*) AS count FROM invoices");
        const [[payments]]     = await pool.query("SELECT COUNT(*) AS count FROM payments");
        const [[employees]]    = await pool.query("SELECT COUNT(*) AS count FROM employees");
        const [[clockIns]]     = await pool.query("SELECT COUNT(*) AS count FROM clockins");
        const [[appointments]] = await pool.query("SELECT COUNT(*) AS count FROM appointments");

        res.json({
            customers:    customers.count,
            invoices:     invoices.count,
            payments:     payments.count,
            employees:    employees.count,
            clockIns:     clockIns.count,
            appointments: appointments.count,
        });
    } catch (err) {
        console.error("Settings stats error:", err);
        res.status(500).json({ error: "Failed to load stats" });
    }
});

// GET /api/settings/export — export all data as JSON
router.get("/export", checkPermission('feature:export'), async (req, res) => {
    try {
        const tables = ["customers", "invoices", "payments", "employees", "clockins", "appointments"];
        const result = {};

        for (const table of tables) {
            const [rows] = await pool.query(`SELECT * FROM ${table}`);
            result[table] = rows;
        }

        result.exportDate = new Date().toISOString();
        res.json(result);
    } catch (err) {
        console.error("Export error:", err);
        res.status(500).json({ error: "Failed to export data" });
    }
});

// GET /api/settings/business-info — Admin/Manager only, returns business name + code
router.get("/business-info", authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const [[business]] = await pool.query(
            "SELECT name, business_code FROM businesses WHERE id = ?",
            [req.user.businessId]
        );
        if (!business) return res.status(404).json({ error: "Business not found" });
        res.json({ name: business.name, businessCode: business.business_code });
    } catch (err) {
        console.error("Business info error:", err);
        res.status(500).json({ error: "Failed to load business info" });
    }
});

// DELETE /api/settings/reset — Admin only, wipes all data
router.delete("/reset", authorize('Admin'), async (req, res) => {
    try {
        await pool.query("SET FOREIGN_KEY_CHECKS = 0");

        const tables = ["payments", "invoices", "customers", "employees", "clockins", "appointments"];
        for (const table of tables) {
            await pool.query(`TRUNCATE TABLE ${table}`);
        }

        await pool.query("SET FOREIGN_KEY_CHECKS = 1");
        res.json({ success: true, message: "All data has been cleared" });
    } catch (err) {
        console.error("Reset error:", err);
        res.status(500).json({ error: "Failed to reset data" });
    }
});

export default router;
