-- ============================================================
-- BizMate Workspace / Dynamic Modules Schema
-- Run AFTER auth_schema.sql
-- ============================================================

USE bizmate;

-- ============================================================
-- modules
-- Metadata for every tab in the sidebar — both core (relational)
-- and custom (JSON-backed). One row per business per module.
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
    id            CHAR(36)                  NOT NULL DEFAULT (UUID()),
    business_id   CHAR(36)                  NOT NULL,
    name          VARCHAR(100)              NOT NULL,
    slug          VARCHAR(100)              NOT NULL,
    type          ENUM('core','custom')     NOT NULL DEFAULT 'custom',
    enabled       BOOLEAN                   NOT NULL DEFAULT TRUE,
    display_order INT                       NOT NULL DEFAULT 0,
    icon          VARCHAR(60)               NULL,
    created_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_module_biz_slug  (business_id, slug),
    INDEX   idx_modules_business    (business_id),
    INDEX   idx_modules_order       (business_id, display_order),
    CONSTRAINT fk_modules_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- module_fields
-- Defines the schema of a custom module — one row per field.
-- Core modules do not have rows here (they use their own tables).
-- ============================================================
CREATE TABLE IF NOT EXISTS module_fields (
    id            CHAR(36)      NOT NULL DEFAULT (UUID()),
    module_id     CHAR(36)      NOT NULL,
    business_id   CHAR(36)      NOT NULL,
    field_name    VARCHAR(100)  NOT NULL,   -- snake_case programmatic key
    field_label   VARCHAR(150)  NOT NULL,   -- human-readable label
    field_type    ENUM(
                    'text','number','date','boolean',
                    'select','email','phone','textarea'
                  )             NOT NULL DEFAULT 'text',
    required      BOOLEAN       NOT NULL DEFAULT FALSE,
    options       JSON          NULL,       -- [{label, value}] for type=select
    display_order INT           NOT NULL DEFAULT 0,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_field_mod_name   (module_id, field_name),
    INDEX   idx_fields_module       (module_id),
    INDEX   idx_fields_business     (business_id),
    CONSTRAINT fk_fields_module
        FOREIGN KEY (module_id)   REFERENCES modules(id)    ON DELETE CASCADE,
    CONSTRAINT fk_fields_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- module_records
-- A single generic table that holds ALL records for ALL custom
-- modules. Each row is scoped to a business + module and stores
-- its payload in data_json validated against module_fields.
-- ============================================================
CREATE TABLE IF NOT EXISTS module_records (
    id          CHAR(36)    NOT NULL DEFAULT (UUID()),
    module_id   CHAR(36)    NOT NULL,
    business_id CHAR(36)    NOT NULL,
    data_json   JSON        NOT NULL,
    created_by  CHAR(36)    NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_records_module    (module_id),
    INDEX idx_records_business  (business_id),
    INDEX idx_records_created   (created_at),
    CONSTRAINT fk_records_module
        FOREIGN KEY (module_id)   REFERENCES modules(id)    ON DELETE CASCADE,
    CONSTRAINT fk_records_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- custom_module_tables
-- Tracks which custom modules have a real DDL-backed table
-- versus a JSON blob stored in module_records.
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_module_tables (
    id          CHAR(36)     NOT NULL DEFAULT (UUID()),
    module_id   CHAR(36)     NOT NULL,
    business_id CHAR(36)     NOT NULL,
    table_name  VARCHAR(100) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_cmt_module (module_id),
    UNIQUE KEY uq_cmt_table  (table_name),
    CONSTRAINT fk_cmt_module
        FOREIGN KEY (module_id)   REFERENCES modules(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cmt_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
