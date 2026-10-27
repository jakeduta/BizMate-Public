import { randomUUID } from 'crypto';
import { pool } from '../db.js';
import * as ddl from './ddlBuilder.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const CORE_MODULES = [
    { name: 'Dashboard',    slug: 'dashboard',    icon: 'LayoutDashboard', order: 1 },
    { name: 'Invoices',     slug: 'invoices',     icon: 'FileText',        order: 2 },
    { name: 'Payments',     slug: 'payments',     icon: 'CreditCard',      order: 3 },
    { name: 'Employees',    slug: 'employees',    icon: 'Users',           order: 4 },
    { name: 'Clock-ins',    slug: 'clockins',     icon: 'Clock',           order: 5 },
    { name: 'Appointments', slug: 'appointments', icon: 'Calendar',        order: 6 },
    { name: 'Customers',    slug: 'customers',    icon: 'UserCircle',      order: 7 },
    { name: 'Services',     slug: 'services',     icon: 'Briefcase',       order: 9 },
    { name: 'Settings',     slug: 'settings',     icon: 'Settings',        order: 8 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

// Auto-seeds core module metadata for a business on first access.
// Uses INSERT IGNORE per-row so new core modules added to CORE_MODULES
// (like Services) are automatically added to existing businesses.
export async function ensureCoreModules(businessId) {
    for (const mod of CORE_MODULES) {
        await pool.query(
            `INSERT IGNORE INTO modules (business_id, name, slug, type, enabled, display_order, icon)
             VALUES (?, ?, ?, 'core', TRUE, ?, ?)`,
            [businessId, mod.name, mod.slug, mod.order, mod.icon]
        );
    }
}

// ── Module CRUD ───────────────────────────────────────────────────────────────
export async function getModulesForBusiness(businessId, { includeDisabled = false } = {}) {
    await ensureCoreModules(businessId);
    const whereEnabled = includeDisabled ? '' : 'AND m.enabled = TRUE';
    const [rows] = await pool.query(
        `SELECT m.*, (cmt.module_id IS NOT NULL) AS has_table
         FROM modules m
         LEFT JOIN custom_module_tables cmt ON cmt.module_id = m.id
         WHERE m.business_id = ? ${whereEnabled}
         ORDER BY m.display_order ASC`,
        [businessId]
    );
    return rows.map(r => ({ ...r, has_table: !!r.has_table }));
}

export async function getModuleById(moduleId, businessId) {
    const [[mod]] = await pool.query(
        `SELECT * FROM modules WHERE id = ? AND business_id = ?`,
        [moduleId, businessId]
    );
    return mod || null;
}

export async function getModuleBySlug(slug, businessId) {
    const [[mod]] = await pool.query(
        `SELECT * FROM modules WHERE slug = ? AND business_id = ?`,
        [slug, businessId]
    );
    return mod || null;
}

export async function createModule(businessId, name, icon = 'Layers') {
    if (!name?.trim()) throw new Error('Module name is required');

    const slug = generateSlug(name);
    if (!slug) throw new Error('Invalid module name');

    const [[existing]] = await pool.query(
        `SELECT id FROM modules WHERE business_id = ? AND slug = ?`,
        [businessId, slug]
    );
    if (existing) throw new Error(`A module named "${name}" already exists`);

    const [[{ max_order }]] = await pool.query(
        `SELECT COALESCE(MAX(display_order), 0) AS max_order FROM modules WHERE business_id = ?`,
        [businessId]
    );

    // All new custom modules get a real DDL table — use a transaction for atomicity
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `INSERT INTO modules (business_id, name, slug, type, enabled, display_order, icon)
             VALUES (?, ?, ?, 'custom', TRUE, ?, ?)`,
            [businessId, name.trim(), slug, max_order + 1, icon]
        );

        const [[newMod]] = await conn.query(
            `SELECT id FROM modules WHERE business_id = ? AND slug = ?`,
            [businessId, slug]
        );

        // Create the real table (empty — fields added later via FieldsEditor)
        await ddl.createModuleTable(businessId, newMod.id, slug, [], conn);

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }

    return getModuleBySlug(slug, businessId);
}

