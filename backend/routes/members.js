import express from 'express';
import { pool } from '../db.js';
import { authorize } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

const ROLE_RANK = { Customer: 0, Employee: 1, Manager: 2, Admin: 3 };

// GET /api/members
router.get('/', checkPermission('feature:member_management'), authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const [members] = await pool.query(
            `SELECT u.id, u.email, u.full_name, ubr.role, ubr.joined_at, ubr.is_active
             FROM user_business_roles ubr
             JOIN users u ON u.id = ubr.user_id
             WHERE ubr.business_id = ?
             ORDER BY FIELD(ubr.role, 'Admin', 'Manager', 'Employee', 'Customer'), u.full_name ASC`,
            [req.user.businessId]
        );
        return res.json(members);
    } catch (err) {
        console.error('Members list error:', err);
        return res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// PUT /api/members/:userId/role
router.put('/:userId/role', checkPermission('feature:member_management'), authorize('Admin', 'Manager'), async (req, res) => {
    const { userId } = req.params;
    const { role }   = req.body;

    const validRoles = ['Admin', 'Manager', 'Employee', 'Customer'];
    if (!validRoles.includes(role)) {
        return res.status(422).json({ error: 'Invalid role' });
    }

    if (userId === req.user.userId) {
        return res.status(403).json({ error: "You can't change your own role" });
    }

    if (req.user.role === 'Manager' && ROLE_RANK[role] >= ROLE_RANK['Manager']) {
        return res.status(403).json({ error: 'Insufficient permissions to assign this role' });
    }

    try {
        const [[membership]] = await pool.query(
            'SELECT role FROM user_business_roles WHERE user_id = ? AND business_id = ?',
            [userId, req.user.businessId]
        );
        if (!membership) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (membership.role === 'Admin' && role !== 'Admin') {
            const [[{ count }]] = await pool.query(
                `SELECT COUNT(*) AS count FROM user_business_roles
                 WHERE business_id = ? AND role = 'Admin' AND is_active = TRUE`,
                [req.user.businessId]
            );
            if (count <= 1) {
                return res.status(403).json({ error: 'Cannot demote the last Admin' });
            }
        }

        await pool.query(
            'UPDATE user_business_roles SET role = ? WHERE user_id = ? AND business_id = ?',
            [role, userId, req.user.businessId]
        );

        return res.json({ message: 'Role updated' });
    } catch (err) {
        console.error('Role update error:', err);
        return res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE /api/members/:userId — Admin only
router.delete('/:userId', checkPermission('feature:member_management'), authorize('Admin'), async (req, res) => {
    const { userId } = req.params;

    if (userId === req.user.userId) {
        return res.status(403).json({ error: "You can't remove yourself" });
    }

    try {
        const [[membership]] = await pool.query(
            'SELECT role FROM user_business_roles WHERE user_id = ? AND business_id = ?',
            [userId, req.user.businessId]
        );
        if (!membership) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (membership.role === 'Admin') {
            const [[{ count }]] = await pool.query(
                `SELECT COUNT(*) AS count FROM user_business_roles
                 WHERE business_id = ? AND role = 'Admin' AND is_active = TRUE`,
                [req.user.businessId]
            );
            if (count <= 1) {
                return res.status(403).json({ error: 'Cannot remove the last Admin' });
            }
        }

        await pool.query(
            'DELETE FROM user_business_roles WHERE user_id = ? AND business_id = ?',
            [userId, req.user.businessId]
        );

        return res.json({ message: 'Member removed' });
    } catch (err) {
        console.error('Remove member error:', err);
        return res.status(500).json({ error: 'Failed to remove member' });
    }
});

export default router;
