-- ============================================================
-- BizMate Tax Integration Schema — Phase 2 Extensions
-- Run AFTER tax_schema.sql
-- ============================================================

USE bizmate;

-- ============================================================
-- tax_form_readiness
-- Tracks readiness status for each IRS / state tax form
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_form_readiness (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    form_code       VARCHAR(50)   NOT NULL COMMENT 'e.g. SCHEDULE_C, FORM_941, W2, 1099_NEC',
    tax_year        INT           NOT NULL DEFAULT 2025,
    status          VARCHAR(30)   NOT NULL DEFAULT 'not_started'
                                  COMMENT 'not_started | in_progress | needs_review | ready | locked | exported',
    completion_pct  TINYINT       NOT NULL DEFAULT 0,
    missing_fields  JSON          NULL,
    reviewer_notes  TEXT          NULL,
    reviewed_by     CHAR(36)      NULL,
    reviewed_at     DATETIME      NULL,
    locked_at       DATETIME      NULL,
    exported_at     DATETIME      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_form_readiness (business_id, form_code, tax_year),
    INDEX idx_form_readiness_business (business_id),
    CONSTRAINT fk_form_readiness_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_documents
-- Document intake and tracking for tax documentation
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_documents (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    document_type   VARCHAR(100)  NOT NULL
                                  COMMENT 'w9 | w4 | ein_verification | prior_year_return | receipt | asset_purchase | tax_payment_proof | sales_tax_proof | payroll_support | contractor_doc | other',
    document_name   VARCHAR(255)  NOT NULL,
    category        VARCHAR(50)   NULL,
    tax_year        INT           NULL,
    status          VARCHAR(30)   NOT NULL DEFAULT 'requested'
                                  COMMENT 'requested | uploaded | under_review | approved | missing | expired',
    file_path       VARCHAR(500)  NULL COMMENT 'Placeholder for future file storage integration',
    file_name       VARCHAR(255)  NULL,
    upload_date     DATE          NULL,
    expiry_date     DATE          NULL,
    associated_entity VARCHAR(100) NULL COMMENT 'contractor name, employee name, etc.',
    version         INT           NOT NULL DEFAULT 1,
    notes           TEXT          NULL,
    review_flag     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_by      CHAR(36)      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_tax_docs_business  (business_id),
    INDEX idx_tax_docs_type      (document_type),
    INDEX idx_tax_docs_status    (status),
    CONSTRAINT fk_tax_docs_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_payments_ledger
-- Tax payment and remittance tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_payments_ledger (
    id              CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)       NOT NULL,
    payment_type    VARCHAR(50)    NOT NULL
                                   COMMENT 'federal_income | federal_se | federal_estimated | state_income | state_estimated | sales_tax | payroll_fica | payroll_futa | payroll_suta | local | other',
    payment_level   VARCHAR(20)    NOT NULL DEFAULT 'federal'
                                   COMMENT 'federal | state | local',
    state_code      VARCHAR(2)     NULL,
    amount          DECIMAL(12,2)  NOT NULL DEFAULT 0,
    payment_date    DATE           NULL,
    period_start    DATE           NULL,
    period_end      DATE           NULL,
    tax_year        INT            NOT NULL DEFAULT 2025,
    quarter         TINYINT        NULL COMMENT '1-4 or NULL for annual',
    status          VARCHAR(30)    NOT NULL DEFAULT 'pending'
                                   COMMENT 'pending | paid | overdue | waived | adjusted',
    confirmation_number VARCHAR(100) NULL,
    payment_method  VARCHAR(50)    NULL COMMENT 'check | eftps | ach | card | online | other',
    proof_document_id CHAR(36)     NULL,
    notes           TEXT           NULL,
    created_by      CHAR(36)       NULL,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_tax_payments_business (business_id),
    INDEX idx_tax_payments_year     (tax_year),
    INDEX idx_tax_payments_type     (payment_type),
    INDEX idx_tax_payments_status   (status),
    CONSTRAINT fk_tax_payments_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_compliance_registrations
-- Business registrations and compliance account tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_compliance_registrations (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    registration_type VARCHAR(100) NOT NULL
                                  COMMENT 'sales_tax_permit | payroll_tax_account | unemployment_account | state_withholding | franchise_tax | nexus_registration | resale_certificate | business_license | local_business_tax | other',
    state_code      VARCHAR(2)    NULL,
    jurisdiction    VARCHAR(100)  NULL COMMENT 'State/city/county name',
    status          VARCHAR(30)   NOT NULL DEFAULT 'not_started'
                                  COMMENT 'not_started | pending | active | review_needed | expired | inactive',
    account_number  VARCHAR(100)  NULL COMMENT 'Masked/placeholder only',
    registration_date DATE        NULL,
    renewal_date    DATE          NULL,
    notes           TEXT          NULL,
    document_id     CHAR(36)      NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_compliance_business (business_id),
    INDEX idx_compliance_state    (state_code),
    CONSTRAINT fk_compliance_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_local_configs
-- Local jurisdiction tax configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_local_configs (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    state_code      VARCHAR(2)    NOT NULL,
    jurisdiction    VARCHAR(150)  NOT NULL COMMENT 'City/county/municipality name',
    jurisdiction_type VARCHAR(30) NOT NULL DEFAULT 'city'
                                  COMMENT 'city | county | parish | district | municipality',
    local_income_tax_rate  DECIMAL(6,4) NOT NULL DEFAULT 0,
    local_sales_tax_rate   DECIMAL(6,4) NOT NULL DEFAULT 0,
    local_payroll_tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
    local_business_tax_rate DECIMAL(6,4) NOT NULL DEFAULT 0,
    has_local_filing       BOOLEAN      NOT NULL DEFAULT FALSE,
    filing_frequency       VARCHAR(30)  NULL COMMENT 'monthly | quarterly | annual',
    notes                  TEXT         NULL,
    enabled                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_local_tax_business (business_id),
    INDEX idx_local_tax_state    (state_code),
    CONSTRAINT fk_local_tax_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_book_adjustments
-- Book-to-tax adjustment entries
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_book_adjustments (
    id              CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)       NOT NULL,
    adjustment_type VARCHAR(100)   NOT NULL
                                   COMMENT 'nondeductible_expense | meals_limitation | depreciation | owner_distribution | guaranteed_payment | carryforward | overpayment_carryover | basis_adjustment | business_use_pct | personal_mixed_use | m1_adjustment | other',
    description     VARCHAR(255)   NOT NULL,
    book_amount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(12,2)  NOT NULL DEFAULT 0,
    adjustment      DECIMAL(12,2)  GENERATED ALWAYS AS (tax_amount - book_amount) STORED,
    tax_year        INT            NOT NULL DEFAULT 2025,
    requires_review BOOLEAN        NOT NULL DEFAULT FALSE,
    notes           TEXT           NULL,
    created_by      CHAR(36)       NULL,
    created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_book_adj_business (business_id),
    INDEX idx_book_adj_year     (tax_year),
    CONSTRAINT fk_book_adj_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_entity_details
-- Entity-specific details (partners, shareholders, officers)
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_entity_details (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    detail_type     VARCHAR(30)   NOT NULL
                                  COMMENT 'partner | shareholder | officer | owner',
    name            VARCHAR(255)  NOT NULL,
    ownership_pct   DECIMAL(6,3)  NULL,
    tax_year        INT           NOT NULL DEFAULT 2025,
    compensation    DECIMAL(12,2) NULL COMMENT 'Salary/guaranteed payments',
    distributions   DECIMAL(12,2) NULL,
    k1_issued       BOOLEAN       NOT NULL DEFAULT FALSE,
    basis_amount    DECIMAL(12,2) NULL COMMENT 'Placeholder — basis tracking',
    ssn_last4       VARCHAR(4)    NULL COMMENT 'Last 4 digits placeholder only',
    notes           TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_entity_details_business (business_id),
    INDEX idx_entity_details_year     (tax_year),
    CONSTRAINT fk_entity_details_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- tax_workflow_status
-- Review, approval, lock, and amend workflow for tax packages
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_workflow_status (
    id              CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id     CHAR(36)      NOT NULL,
    tax_year        INT           NOT NULL DEFAULT 2025,
    package_name    VARCHAR(100)  NOT NULL DEFAULT 'Annual Tax Package',
    status          VARCHAR(30)   NOT NULL DEFAULT 'draft'
                                  COMMENT 'draft | needs_review | approved | locked | exported | filed_placeholder | amended',
    current_step    INT           NOT NULL DEFAULT 1,
    total_steps     INT           NOT NULL DEFAULT 10,
    checklist       JSON          NULL COMMENT 'Array of {step, label, done, notes}',
    reviewer_notes  TEXT          NULL,
    approved_by     CHAR(36)      NULL,
    approved_at     DATETIME      NULL,
    locked_by       CHAR(36)      NULL,
    locked_at       DATETIME      NULL,
    exported_at     DATETIME      NULL,
    amendment_count INT           NOT NULL DEFAULT 0,
    amendment_notes TEXT          NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_workflow_year (business_id, tax_year),
    INDEX idx_workflow_business (business_id),
    CONSTRAINT fk_workflow_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
