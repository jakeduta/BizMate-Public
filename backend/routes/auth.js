import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db.js';
import { body, query, validationResult } from 'express-validator';
import { seedPermissionsForBusiness } from '../services/permissionsService.js';

const router = express.Router();

const SALT_ROUNDS    = 12;
const ACCESS_TTL     = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Helpers ───────────────────────────────────────────────────────────────────
function signAccessToken(userId, businessId, role) {
    return jwt.sign(
        { userId, businessId: businessId ?? null, role: role ?? null },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TTL, issuer: 'bizmate' }
    );
}

function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

async function issueRefreshToken(userId, businessId, res) {
    const raw     = crypto.randomBytes(64).toString('hex');
    const expires = new Date(Date.now() + REFRESH_TTL_MS);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, business_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
        [userId, businessId ?? null, hashToken(raw), expires]
    );

    res.cookie('refreshToken', raw, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge:   REFRESH_TTL_MS,
        path:     '/auth/refresh',
    });
}

function generateBusinessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BM-';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

async function getUniqueBusinessCode() {
    for (let i = 0; i < 10; i++) {
        const code = generateBusinessCode();
        const [[existing]] = await pool.query(
            'SELECT id FROM businesses WHERE business_code = ?', [code]
        );
        if (!existing) return code;
    }
    throw new Error('Could not generate unique business code');
}

// ── POST /auth/register ───────────────────────────────────────────────────────
// type='business' → creates new business + user as Admin
// type='customer' → creates user only (no business)
router.post(
    '/register',
    [
        body('type').isIn(['business', 'customer']).withMessage('Type must be business or customer'),
        body('email').isEmail().normalizeEmail(),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/).withMessage('Password must contain at least one number'),
        body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
        body('businessName')
            .if(body('type').equals('business'))
            .trim().isLength({ min: 2 }).withMessage('Business name is required for business accounts'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        try {
            const { type, email, password, fullName, businessName } = req.body;

            // Check if email already taken
            const [[existing]] = await pool.query(
                'SELECT id FROM users WHERE email = ?', [email]
            );
            if (existing) {
                return res.status(409).json({ error: 'An account with this email already exists' });
            }

            const hash = await bcrypt.hash(password, SALT_ROUNDS);

            await pool.query(
                `INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)`,
                [email, hash, fullName]
            );
            const [[newUser]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            const userId = newUser.id;

            if (type === 'business') {
                const businessCode = await getUniqueBusinessCode();

                await pool.query(
                    `INSERT INTO businesses (name, business_code, owner_id) VALUES (?, ?, ?)`,
                    [businessName, businessCode, userId]
                );
                const [[business]] = await pool.query(
                    'SELECT id FROM businesses WHERE business_code = ?', [businessCode]
                );

                await pool.query(
                    `INSERT INTO user_business_roles (user_id, business_id, role) VALUES (?, ?, 'Admin')`,
                    [userId, business.id]
                );

                // Seed default permissions for Manager / Employee / Customer
                await seedPermissionsForBusiness(business.id);

                return res.status(201).json({
                    message:      'Business account created',
                    businessCode,
                    businessName,
                });
            } else {
                // Customer — no business association
                return res.status(201).json({ message: 'Account created' });
            }
        } catch (err) {
            console.error('Register error:', err);
            return res.status(500).json({ error: 'Registration failed' });
        }
    }
);

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Email + password only. Returns memberships for frontend routing.
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        try {
            const { email, password } = req.body;

            const [[user]] = await pool.query(
                'SELECT id, password, is_active FROM users WHERE email = ?',
                [email]
            );

            // Always run bcrypt to prevent timing-based email enumeration
            const dummyHash = '$2a$12$dummyhashusedtopreventimenumerationaaaaaa';
            const hashToCompare = user ? user.password : dummyHash;
            const passwordMatch = await bcrypt.compare(password, hashToCompare);

            if (!user || !passwordMatch || !user.is_active) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Get all memberships
            const [memberships] = await pool.query(
                `SELECT b.id AS businessId, b.name AS businessName, b.business_code AS businessCode,
                        ubr.role
                 FROM user_business_roles ubr
                 JOIN businesses b ON b.id = ubr.business_id
                 WHERE ubr.user_id = ? AND ubr.is_active = TRUE AND b.is_active = TRUE
                 ORDER BY ubr.joined_at ASC`,
                [user.id]
            );

            // Auto-select business context
            let businessId = null;
            let role       = null;

            if (memberships.length === 1) {
                businessId = memberships[0].businessId;
                role       = memberships[0].role;
            } else if (memberships.length > 1) {
                // Multiple — issue token for first, let frontend show selector
                businessId = memberships[0].businessId;
                role       = memberships[0].role;
            }
            // If 0 memberships: portal user, businessId stays null

            const accessToken = signAccessToken(user.id, businessId, role);
            await issueRefreshToken(user.id, businessId, res);

            return res.json({
                accessToken,
                user: {
                    id:         user.id,
                    businessId,
                    role,
                },
                memberships,
            });
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Login failed' });
        }
    }
);

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    const raw = req.cookies?.refreshToken;
    if (!raw) return res.status(401).json({ error: 'No refresh token' });

    try {
        const tokenHash = hashToken(raw);

        // Find the refresh token
        const [[stored]] = await pool.query(
            `SELECT rt.id, rt.user_id, rt.business_id
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = ?
               AND rt.revoked = FALSE
               AND rt.expires_at > NOW()
               AND u.is_active = TRUE`,
            [tokenHash]
        );

        if (!stored) {
            res.clearCookie('refreshToken', { path: '/auth/refresh' });
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // If this token has a businessId, verify the membership is still active
        let role = null;
        if (stored.business_id) {
            const [[membership]] = await pool.query(
                `SELECT ubr.role FROM user_business_roles ubr
                 WHERE ubr.user_id = ? AND ubr.business_id = ? AND ubr.is_active = TRUE`,
                [stored.user_id, stored.business_id]
            );
            if (!membership) {
                res.clearCookie('refreshToken', { path: '/auth/refresh' });
                return res.status(401).json({ error: 'Membership no longer active' });
            }
            role = membership.role;
        }

        // Token rotation
        await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?', [stored.id]);

        const accessToken = signAccessToken(stored.user_id, stored.business_id, role);
        await issueRefreshToken(stored.user_id, stored.business_id, res);

        return res.json({ accessToken });
    } catch (err) {
        console.error('Refresh error:', err);
        return res.status(500).json({ error: 'Token refresh failed' });
    }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
    try {
        const raw = req.cookies?.refreshToken;
        if (raw) {
            await pool.query(
                'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?',
                [hashToken(raw)]
            );
        }
        res.clearCookie('refreshToken', { path: '/auth/refresh' });
        return res.json({ message: 'Logged out' });
    } catch (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
    }
});

