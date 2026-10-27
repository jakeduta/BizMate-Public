import express from 'express';
import { pool } from '../db.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { getExtraFieldNamesForModule } from '../services/modulesService.js';

const router = express.Router();
// All routes sit behind `authenticate` (mounted as app.use('/api/services', ...))

// ── GET /api/services ──────────────────────────────────────────────────────────
router.get('/', checkPermission('module:services:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM business_services
             WHERE business_id = ? AND is_active = TRUE
             ORDER BY category ASC, name ASC`,
            [req.user.businessId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Services list error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/services/all (includes inactive — for management view) ────────────
router.get('/all', checkPermission('module:services:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM business_services WHERE business_id = ? ORDER BY category ASC, name ASC`,
            [req.user.businessId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Services all error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/services ─────────────────────────────────────────────────────────
router.post('/', checkPermission('module:services:create'), async (req, res) => {
    try {
        const { name, description, category, duration_minutes, price } = req.body;

        if (!name?.trim()) {
            return res.status(422).json({ error: 'Service name is required' });
        }

        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'services');
        const extraPairs = extraNames.filter(f => req.body[f] !== undefined).map(f => [f, req.body[f]]);

        const cols = ['business_id', 'name', 'description', 'category', 'duration_minutes', 'price', ...extraPairs.map(p => p[0])];
        const vals = [req.user.businessId, name.trim(), description ?? null, category ?? null, duration_minutes ?? null, price ?? null, ...extraPairs.map(p => p[1])];
        await pool.query(
            `INSERT INTO business_services (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
            vals
        );

        const [rows] = await pool.query(
            `SELECT * FROM business_services
             WHERE business_id = ? ORDER BY created_at DESC LIMIT 1`,
            [req.user.businessId]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Service create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/services/:id ──────────────────────────────────────────────────────
router.put('/:id', checkPermission('module:services:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, duration_minutes, price, is_active } = req.body;

        if (name !== undefined && !name?.trim()) {
            return res.status(422).json({ error: 'Service name cannot be empty' });
        }

        // Verify ownership
        const [[svc]] = await pool.query(
            'SELECT id FROM business_services WHERE id = ? AND business_id = ?',
            [id, req.user.businessId]
        );
        if (!svc) return res.status(404).json({ error: 'Service not found' });

        const updates = [];
        const values  = [];

        if (name       !== undefined) { updates.push('name = ?');             values.push(name.trim()); }
        if (description !== undefined) { updates.push('description = ?');     values.push(description); }
        if (category   !== undefined) { updates.push('category = ?');         values.push(category); }
        if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); values.push(duration_minutes); }
        if (price      !== undefined) { updates.push('price = ?');            values.push(price); }
        if (is_active  !== undefined) { updates.push('is_active = ?');        values.push(is_active ? 1 : 0); }

        const extraNames = await getExtraFieldNamesForModule(req.user.businessId, 'services');
        for (const f of extraNames) {
            if (req.body[f] !== undefined) { updates.push(`\`${f}\` = ?`); values.push(req.body[f]); }
        }

        if (!updates.length) return res.json({ message: 'No changes' });

        values.push(id, req.user.businessId);
        await pool.query(
            `UPDATE business_services SET ${updates.join(', ')} WHERE id = ? AND business_id = ?`,
            values
        );

        const [[updated]] = await pool.query('SELECT * FROM business_services WHERE id = ?', [id]);
        res.json(updated);
    } catch (err) {
        console.error('Service update error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/services/:id ───────────────────────────────────────────────────
// Soft-delete by default (sets is_active=false). Pass ?hard=true for permanent delete.
router.delete('/:id', checkPermission('module:services:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const hard = req.query.hard === 'true';

        const [[svc]] = await pool.query(
            'SELECT id FROM business_services WHERE id = ? AND business_id = ?',
            [id, req.user.businessId]
        );
        if (!svc) return res.status(404).json({ error: 'Service not found' });

        if (hard) {
            await pool.query('DELETE FROM business_services WHERE id = ? AND business_id = ?', [id, req.user.businessId]);
        } else {
            await pool.query('UPDATE business_services SET is_active = FALSE WHERE id = ? AND business_id = ?', [id, req.user.businessId]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Service delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