export async function updateModule(moduleId, businessId, updates) {
    const mod = await getModuleById(moduleId, businessId);
    if (!mod) throw new Error('Module not found');

    const allowed = ['name', 'enabled', 'icon'];
    const fields  = [];
    const values  = [];

    for (const key of allowed) {
        if (updates[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        }
    }

    // If renaming, regenerate slug (custom only — never rename core slugs)
    if (updates.name && mod.type === 'custom') {
        const newSlug = generateSlug(updates.name);
        const [[conflict]] = await pool.query(
            `SELECT id FROM modules WHERE business_id = ? AND slug = ? AND id != ?`,
            [businessId, newSlug, moduleId]
        );
        if (conflict) throw new Error('A module with that name already exists');
        fields.push('slug = ?');
        values.push(newSlug);
    }

    if (!fields.length) return mod;

    values.push(moduleId, businessId);
    await pool.query(
        `UPDATE modules SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`,
        values
    );

    return getModuleById(moduleId, businessId);
}

export async function reorderModules(businessId, orderings) {
    // orderings: [{ id, display_order }, ...]
    for (const { id, display_order } of orderings) {
        await pool.query(
            `UPDATE modules SET display_order = ? WHERE id = ? AND business_id = ?`,
            [display_order, id, businessId]
        );
    }
}

export async function deleteModule(moduleId, businessId) {
    const mod = await getModuleById(moduleId, businessId);
    if (!mod) throw new Error('Module not found');
    if (mod.type === 'core') throw new Error('Core modules cannot be deleted');

    // Drop the real DDL table if this module has one
    await ddl.dropModuleTable(moduleId);

    // Cascade deletes module_fields, module_records, and custom_module_tables via FK
    await pool.query(
        `DELETE FROM modules WHERE id = ? AND business_id = ?`,
        [moduleId, businessId]
    );
}

// ── Extra fields helper ───────────────────────────────────────────────────────

/**
 * getExtraFieldNamesForModule(businessId, slug)
 * Returns field names the business has added on top of a core module's built-in fields.
 * Used by core route handlers to include extra columns in INSERT/UPDATE.
 */
export async function getExtraFieldNamesForModule(businessId, slug) {
    const [[mod]] = await pool.query(
        `SELECT id FROM modules WHERE business_id = ? AND slug = ?`,
        [businessId, slug]
    );
    if (!mod) return [];
    const [fields] = await pool.query(
        `SELECT field_name FROM module_fields WHERE module_id = ?`,
        [mod.id]
    );
    return fields.map(f => f.field_name);
}

// ── Field CRUD ────────────────────────────────────────────────────────────────
export async function getFields(moduleId, businessId) {
    const [rows] = await pool.query(
        `SELECT * FROM module_fields WHERE module_id = ? AND business_id = ? ORDER BY display_order ASC`,
        [moduleId, businessId]
    );
    return rows;
}

export async function upsertField(moduleId, businessId, fieldData) {
    const { field_name, field_label, field_type, required, options, display_order, id } = fieldData;

    if (!field_name || !field_label || !field_type) {
        throw new Error('field_name, field_label, and field_type are required');
    }

    const safeFieldName = field_name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (id) {
        // Update existing field
        await pool.query(
            `UPDATE module_fields
             SET field_label = ?, field_type = ?, required = ?, options = ?, display_order = ?
             WHERE id = ? AND module_id = ? AND business_id = ?`,
            [field_label, field_type, required ?? false, options ? JSON.stringify(options) : null,
             display_order ?? 0, id, moduleId, businessId]
        );
        const [[updated]] = await pool.query(`SELECT * FROM module_fields WHERE id = ?`, [id]);
        return updated;
    }

    // Insert new field
    const [[conflict]] = await pool.query(
        `SELECT id FROM module_fields WHERE module_id = ? AND field_name = ?`,
        [moduleId, safeFieldName]
    );
    if (conflict) throw new Error(`Field "${field_name}" already exists in this module`);

    const [[{ max_order }]] = await pool.query(
        `SELECT COALESCE(MAX(display_order), 0) AS max_order FROM module_fields WHERE module_id = ?`,
        [moduleId]
    );

    await pool.query(
        `INSERT INTO module_fields (module_id, business_id, field_name, field_label, field_type, required, options, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [moduleId, businessId, safeFieldName, field_label, field_type,
         required ?? false, options ? JSON.stringify(options) : null,
         display_order ?? max_order + 1]
    );

    const [[created]] = await pool.query(
        `SELECT * FROM module_fields WHERE module_id = ? AND field_name = ?`,
        [moduleId, safeFieldName]
    );
    return created;
}

export async function deleteField(fieldId, moduleId, businessId) {
    const [[field]] = await pool.query(
        `SELECT id FROM module_fields WHERE id = ? AND module_id = ? AND business_id = ?`,
        [fieldId, moduleId, businessId]
    );
    if (!field) throw new Error('Field not found');
    await pool.query(`DELETE FROM module_fields WHERE id = ?`, [fieldId]);
}

// ── Record CRUD ───────────────────────────────────────────────────────────────
export async function validateRecordData(moduleId, businessId, data) {
    const fields = await getFields(moduleId, businessId);
    const errors = [];

    for (const field of fields) {
        const value = data[field.field_name];
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push(`"${field.field_label}" is required`);
        }
    }

    if (errors.length) throw new Error(errors.join(', '));

    // Strip unknown keys — only keep keys that are defined fields
    const allowedKeys = new Set(fields.map(f => f.field_name));
    const sanitized = {};
    for (const key of Object.keys(data)) {
        if (allowedKeys.has(key)) sanitized[key] = data[key];
    }

    return sanitized;
}

export async function getRecords(moduleId, businessId) {
    const tableName = await ddl.getModuleTableName(moduleId);

    if (tableName) {
        // Real DDL table path — return columns directly
        const [rows] = await pool.query(
            `SELECT * FROM \`${tableName}\` WHERE business_id = ? ORDER BY created_at DESC`,
            [businessId]
        );
        return rows;
    }

    // JSON blob fallback for pre-existing modules
    const [rows] = await pool.query(
        `SELECT * FROM module_records WHERE module_id = ? AND business_id = ? ORDER BY created_at DESC`,
        [moduleId, businessId]
    );
    return rows;
}

