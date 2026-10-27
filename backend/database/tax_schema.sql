-- ============================================================
-- BizMate Tax Integration Schema
-- Run AFTER core_schema.sql
-- ============================================================

USE bizmate;

-- ============================================================
-- tax_profiles
-- Stores the business's tax configuration and entity info
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_profiles (
    id                      CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id             CHAR(36)      NOT NULL,
    legal_name              VARCHAR(255)  NULL,
    ein                     VARCHAR(50)   NULL,
    entity_type             VARCHAR(50)   NULL COMMENT 'sole_prop | single_llc | multi_llc | partnership | s_corp | c_corp | nonprofit',
    tax_year                INT           NOT NULL DEFAULT 2025,
    fiscal_year_end_month   INT           NOT NULL DEFAULT 12 COMMENT '12 = calendar year',
    primary_state           VARCHAR(2)    NULL,
    industry_type           VARCHAR(100)  NULL,
    sales_tax_enabled       BOOLEAN       NOT NULL DEFAULT FALSE,
    payroll_enabled         BOOLEAN       NOT NULL DEFAULT FALSE,
    contractor_tracking     BOOLEAN       NOT NULL DEFAULT FALSE,
    estimated_payments_enabled BOOLEAN   NOT NULL DEFAULT FALSE,
    home_office_deduction   BOOLEAN       NOT NULL DEFAULT FALSE,
    mileage_deduction       BOOLEAN       NOT NULL DEFAULT FALSE,
    asset_depreciation      BOOLEAN       NOT NULL DEFAULT FALSE,
    nexus_states            JSON          NULL COMMENT 'Array of state codes',
    created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_tax_profile_business (business_id),
    INDEX idx_tax_profile_business (business_id),
    CONSTRAINT fk_tax_profile_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_manual_entries
-- Manual expense/income entries for tax purposes
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_manual_entries (
    id             CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)       NOT NULL,
    category       VARCHAR(100)   NOT NULL COMMENT 'rent | utilities | mileage | home_office | equipment | insurance | loan_interest | contractor | owner_draw | estimated_payment | sales_tax_remitted | other',
    description    VARCHAR(255)   NULL,
    amount         DECIMAL(10,2)  NOT NULL DEFAULT 0,
    date           DATE           NULL,
    tax_year       INT            NOT NULL DEFAULT 2025,
    is_deductible  BOOLEAN        NOT NULL DEFAULT TRUE,
    notes          TEXT           NULL,
    created_by     CHAR(36)       NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_tax_manual_business (business_id),
    INDEX idx_tax_manual_year     (tax_year),
    INDEX idx_tax_manual_category (category),
    CONSTRAINT fk_tax_manual_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_contractor_records
-- 1099 contractor payment tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_contractor_records (
    id             CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)       NOT NULL,
    contractor_name VARCHAR(255)  NOT NULL,
    tin            VARCHAR(50)    NULL COMMENT 'Taxpayer Identification Number placeholder',
    w9_on_file     BOOLEAN        NOT NULL DEFAULT FALSE,
    total_paid     DECIMAL(10,2)  NOT NULL DEFAULT 0,
    tax_year       INT            NOT NULL DEFAULT 2025,
    requires_1099  BOOLEAN        NOT NULL DEFAULT FALSE,
    notes          TEXT           NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_tax_contractor_business (business_id),
    INDEX idx_tax_contractor_year     (tax_year),
    CONSTRAINT fk_tax_contractor_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_sales_summaries
-- Aggregated sales tax tracking per period
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_sales_summaries (
    id                    CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id           CHAR(36)       NOT NULL,
    period_start          DATE           NOT NULL,
    period_end            DATE           NOT NULL,
    taxable_revenue       DECIMAL(12,2)  NOT NULL DEFAULT 0,
    non_taxable_revenue   DECIMAL(12,2)  NOT NULL DEFAULT 0,
    sales_tax_collected   DECIMAL(12,2)  NOT NULL DEFAULT 0,
    sales_tax_remitted    DECIMAL(12,2)  NOT NULL DEFAULT 0,
    state_code            VARCHAR(2)     NULL,
    notes                 TEXT           NULL,
    created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_tax_sales_business (business_id),
    INDEX idx_tax_sales_period   (period_start, period_end),
    CONSTRAINT fk_tax_sales_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_audit_log
-- Tracks changes and activity in the tax module
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_audit_log (
    id             CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)      NOT NULL,
    action         VARCHAR(100)  NOT NULL,
    entity_type    VARCHAR(50)   NULL,
    entity_id      CHAR(36)      NULL,
    details        JSON          NULL,
    performed_by   CHAR(36)      NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_audit_business (business_id),
    INDEX idx_audit_created  (created_at),
    CONSTRAINT fk_audit_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
