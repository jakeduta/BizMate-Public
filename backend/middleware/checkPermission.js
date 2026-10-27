import { checkPermissionForUser } from '../services/permissionsService.js';

/**
 * checkPermission(permissionKey)
 *
 * Usage:
 *   router.get('/', authenticate, checkPermission('module:invoices:view'), handler)
 *
 * Must run AFTER `authenticate` — requires req.user = { userId, businessId, role }
 *
 * Admin always passes with no DB call.
 * All other roles query the role_permissions table.
 */
export function checkPermission(permissionKey) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin bypasses all permission checks
        if (req.user.role === 'Admin') return next();

        try {
            const granted = await checkPermissionForUser(
                req.user.businessId,
                req.user.role,
                permissionKey
            );

            if (!granted) {
                return res.status(403).json({
                    error: 'You do not have permission to perform this action',
                });
            }

            next();
        } catch (err) {
            console.error('checkPermission error:', err);
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
}
