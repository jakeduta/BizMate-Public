/**
 * ddlBuilder.js — Safe Dynamic DDL for Custom Modules
 *
 * Security model:
 *  1. Field names: validated with strict regex + reserved-word blacklist
 *  2. Column types: mapped through FIELD_TYPE_MAP — no user strings reach SQL
 *  3. Table names: deterministic format cm_{8-char-biz-prefix}_{slug}, both parts sanitized
 *  4. All table creation in a transaction — module row + DDL are atomic
 *  5. custom_module_tables tracks every created table for CRUD branching
 *  6. Field additions: safe ALTER TABLE ADD COLUMN
 *  7. Field deletions: ALTER TABLE DROP COLUMN (with data-loss warning on frontend)
 *  8. Module deletion: DROP TABLE IF EXISTS before deleting module row
 */

import { pool } from '../db.js';

// ── Reserved Words ────────────────────────────────────────────────────────────
// Includes SQL reserved words AND our system column names.
const SQL_RESERVED = new Set([
    // SQL keywords
    'select','insert','update','delete','drop','create','table','index','from',
    'where','join','alter','add','column','primary','foreign','key','references',
    'constraint','unique','null','not','default','int','varchar','text','date',
    'boolean','decimal','char','order','group','by','having','limit','offset',
    'union','all','distinct','as','on','set','values','into','exists','like','in',
    'between','case','when','then','else','end','is','and','or','count','sum',
    'max','min','avg','read','write','view','show','use','database','schema',
    'trigger','procedure','function','event','if','else','while','for','return',
    // System columns in every DDL table — cannot be overridden by user
    'id','business_id','created_by','created_at','updated_at',
]);

// ── Field Type Map ────────────────────────────────────────────────────────────
// Maps field_type enum values to SQL column definitions.
// No raw user input ever reaches the SQL type string.
const FIELD_TYPE_MAP = {
    text:     'VARCHAR(500)',
    number:   'DECIMAL(15,4)',
    date:     'DATE',
    boolean:  'TINYINT(1) DEFAULT 0',
    select:   'VARCHAR(255)',
    email:    'VARCHAR(255)',
    phone:    'VARCHAR(50)',
    textarea: 'TEXT',
};

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * validateFieldName(name)
 * Throws if the field name is invalid or reserved.
 *
 * Valid: starts with [a-z], followed by [a-z0-9_], max 63 chars total.
 * This mirrors MySQL identifier constraints and prevents injection.
 */
export function validateFieldName(name) {
    if (typeof name !== 'string' || !name) {
        throw new Error(`Invalid field name: field name must be a non-empty string`);
    }
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) {
        throw new Error(
            `Invalid field name "${name}". Must start with a lowercase letter, ` +
            `contain only lowercase letters, numbers, and underscores, and be at most 63 characters.`
        );
    }
    if (SQL_RESERVED.has(name)) {
        throw new Error(`"${name}" is a reserved word and cannot be used as a field name`);
    }
}

/**
 * buildTableName(businessId, slug)
 * Returns a deterministic, safe table name: cm_{8-char-biz-prefix}_{slug}
 */
export function buildTableName(businessId, slug) {
    // Strip dashes from UUID, take first 8 chars
    const prefix = businessId.replace(/-/g, '').substring(0, 8).toLowerCase();
    // Sanitize slug: only lowercase alphanumeric and underscores, max 40 chars
    const safeSlug = slug.replace(/[^a-z0-9_]/g, '_').substring(0, 40);
    const tableName = `cm_${prefix}_${safeSlug}`;

    if (tableName.length > 100) {
        throw new Error(`Generated table name is too long: ${tableName}`);
    }

    return tableName;
}

// ── Table Creation ────────────────────────────────────────────────────────────

/**
 * createModuleTable(businessId, moduleId, slug, fields, conn)
 * Creates a real MySQL table for a custom module.
 * Must be called inside an existing transaction (conn.beginTransaction() already called).
 *
 * @param {string}   businessId - Business UUID
 * @param {string}   moduleId   - Module UUID (already inserted into modules table)
 * @param {string}   slug       - Module slug (sanitized)
 * @param {Array}    fields     - Array of { field_name, field_type, required } (may be empty)
 * @param {object}   conn       - MySQL connection (in transaction)
 * @returns {string} tableName  - The created table name
 */
