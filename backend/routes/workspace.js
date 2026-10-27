import express from 'express';
import { authorize } from '../middleware/auth.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { requireModuleAccess } from '../middleware/moduleAccess.js';
import * as svc from '../services/modulesService.js';
import * as ddl from '../services/ddlBuilder.js';

const router = express.Router();
// All workspace routes already sit behind `authenticate` (mounted as app.use('/api/workspace', ...))

const canManage = [checkPermission('feature:workspace_customize'), authorize('Admin', 'Manager')];

// ── Module listing ────────────────────────────────────────────────────────────

// GET /api/workspace/modules
// Returns enabled modules for the sidebar (all roles)
router.get('/modules', async (req, res) => {
    try {
        const modules = await svc.getModulesForBusiness(req.user.businessId, { includeDisabled: false });
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/workspace/modules/all
// Returns ALL modules including disabled — Admin/Manager only (for customize page)
router.get('/modules/all', ...canManage, async (req, res) => {
    try {
        const modules = await svc.getModulesForBusiness(req.user.businessId, { includeDisabled: true });
        res.json(modules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Module management ─────────────────────────────────────────────────────────

// POST /api/workspace/modules
router.post('/modules', ...canManage, async (req, res) => {
    try {
        const { name, icon } = req.body;
        if (!name?.trim()) return res.status(422).json({ error: 'Module name is required' });

        const mod = await svc.createModule(req.user.businessId, name, icon);
        res.status(201).json(mod);
    } catch (err) {
        const status = err.message.includes('already exists') ? 409
                     : err.message.includes('reserved')       ? 422
                     : err.message.includes('Invalid')        ? 422
                     : 500;
        res.status(status).json({ error: err.message });
    }
});

// PUT /api/workspace/modules/reorder  (must be before /:moduleId)
router.put('/modules/reorder', ...canManage, async (req, res) => {
    try {
        const { orderings } = req.body; // [{ id, display_order }]
        if (!Array.isArray(orderings)) return res.status(422).json({ error: 'orderings must be an array' });
        await svc.reorderModules(req.user.businessId, orderings);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/workspace/modules/:moduleId
router.put('/modules/:moduleId', ...canManage, async (req, res) => {
    try {
        const updated = await svc.updateModule(req.params.moduleId, req.user.businessId, req.body);
        if (!updated) return res.status(404).json({ error: 'Module not found' });
        res.json(updated);
    } catch (err) {
        const status = err.message.includes('already exists') ? 409 : 500;
        res.status(status).json({ error: err.message });
    }
});

// DELETE /api/workspace/modules/:moduleId
router.delete('/modules/:moduleId', ...canManage, async (req, res) => {
    try {
        await svc.deleteModule(req.params.moduleId, req.user.businessId);
        res.json({ success: true });
    } catch (err) {
        const status = err.message.includes('Core modules') ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
});

// ── Field management ──────────────────────────────────────────────────────────

// GET /api/workspace/modules/:moduleId/fields
router.get('/modules/:moduleId/fields', requireModuleAccess, async (req, res) => {
    try {
        const fields = await svc.getFields(req.params.moduleId, req.user.businessId);
        res.json(fields);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/workspace/modules/:moduleId/fields  (add or update a field)
router.post('/modules/:moduleId/fields', ...canManage, requireModuleAccess, async (req, res) => {
    try {
        const isNew = !req.body.id;
        const field = await svc.upsertField(req.params.moduleId, req.user.businessId, req.body);

        // If module has a real table (custom DDL or core), ALTER TABLE to add the column
        if (isNew) {
            let tableName = await ddl.getModuleTableName(req.params.moduleId);
            if (!tableName && req.module?.type === 'core') {
                tableName = ddl.getCoreTableName(req.module.slug);
            }
            if (tableName) {
                await ddl.addColumnToTable(tableName, field.field_name, field.field_type, field.required);
            }
        }

        res.status(201).json(field);
    } catch (err) {
        const status = err.message.includes('already exists') ? 409
                     : err.message.includes('reserved')       ? 422
                     : err.message.includes('Invalid field')  ? 422
                     : 422;
        res.status(status).json({ error: err.message });
    }
});

// DELETE /api/workspace/modules/:moduleId/fields/:fieldId
router.delete('/modules/:moduleId/fields/:fieldId', ...canManage, requireModuleAccess, async (req, res) => {
    try {
        // Get field info before deleting (need field_name for DDL)
        const fields = await svc.getFields(req.params.moduleId, req.user.businessId);
        const field = fields.find(f => f.id === req.params.fieldId);

        await svc.deleteField(req.params.fieldId, req.params.moduleId, req.user.businessId);

        // If module has a real table (custom DDL or core), DROP the column
        if (field) {
            let tableName = await ddl.getModuleTableName(req.params.moduleId);
            if (!tableName && req.module?.type === 'core') {
                tableName = ddl.getCoreTableName(req.module.slug);
            }
            if (tableName) {
                await ddl.dropColumnFromTable(tableName, field.field_name);
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Record CRUD ───────────────────────────────────────────────────────────────

// GET /api/workspace/modules/:moduleId/records
router.get('/modules/:moduleId/records', requireModuleAccess, async (req, res) => {
    try {
        const records = await svc.getRecords(req.params.moduleId, req.user.businessId);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/workspace/modules/:moduleId/records
router.post('/modules/:moduleId/records', requireModuleAccess, async (req, res) => {
    try {
        const record = await svc.createRecord(
            req.params.moduleId,
            req.user.businessId,
            req.user.userId,
            req.body
        );
        res.status(201).json(record);
    } catch (err) {
        res.status(422).json({ error: err.message });
    }
});

// PUT /api/workspace/modules/:moduleId/records/:recordId
router.put('/modules/:moduleId/records/:recordId', requireModuleAccess, async (req, res) => {
    try {
        const record = await svc.updateRecord(
            req.params.recordId,
            req.params.moduleId,
            req.user.businessId,
            req.body
        );
        res.json(record);
    } catch (err) {
        const status = err.message.includes('not found') ? 404 : 422;
        res.status(status).json({ error: err.message });
    }
});

// DELETE /api/workspace/modules/:moduleId/records/:recordId
router.delete('/modules/:moduleId/records/:recordId', requireModuleAccess, async (req, res) => {
    try {
        await svc.deleteRecord(req.params.recordId, req.params.moduleId, req.user.businessId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
