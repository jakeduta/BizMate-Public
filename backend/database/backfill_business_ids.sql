-- ============================================================
-- backfill_business_ids.sql
-- Run this if your tables are missing business_id columns.
-- Safe for single-business dev environments.
-- ============================================================

SET SQL_SAFE_UPDATES = 0;
SET @biz = (SELECT id FROM businesses ORDER BY created_at LIMIT 1);

-- ── employees ────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN business_id CHAR(36) NULL;
UPDATE employees SET business_id = @biz WHERE business_id IS NULL;

-- ── clockins ─────────────────────────────────────────────────
ALTER TABLE clockins ADD COLUMN business_id CHAR(36) NULL;
UPDATE clockins c
    JOIN employees e ON c.employee_id = e.id
    SET c.business_id = e.business_id
    WHERE c.business_id IS NULL;

-- ── invoices ─────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN business_id CHAR(36) NULL;
UPDATE invoices SET business_id = @biz WHERE business_id IS NULL;

-- ── payments ─────────────────────────────────────────────────
ALTER TABLE payments ADD COLUMN business_id CHAR(36) NULL;
UPDATE payments SET business_id = @biz WHERE business_id IS NULL;

SET SQL_SAFE_UPDATES = 1;

-- NOTE: If you get Error 1060 (Duplicate column name) on any ALTER,
-- that table already has the column -- skip that ALTER line and
-- run only the UPDATE for that table.
