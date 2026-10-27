import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { getExtraFieldNamesForModule } from "../services/modulesService.js";

const router = express.Router();

// GET all appointments
router.get("/", checkPermission('module:appointments:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT a.*, s.name AS service_name, s.price AS service_price
            FROM appointments a
            LEFT JOIN business_services s ON a.service_id = s.id
            ORDER BY a.date DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new appointment
router.post("/", checkPermission('module:appointments:create'), async (req, res) => {
    try {
        const { customer_id, title, date, start_time, end_time, status, notes, created_by, service_id } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'appointments');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const cols = ['customer_id', 'title', 'date', 'start_time', 'end_time', 'status', 'notes', 'created_by', 'service_id', ...extraPairs.map(p => p[0])];
        const vals = [customer_id, title, date, start_time, end_time, status, notes, created_by, service_id ?? null, ...extraPairs.map(p => p[1])];
        await pool.query(
            `INSERT INTO appointments (id, ${cols.map(c => `\`${c}\``).join(', ')}) VALUES (UUID(), ${cols.map(() => '?').join(', ')})`,
            vals
        );
        res.json({ success: true, message: "Appointment created successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update appointment
router.put("/:id", checkPermission('module:appointments:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, start_time, end_time, status, notes, service_id } = req.body;
        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'appointments');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const setParts = ['title=?', 'date=?', 'start_time=?', 'end_time=?', 'status=?', 'notes=?', 'service_id=?', ...extraPairs.map(p => `\`${p[0]}\`=?`)];
        const vals = [title, date, start_time, end_time, status, notes, service_id ?? null, ...extraPairs.map(p => p[1]), id];
        await pool.query(`UPDATE appointments SET ${setParts.join(', ')} WHERE id=?`, vals);
        res.json({ success: true, message: "Appointment updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE appointment
router.delete("/:id", checkPermission('module:appointments:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM appointments WHERE id=?", [id]);
        res.json({ success: true, message: "Appointment deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
