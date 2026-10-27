import express from 'express';
import { authorize } from '../middleware/auth.js';
import {
    getPermissionsForBusiness,
    setPermission,
    ALL_PERMISSION_KEYS,
} from '../services/permissionsService.js';

const router = express.Router();
// All routes sit behind `authenticate` (mounted as app.use('/api/permissions', ...))

// ── GET /api/permissions ───────────────────────────────────────────────────────
// Returns the full permission matrix for this business.
// Admin/Manager only — used by the Settings > Permissions tab.
router.get('/', authorize('Admin', 'Manager'), async (req, res) => {
    try {
        const permissions = await getPermissionsForBusiness(req.user.businessId);
        res.json({ permissions, allKeys: ALL_PERMISSION_KEYS });
    } catch (err) {
        console.error('Permissions fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/permissions/me ────────────────────────────────────────────────────
// Returns only the current user's granted permission keys.
// Used by the frontend PermissionsContext to populate hasPermission().
router.get('/me', async (req, res) => {
    try {
        // Admin gets everything
        if (req.user.role === 'Admin') {
            return res.json({ role: 'Admin', grantedKeys: ALL_PERMISSION_KEYS });
        }

        const all = await getPermissionsForBusiness(req.user.businessId);
        const grantedKeys = all
            .filter(p => p.role === req.user.role && p.granted)
            .map(p => p.permission_key);

        res.json({ role: req.user.role, grantedKeys });
    } catch (err) {
        console.error('Permissions/me error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── PUT /api/permissions ───────────────────────────────────────────────────────
// Toggle a single permission for a role.
// Body: { role: 'Manager'|'Employee'|'Customer', permissionKey: string, granted: boolean }
//
// Admin can edit Manager/Employee/Customer.
// Manager can only edit Employee/Customer.
router.put('/', authorize('Admin', 'Manager'), async (req, res) => {
    const { role, permissionKey, granted } = req.body;

    if (!role || permissionKey === undefined || granted === undefined) {
        return res.status(422).json({ error: 'role, permissionKey, and granted are required' });
    }

    if (role === 'Admin') {
        return res.status(403).json({ error: 'Admin permissions are immutable' });
    }

    // Managers cannot modify Manager-level permissions
    if (req.user.role === 'Manager' && role === 'Manager') {
        return res.status(403).json({ error: 'Managers cannot edit Manager permissions' });
    }

    try {
        await setPermission(req.user.businessId, role, permissionKey, Boolean(granted));
        res.json({ success: true });
    } catch (err) {
        const status = err.message.includes('Unknown') || err.message.includes('Invalid') ? 422 : 500;
        res.status(status).json({ error: err.message });
    }
});

export default router;
