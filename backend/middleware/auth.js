import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

// ── authenticate ──────────────────────────────────────────────────────────────
// Full business-scoped auth. Requires a valid JWT with businessId.
// Attaches req.user = { userId, businessId, role }
export async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7);
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'bizmate' });
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!payload.businessId) {
        return res.status(403).json({ error: 'No business context. Please select a workspace.' });
    }

    // Re-derive role from DB — never trust the JWT role for authorization.
    const [[membership]] = await pool.query(
        `SELECT ubr.role, ubr.is_active AS membership_active, u.is_active AS user_active
         FROM user_business_roles ubr
         JOIN users u ON u.id = ubr.user_id
         WHERE ubr.user_id = ? AND ubr.business_id = ?`,
        [payload.userId, payload.businessId]
    );

    if (!membership || !membership.user_active || !membership.membership_active) {
        return res.status(403).json({ error: 'Access denied' });
    }

    req.user = {
        userId:     payload.userId,
        businessId: payload.businessId,
        role:       membership.role,
    };

    next();
}

// ── authenticateUser ──────────────────────────────────────────────────────────
// User-only auth — no business context required. Used for portal routes.
// Attaches req.user = { userId }
export async function authenticateUser(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7);
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'bizmate' });
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const [[user]] = await pool.query(
        'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
        [payload.userId]
    );

    if (!user) return res.status(403).json({ error: 'Access denied' });

    req.user = { userId: payload.userId };
    next();
}

// ── authorize ─────────────────────────────────────────────────────────────────
// Usage: router.delete('/...', authenticate, authorize('Admin', 'Manager'), handler)
export function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