// ── POST /auth/switch-business ────────────────────────────────────────────────
router.post('/switch-business', async (req, res) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    let payload;
    try {
        payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'bizmate' });
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const { targetBusinessId } = req.body;

        const [[membership]] = await pool.query(
            `SELECT ubr.role FROM user_business_roles ubr
             JOIN businesses b ON b.id = ubr.business_id
             WHERE ubr.user_id = ? AND ubr.business_id = ?
               AND ubr.is_active = TRUE AND b.is_active = TRUE`,
            [payload.userId, targetBusinessId]
        );

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of that business' });
        }

        // Revoke old refresh token if present
        const raw = req.cookies?.refreshToken;
        if (raw) {
            await pool.query(
                'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?',
                [hashToken(raw)]
            );
        }

        const accessToken = signAccessToken(payload.userId, targetBusinessId, membership.role);
        await issueRefreshToken(payload.userId, targetBusinessId, res);

        return res.json({ accessToken });
    } catch (err) {
        console.error('Switch business error:', err);
        return res.status(500).json({ error: 'Business switch failed' });
    }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    let payload;
    try {
        payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'bizmate' });
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const [[user]] = await pool.query(
            'SELECT id, email, full_name, created_at FROM users WHERE id = ? AND is_active = TRUE',
            [payload.userId]
        );
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [memberships] = await pool.query(
            `SELECT b.id AS businessId, b.name AS businessName, b.business_code AS businessCode, ubr.role
             FROM user_business_roles ubr
             JOIN businesses b ON b.id = ubr.business_id
             WHERE ubr.user_id = ? AND ubr.is_active = TRUE AND b.is_active = TRUE
             ORDER BY ubr.joined_at ASC`,
            [payload.userId]
        );

        return res.json({ ...user, memberships });
    } catch (err) {
        console.error('Me error:', err);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ── GET /auth/businesses/search ───────────────────────────────────────────────
// Public search by name or business code
router.get(
    '/businesses/search',
    [query('q').trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        try {
            const q = req.query.q.toUpperCase();
            const [businesses] = await pool.query(
                `SELECT id AS businessId, name AS businessName, business_code AS businessCode
                 FROM businesses
                 WHERE is_active = TRUE
                   AND (UPPER(name) LIKE ? OR business_code LIKE ?)
                 LIMIT 10`,
                [`%${q}%`, `%${q}%`]
            );
            return res.json(businesses);
        } catch (err) {
            console.error('Search error:', err);
            return res.status(500).json({ error: 'Search failed' });
        }
    }
);

// ── POST /auth/businesses/join ────────────────────────────────────────────────
// Authenticated user joins a business by code
router.post(
    '/businesses/join',
    [body('businessCode').trim().notEmpty().withMessage('Business code is required')],
    async (req, res) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

        let payload;
        try {
            payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'bizmate' });
        } catch {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        try {
            const { businessCode } = req.body;

            const [[business]] = await pool.query(
                'SELECT id, name, business_code FROM businesses WHERE business_code = ? AND is_active = TRUE',
                [businessCode.toUpperCase()]
            );
            if (!business) {
                return res.status(404).json({ error: 'Business not found. Check the code and try again.' });
            }

            const [[alreadyMember]] = await pool.query(
                'SELECT id FROM user_business_roles WHERE user_id = ? AND business_id = ?',
                [payload.userId, business.id]
            );
            if (alreadyMember) {
                return res.status(409).json({ error: 'You are already connected to this business' });
            }

            await pool.query(
                `INSERT INTO user_business_roles (user_id, business_id, role) VALUES (?, ?, 'Customer')`,
                [payload.userId, business.id]
            );

            return res.status(201).json({
                message:      'Joined successfully',
                businessId:   business.id,
                businessName: business.name,
                businessCode: business.business_code,
            });
        } catch (err) {
            console.error('Join error:', err);
            return res.status(500).json({ error: 'Failed to join business' });
        }
    }
);

export default router;
