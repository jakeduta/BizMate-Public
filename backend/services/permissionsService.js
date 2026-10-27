import { pool } from '../db.js';

// ── Permission Registry ────────────────────────────────────────────────────────
// Single source of truth for every permission key in the system.
// Admin is ALWAYS granted all of these — no rows are stored for Admin.
export const ALL_PERMISSION_KEYS = [
    // Module view access (controls sidebar visibility)
    'module:dashboard:view',
    'module:invoices:view',
    'module:invoices:create',
    'module:invoices:edit',
    'module:invoices:delete',
    'module:payments:view',
    'module:payments:create',
    'module:payments:edit',
    'module:payments:delete',
    'module:employees:view',
    'module:employees:create',
    'module:employees:edit',
    'module:employees:delete',
    'module:clockins:view',
    'module:clockins:create',
    'module:appointments:view',
    'module:appointments:create',
    'module:appointments:edit',
    'module:appointments:delete',
    'module:customers:view',
    'module:customers:create',
    'module:customers:edit',
    'module:customers:delete',
    'module:services:view',
    'module:services:create',
    'module:services:edit',
    'module:services:delete',
    // Feature-level access
    'feature:analytics',           // Dashboard financial stats
    'feature:member_management',   // Members page
    'feature:workspace_customize', // Workspace/Add Tab
    'feature:settings',            // Settings page (data overview)
    'feature:export',              // Export data
];

// ── Role Defaults ──────────────────────────────────────────────────────────────

// Manager: nearly everything — missing employee:delete, member_management, services by default
const MANAGER_DEFAULTS = new Set(ALL_PERMISSION_KEYS.filter(k =>
    !['module:employees:delete', 'feature:member_management'].includes(k)
));

// Employee: operational only — no financial data, no admin features, no services by default
const EMPLOYEE_DEFAULTS = new Set([
    'module:dashboard:view',
    'module:invoices:view',
    'module:payments:view',
    'module:clockins:view',
    'module:clockins:create',
    'module:appointments:view',
    'module:appointments:create',
    'module:appointments:edit',
    'module:customers:view',
]);

// Customer: nothing — portal only
const CUSTOMER_DEFAULTS = new Set();

const ROLE_DEFAULTS = {
    Manager:  MANAGER_DEFAULTS,
    Employee: EMPLOYEE_DEFAULTS,
    Customer: CUSTOMER_DEFAULTS,
};

// ── Seed permissions for a new business ───────────────────────────────────────
// Called during business registration.
// Uses INSERT IGNORE so it is safe to call again on existing businesses.
export async function seedPermissionsForBusiness(businessId, conn = pool) {
    const rows = [];
    for (const [role, defaults] of Object.entries(ROLE_DEFAULTS)) {
        for (const key of ALL_PERMISSION_KEYS) {
            rows.push([businessId, role, key, defaults.has(key) ? 1 : 0]);
        }
    }
    if (!rows.length) return;

    await conn.query(
        `INSERT IGNORE INTO role_permissions (business_id, role, permission_key, granted)
         VALUES ?`,
        [rows]
    );
}

// ── Check single permission for a user ────────────────────────────────────────
// Returns true immediately for Admin (no DB call).
export async function checkPermissionForUser(businessId, role, permissionKey) {
    if (role === 'Admin') return true;

    const [[row]] = await pool.query(
        `SELECT granted FROM role_permissions
         WHERE business_id = ? AND role = ? AND permission_key = ?`,
        [businessId, role, permissionKey]
    );

    if (row !== undefined) return Boolean(row.granted);

    // No row found — business pre-dates permissions. Lazy-seed defaults then re-check.
    await seedPermissionsForBusiness(businessId);
    const [[seeded]] = await pool.query(
        `SELECT granted FROM role_permissions
         WHERE business_id = ? AND role = ? AND permission_key = ?`,
        [businessId, role, permissionKey]
    );
    return seeded ? Boolean(seeded.granted) : false;
}

// ── Fetch all permissions for a business ──────────────────────────────────────
// Lazily seeds if this business has no rows yet (handles pre-migration businesses).
export async function getPermissionsForBusiness(businessId) {
    const [rows] = await pool.query(
        `SELECT role, permission_key, granted FROM role_permissions
         WHERE business_id = ?
         ORDER BY role, permission_key`,
        [businessId]
    );

    if (rows.length === 0) {
        // Lazy seed for existing businesses that pre-date permissions
        await seedPermissionsForBusiness(businessId);
        const [seeded] = await pool.query(
            `SELECT role, permission_key, granted FROM role_permissions
             WHERE business_id = ?
             ORDER BY role, permission_key`,
            [businessId]
        );
        return seeded;
    }

    return rows;
}

// ── Update a single permission ─────────────────────────────────────────────────
export async function setPermission(businessId, role, permissionKey, granted) {
    if (role === 'Admin') {
        throw new Error('Admin permissions are immutable');
    }
    if (!['Manager', 'Employee', 'Customer'].includes(role)) {
        throw new Error(`Invalid role: ${role}`);
    }
    if (!ALL_PERMISSION_KEYS.includes(permissionKey)) {
        throw new Error(`Unknown permission key: ${permissionKey}`);
    }

    await pool.query(
        `UPDATE role_permissions SET granted = ?
         WHERE business_id = ? AND role = ? AND permission_key = ?`,
        [granted ? 1 : 0, businessId, role, permissionKey]
    );
}
