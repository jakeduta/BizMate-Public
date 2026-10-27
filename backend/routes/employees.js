import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { getExtraFieldNamesForModule } from "../services/modulesService.js";

const router = express.Router();

// GET all employees
router.get("/", checkPermission('module:employees:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT * FROM employees ORDER BY created_date DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new employee
router.post("/", checkPermission('module:employees:create'), async (req, res) => {
    try {
        const { name, role, hourly_rate, email, phone, active, created_by } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'employees');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const cols = ['name', 'role', 'hourly_rate', 'email', 'phone', 'active', 'created_by', ...extraPairs.map(p => p[0])];
        const vals = [name, role, hourly_rate, email, phone, active ?? true, created_by, ...extraPairs.map(p => p[1])];
        await pool.query(
            `INSERT INTO employees (id, ${cols.map(c => `\`${c}\``).join(', ')}) VALUES (UUID(), ${cols.map(() => '?').join(', ')})`,
            vals
        );
        res.json({ success: true, message: "Employee added successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update employee
router.put("/:id", checkPermission('module:employees:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, hourly_rate, email, phone, active } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'employees');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const setParts = ['name=?', 'role=?', 'hourly_rate=?', 'email=?', 'phone=?', 'active=?', ...extraPairs.map(p => `\`${p[0]}\`=?`)];
        const vals = [name, role, hourly_rate, email, phone, active, ...extraPairs.map(p => p[1]), id];
        await pool.query(`UPDATE employees SET ${setParts.join(', ')} WHERE id=?`, vals);
        res.json({ success: true, message: "Employee updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE employee
router.delete("/:id", checkPermission('module:employees:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM employees WHERE id = ?", [id]);
        res.json({ success: true, message: "Employee deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
