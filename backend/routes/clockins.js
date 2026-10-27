import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// GET all clock-in records
router.get("/", checkPermission('module:clockins:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM clockins ORDER BY clock_in_time DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Clock list error:", err.sqlMessage || err.message);
        res.status(500).json({ error: "Failed to fetch clock in records" });
    }
});

// CLOCK IN
router.post("/clockin", checkPermission('module:clockins:create'), async (req, res) => {
    try {
        const { employee_id, lat, lng } = req.body;
        const businessId = req.user.businessId;

        const [[active]] = await pool.query(
            "SELECT * FROM clockins WHERE employee_id = ? AND clock_out_time IS NULL",
            [employee_id]
        );

        if (active) {
            return res.status(400).json({ error: "Employee already clocked in" });
        }

        const now = new Date();
        const latitude  = lat  != null ? parseFloat(lat)  : null;
        const longitude = lng  != null ? parseFloat(lng)  : null;

        await pool.query(
            "INSERT INTO clockins (id, business_id, employee_id, clock_in_time, clock_in_lat, clock_in_lng) VALUES (UUID(), ?, ?, ?, ?, ?)",
            [businessId, employee_id, now, latitude, longitude]
        );

        res.json({ success: true, message: "Clock in recorded", clock_in_time: now, clock_in_lat: latitude, clock_in_lng: longitude });
    } catch (err) {
        console.error("Clock in error:", err.sqlMessage || err.message);
        res.status(500).json({ error: "Failed to clock in" });
    }
});

// CLOCK OUT
router.put("/clockout/:id", checkPermission('module:clockins:create'), async (req, res) => {
    try {
        const { id } = req.params;

        const [[record]] = await pool.query("SELECT * FROM clockins WHERE id = ?", [id]);

        if (!record) {
            return res.status(404).json({ error: "Clock entry not found" });
        }
        if (record.clock_out_time) {
            return res.status(400).json({ error: "Employee already clocked out" });
        }

        const now = new Date();
        let clockIn;
        if (record.clock_in_time instanceof Date) {
            clockIn = record.clock_in_time;
        } else if (typeof record.clock_in_time === "string") {
            clockIn = new Date(record.clock_in_time);
        } else {
            clockIn = new Date(record.clock_in_time.toString());
        }

        const diffMs = now - clockIn;
        const hours = diffMs / (1000 * 60 * 60);
        const hoursRounded = Math.round(hours * 100) / 100;

        await pool.query(
            "UPDATE clockins SET clock_out_time = ?, hours_worked = ? WHERE id = ?",
            [now, hoursRounded, id]
        );

        res.json({ success: true, message: "Clock out recorded", clock_out_time: now, hours_worked: hoursRounded });
    } catch (err) {
        console.error("Clock out error:", err.sqlMessage || err.message);
        res.status(500).json({ error: "Failed to clock out" });
    }
});

// EDIT clock entry (admin/manager timesheet correction)
router.put("/:id", checkPermission('module:clockins:create'), async (req, res) => {
    try {
        const { id } = req.params;
        const { clock_in_time, clock_out_time } = req.body;

        const [[record]] = await pool.query("SELECT * FROM clockins WHERE id = ?", [id]);
        if (!record) return res.status(404).json({ error: "Clock entry not found" });

        const clockIn  = new Date(clock_in_time);
        const clockOut = clock_out_time ? new Date(clock_out_time) : null;

        if (isNaN(clockIn)) return res.status(400).json({ error: "Invalid clock-in time" });
        if (clockOut && clockOut <= clockIn) return res.status(400).json({ error: "Clock-out must be after clock-in" });

        const hoursWorked = clockOut
            ? Math.round(((clockOut - clockIn) / (1000 * 60 * 60)) * 100) / 100
            : null;

        await pool.query(
            "UPDATE clockins SET clock_in_time = ?, clock_out_time = ?, hours_worked = ? WHERE id = ?",
            [clockIn, clockOut, hoursWorked, id]
        );

        res.json({ success: true, message: "Clock entry updated", hours_worked: hoursWorked });
    } catch (err) {
        console.error("Clock edit error:", err.sqlMessage || err.message);
        res.status(500).json({ error: "Failed to update clock entry" });
    }
});

// DELETE clock entry
router.delete("/:id", checkPermission('module:clockins:view'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM clockins WHERE id = ?", [id]);
        res.json({ success: true, message: "Clock entry deleted" });
    } catch (err) {
        console.error("Clock delete error:", err.sqlMessage || err.message);
        res.status(500).json({ error: "Failed to delete clock entry" });
    }
});

export default router;
