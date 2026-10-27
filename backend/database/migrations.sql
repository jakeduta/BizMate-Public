-- ============================================================
-- BizMate Migrations
-- For NEW installations: run setup.sql instead.
-- This file documents schema changes applied to existing
-- databases that were set up before setup.sql existed.
-- ============================================================

USE bizmate;

-- ── Migration 001 ─────────────────────────────────────────────────────────────
-- Allow NULL business_id in refresh_tokens for portal/customer-only users.
-- Already included in auth_schema.sql / setup.sql for new installs.
-- ALTER TABLE refresh_tokens MODIFY COLUMN business_id CHAR(36) NULL;

-- ── Migration 002 ─────────────────────────────────────────────────────────────
-- Add role_permissions table.
-- Already included in auth_schema.sql / setup.sql for new installs.
-- See auth_schema.sql for the CREATE TABLE statement.

-- ── Migration 003 ─────────────────────────────────────────────────────────────
-- Add business_services table.
-- Already included in core_schema.sql / setup.sql for new installs.
-- See core_schema.sql for the CREATE TABLE statement.

-- ── Migration 004 ─────────────────────────────────────────────────────────────
-- Add service_id column to appointments (for databases created before
-- core_schema.sql included the column at table creation time).
DROP PROCEDURE IF EXISTS _bm_mig_004;
DELIMITER //
CREATE PROCEDURE _bm_mig_004()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'appointments'
          AND COLUMN_NAME  = 'service_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN service_id CHAR(36) NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA    = DATABASE()
          AND TABLE_NAME      = 'appointments'
          AND CONSTRAINT_NAME = 'fk_appt_service'
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT fk_appt_service
            FOREIGN KEY (service_id) REFERENCES business_services(id)
            ON DELETE SET NULL;
    END IF;
END//
DELIMITER ;
CALL _bm_mig_004();
DROP PROCEDURE IF EXISTS _bm_mig_004;

-- ── Migration 005 ─────────────────────────────────────────────────────────────
-- Add custom_module_tables table.
-- Already included in workspace_schema.sql / setup.sql for new installs.
-- See workspace_schema.sql for the CREATE TABLE statement.