export async function createRecord(moduleId, businessId, userId, rawData) {
    const tableName = await ddl.getModuleTableName(moduleId);

    if (tableName) {
        // Real DDL table path — build a parameterized INSERT from field definitions
        const data = await validateRecordData(moduleId, businessId, rawData);
        const fields = await getFields(moduleId, businessId);
        const allowedNames = fields.map(f => f.field_name);
        const colsToInsert = Object.keys(data).filter(k => allowedNames.includes(k));

        const id = randomUUID();
        const columns = ['id', 'business_id', 'created_by', ...colsToInsert];
        const placeholders = columns.map(() => '?').join(', ');
        const values = [id, businessId, userId, ...colsToInsert.map(k => data[k])];

        await pool.query(
            `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
            values
        );

        const [[created]] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [id]);
        return created;
    }

    // JSON blob fallback
    const data = await validateRecordData(moduleId, businessId, rawData);
    await pool.query(
        `INSERT INTO module_records (module_id, business_id, data_json, created_by)
         VALUES (?, ?, ?, ?)`,
        [moduleId, businessId, JSON.stringify(data), userId]
    );
    const [rows] = await pool.query(
        `SELECT * FROM module_records WHERE module_id = ? AND business_id = ? ORDER BY created_at DESC LIMIT 1`,
        [moduleId, businessId]
    );
    return rows[0];
}

export async function updateRecord(recordId, moduleId, businessId, rawData) {
    const tableName = await ddl.getModuleTableName(moduleId);

    if (tableName) {
        // Real DDL table path
        const [[record]] = await pool.query(
            `SELECT id FROM \`${tableName}\` WHERE id = ? AND business_id = ?`,
            [recordId, businessId]
        );
        if (!record) throw new Error('Record not found');

        const data = await validateRecordData(moduleId, businessId, rawData);
        const fields = await getFields(moduleId, businessId);
        const allowedNames = new Set(fields.map(f => f.field_name));
        const colsToUpdate = Object.keys(data).filter(k => allowedNames.has(k));
        if (!colsToUpdate.length) return record;

        const setParts = colsToUpdate.map(k => `\`${k}\` = ?`).join(', ');
        const values   = [...colsToUpdate.map(k => data[k]), recordId, businessId];

        await pool.query(
            `UPDATE \`${tableName}\` SET ${setParts} WHERE id = ? AND business_id = ?`,
            values
        );

        const [[updated]] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [recordId]);
        return updated;
    }

    // JSON blob fallback
    const [[record]] = await pool.query(
        `SELECT id FROM module_records WHERE id = ? AND module_id = ? AND business_id = ?`,
        [recordId, moduleId, businessId]
    );
    if (!record) throw new Error('Record not found');

    const data = await validateRecordData(moduleId, businessId, rawData);
    await pool.query(
        `UPDATE module_records SET data_json = ? WHERE id = ? AND module_id = ? AND business_id = ?`,
        [JSON.stringify(data), recordId, moduleId, businessId]
    );
    const [[updated]] = await pool.query(`SELECT * FROM module_records WHERE id = ?`, [recordId]);
    return updated;
}

export async function deleteRecord(recordId, moduleId, businessId) {
    const tableName = await ddl.getModuleTableName(moduleId);

    if (tableName) {
        const [[record]] = await pool.query(
            `SELECT id FROM \`${tableName}\` WHERE id = ? AND business_id = ?`,
            [recordId, businessId]
        );
        if (!record) throw new Error('Record not found');
        await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ? AND business_id = ?`, [recordId, businessId]);
        return;
    }

    // JSON blob fallback
    const [[record]] = await pool.query(
        `SELECT id FROM module_records WHERE id = ? AND module_id = ? AND business_id = ?`,
        [recordId, moduleId, businessId]
    );
    if (!record) throw new Error('Record not found');
    await pool.query(`DELETE FROM module_records WHERE id = ?`, [recordId]);
}