export async function createModuleTable(businessId, moduleId, slug, fields, conn) {
    if (fields.length > 50) {
        throw new Error('Maximum 50 fields per module');
    }

    // Validate all field names before touching the DB
    for (const f of fields) {
        validateFieldName(f.field_name);
    }

    const tableName = buildTableName(businessId, slug);

    // Build column definitions from user-provided fields
    const userCols = fields.map(f => {
        const colType = FIELD_TYPE_MAP[f.field_type] ?? 'VARCHAR(500)';
        const notNull = f.required ? ' NOT NULL' : '';
        return `\`${f.field_name}\` ${colType}${notNull}`;
    });

    const colDefs = userCols.length > 0 ? userCols.join(',\n  ') + ',' : '';

    const ddl = `
        CREATE TABLE \`${tableName}\` (
            id           CHAR(36)  NOT NULL DEFAULT (UUID()),
            business_id  CHAR(36)  NOT NULL,
            created_by   CHAR(36)  NULL,
            ${colDefs}
            created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX idx_biz (business_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.query(ddl);

    // Register the table in the metadata tracker
    await conn.query(
        `INSERT INTO custom_module_tables (module_id, business_id, table_name) VALUES (?, ?, ?)`,
        [moduleId, businessId, tableName]
    );

    return tableName;
}

// ── Column Alteration ─────────────────────────────────────────────────────────

/**
 * addColumnToTable(tableName, fieldName, fieldType, required)
 * Adds a column to an existing DDL-backed module table.
 */
export async function addColumnToTable(tableName, fieldName, fieldType, required) {
    validateFieldName(fieldName);
    const colType = FIELD_TYPE_MAP[fieldType] ?? 'VARCHAR(500)';
    // NOT NULL requires a DEFAULT for existing rows — use empty string / 0
    const defaultVal = required ? (fieldType === 'number' ? ' DEFAULT 0' : " DEFAULT ''") : '';
    const notNull = required ? ' NOT NULL' : '';

    await pool.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${fieldName}\` ${colType}${notNull}${defaultVal}`
    );
}

/**
 * dropColumnFromTable(tableName, fieldName)
 * Drops a column from an existing DDL-backed module table.
 * WARNING: This permanently deletes all data in that column.
 */
export async function dropColumnFromTable(tableName, fieldName) {
    validateFieldName(fieldName);
    await pool.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${fieldName}\``);
}

// ── Metadata Lookup ───────────────────────────────────────────────────────────

/**
 * getModuleTableName(moduleId)
 * Returns the real table name for a DDL-backed module, or null for JSON-backed modules.
 */
export async function getModuleTableName(moduleId) {
    const [[row]] = await pool.query(
        `SELECT table_name FROM custom_module_tables WHERE module_id = ?`,
        [moduleId]
    );
    return row?.table_name ?? null;
}

/**
 * dropModuleTable(moduleId)
 * Drops the real table for a module if it exists.
 * Called by modulesService.deleteModule() before deleting the module row.
 */
export async function dropModuleTable(moduleId) {
    const tableName = await getModuleTableName(moduleId);
    if (!tableName) return;
    await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    // custom_module_tables row is cleaned up by FK cascade on module delete
}

// ── Core Module Table Map ──────────────────────────────────────────────────────
// Maps module slugs to their actual MySQL table names.
const CORE_TABLE_MAP = {
    customers:    'customers',
    employees:    'employees',
    clockins:     'clockins',
    appointments: 'appointments',
    invoices:     'invoices',
    payments:     'payments',
    services:     'business_services',
};

/**
 * getCoreTableName(slug)
 * Returns the real MySQL table name for a core module, or null if not data-backed.
 */
export function getCoreTableName(slug) {
    return CORE_TABLE_MAP[slug] ?? null;
}
