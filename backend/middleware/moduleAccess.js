import { getModuleById } from '../services/modulesService.js';

/**
 * requireModuleAccess
 *
 * Validates that:
 *   1. The module exists and belongs to req.user.businessId (prevents horizontal privilege escalation)
 *   2. The module is enabled for the current business
 *      — Admin/Manager bypass the enabled check so they can still manage disabled modules
 *        for field editing, but records on a disabled module are blocked for all roles.
 *
 * Attaches req.module for downstream route handlers.
 */
export async function requireModuleAccess(req, res, next) {
    const { moduleId } = req.params;
    const { businessId, role } = req.user;

    if (!moduleId) return res.status(400).json({ error: 'moduleId is required' });

    try {
        const mod = await getModuleById(moduleId, businessId);

        if (!mod) {
            // Return 404 — do not reveal whether the module exists in another business
            return res.status(404).json({ error: 'Module not found' });
        }

        if (!mod.enabled) {
            // Admins/Managers can still access fields on a disabled module (for managing it).
            // Nobody can access records on a disabled module.
            const isRecordOperation = req.path.includes('/records');
            const isPrivileged = ['Admin', 'Manager'].includes(role);

            if (isRecordOperation || !isPrivileged) {
                return res.status(403).json({ error: 'This module is currently disabled' });
            }
        }

        req.module = mod;
        next();
    } catch (err) {
        console.error('requireModuleAccess error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
