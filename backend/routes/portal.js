// Customer Portal Routes
// All routes use authenticateUser (no businessId required)
import express from 'express';
import { pool } from '../db.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateUser);

// GET /portal/businesses — list businesses the user is connected to
router.get('/businesses', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.id AS businessId, b.name AS businessName, b.business_code AS businessCode,
                    ubr.role, ubr.joined_at AS joinedAt
             FROM user_business_roles ubr
             JOIN businesses b ON b.id = ubr.business_id
             WHERE ubr.user_id = ? AND ubr.is_active = TRUE AND b.is_active = TRUE
             ORDER BY ubr.joined_at ASC`,
            [req.user.userId]
        );
        return res.json(rows);
    } catch (err) {
        console.error('Portal businesses error:', err);
        return res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// GET /portal/businesses/:businessId/invoices — customer's invoices at a business
router.get('/businesses/:businessId/invoices', async (req, res) => {
    try {
        const { businessId } = req.params;

        // Verify the user is a member of this business
        const [[membership]] = await pool.query(
            `SELECT id FROM user_business_roles
             WHERE user_id = ? AND business_id = ? AND is_active = TRUE`,
            [req.user.userId, businessId]
        );
        if (!membership) return res.status(403).json({ error: 'Access denied' });

        // Find invoices associated with this customer (by email match)
        const [[user]] = await pool.query(
            'SELECT email FROM users WHERE id = ?', [req.user.userId]
        );

        const [invoices] = await pool.query(
            `SELECT i.id, i.invoice_number, i.status, i.total_amount, i.due_date, i.created_at
             FROM invoices i
             JOIN customers c ON c.id = i.customer_id
             WHERE c.email = ? AND i.business_id = ?
             ORDER BY i.created_at DESC`,
            [user.email, businessId]
        );
        return res.json(invoices);
    } catch (err) {
        console.error('Portal invoices error:', err);
        return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// GET /portal/businesses/:businessId/appointments — customer's appointments
router.get('/businesses/:businessId/appointments', async (req, res) => {
    try {
        const { businessId } = req.params;

        const [[membership]] = await pool.query(
            `SELECT id FROM user_business_roles
             WHERE user_id = ? AND business_id = ? AND is_active = TRUE`,
            [req.user.userId, businessId]
        );
        if (!membership) return res.status(403).json({ error: 'Access denied' });

        const [[user]] = await pool.query(
            'SELECT email FROM users WHERE id = ?', [req.user.userId]
        );

        const [appointments] = await pool.query(
            `SELECT a.id, a.title, a.appointment_date, a.status, a.notes
             FROM appointments a
             JOIN customers c ON c.id = a.customer_id
             WHERE c.email = ? AND a.business_id = ?
             ORDER BY a.appointment_date DESC`,
            [user.email, businessId]
        );
        return res.json(appointments);
    } catch (err) {
        console.error('Portal appointments error:', err);
        return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

export default router;
