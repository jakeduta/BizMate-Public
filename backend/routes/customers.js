import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { getExtraFieldNamesForModule } from "../services/modulesService.js";

const router = express.Router();

// GET all customers
router.get("/", checkPermission('module:customers:view'), async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM customers ORDER BY created_date DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to load customers" });
    }
});

// POST new customer
router.post("/", checkPermission('module:customers:create'), async (req, res) => {
    try {
        const { name, email, phone, company, created_by } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'customers');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const cols = ['name', 'email', 'phone', 'company', 'created_by', ...extraPairs.map(p => p[0])];
        const vals = [name, email, phone, company, created_by, ...extraPairs.map(p => p[1])];
        await pool.query(
            `INSERT INTO customers (id, ${cols.map(c => `\`${c}\``).join(', ')}) VALUES (UUID(), ${cols.map(() => '?').join(', ')})`,
            vals
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to create customer" });
    }
});

// PUT update customer
router.put("/:id", checkPermission('module:customers:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, company } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'customers');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const setParts = ['name=?', 'email=?', 'phone=?', 'company=?', ...extraPairs.map(p => `\`${p[0]}\`=?`)];
        const vals = [name, email, phone, company, ...extraPairs.map(p => p[1]), id];
        await pool.query(`UPDATE customers SET ${setParts.join(', ')} WHERE id=?`, vals);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update customer" });
    }
});

// DELETE customer
router.delete("/:id", checkPermission('module:customers:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM customers WHERE id=?", [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete customer" });
    }
});

export default router;
