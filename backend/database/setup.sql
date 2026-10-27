-- ============================================================
-- BizMate — Full Database Setup
-- Run this file on a fresh MySQL instance to create every
-- table the application needs.
--
-- Usage (from terminal):
--   mysql -u root -p < backend/database/setup.sql
--
-- Order matters — foreign-key dependencies are respected:
--   1. auth_schema.sql      → users, businesses, roles, tokens, permissions
--   2. core_schema.sql      → customers, employees, services, appointments,
--                              invoices, payments, clockins
--   3. workspace_schema.sql → modules, fields, records, custom_module_tables
--   4. triggers.sql         → invoice status / paid-amount automation
-- ============================================================

-- Create the database if it doesn't exist yet.
CREATE DATABASE IF NOT EXISTS bizmate
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bizmate;

-- ============================================================
-- 1. AUTH — users, businesses, membership, tokens, permissions
-- ============================================================

-- users
CREATE TABLE IF NOT EXISTS users (
    id          CHAR(36)        NOT NULL DEFAULT (UUID()),
    email       VARCHAR(255)    NOT NULL,
    password    VARCHAR(255)    NOT NULL,
    full_name   VARCHAR(255)    NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_email (email)
);

-- businesses
CREATE TABLE IF NOT EXISTS businesses (
    id            CHAR(36)      NOT NULL DEFAULT (UUID()),
    name          VARCHAR(255)  NOT NULL,
    business_code VARCHAR(12)   NOT NULL,
    owner_id      CHAR(36)      NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_businesses_code (business_code),
    INDEX idx_businesses_owner (owner_id),
    CONSTRAINT fk_businesses_owner
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- user_business_roles  (multi-tenant pivot)
CREATE TABLE IF NOT EXISTS user_business_roles (
    id          CHAR(36)        NOT NULL DEFAULT (UUID()),
    user_id     CHAR(36)        NOT NULL,
    business_id CHAR(36)        NOT NULL,
    role        ENUM('Customer','Employee','Manager','Admin') NOT NULL DEFAULT 'Customer',
    joined_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,

    PRIMARY KEY (id),
    UNIQUE KEY uq_user_business (user_id, business_id),
    INDEX idx_ubr_user     (user_id),
    INDEX idx_ubr_business (business_id),
    CONSTRAINT fk_ubr_user
        FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    CONSTRAINT fk_ubr_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          CHAR(36)        NOT NULL DEFAULT (UUID()),
    user_id     CHAR(36)        NOT NULL,
    business_id CHAR(36)        NULL,        -- NULL for portal/customer-only users
    token_hash  VARCHAR(255)    NOT NULL,
    expires_at  DATETIME        NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked     BOOLEAN         NOT NULL DEFAULT FALSE,

    PRIMARY KEY (id),
    INDEX idx_rt_token_hash (token_hash),
    INDEX idx_rt_user       (user_id),
    CONSTRAINT fk_rt_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- role_permissions  (per-business, per-role permission matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
    id             CHAR(36)                              NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)                              NOT NULL,
    role           ENUM('Manager','Employee','Customer')  NOT NULL,
    permission_key VARCHAR(100)                           NOT NULL,
    granted        BOOLEAN                               NOT NULL DEFAULT FALSE,
    updated_at     DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                         ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_perm       (business_id, role, permission_key),
    INDEX   idx_perm_business (business_id),
    CONSTRAINT fk_perm_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. CORE MODULES — relational data for built-in modules
-- ============================================================

-- customers
CREATE TABLE IF NOT EXISTS customers (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id  CHAR(36)      NOT NULL,
    name         VARCHAR(255)  NOT NULL,
    email        VARCHAR(255)  NULL,
    phone        VARCHAR(50)   NULL,
    company      VARCHAR(255)  NULL,
    created_by   CHAR(36)      NULL,
    created_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_customers_business (business_id),
    INDEX idx_customers_email    (email),
    CONSTRAINT fk_customers_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- employees
CREATE TABLE IF NOT EXISTS employees (
    id           CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id  CHAR(36)       NOT NULL,
    name         VARCHAR(255)   NOT NULL,
    role         VARCHAR(100)   NULL,
    hourly_rate  DECIMAL(10,2)  NULL,
    email        VARCHAR(255)   NULL,
    phone        VARCHAR(50)    NULL,
    active       BOOLEAN        NOT NULL DEFAULT TRUE,
    created_by   CHAR(36)       NULL,
    created_date DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_employees_business (business_id),
    CONSTRAINT fk_employees_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- business_services  (service catalog per business)
CREATE TABLE IF NOT EXISTS business_services (
    id               CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id      CHAR(36)      NOT NULL,
    name             VARCHAR(255)  NOT NULL,
    description      TEXT          NULL,
    category         VARCHAR(100)  NULL,
    duration_minutes INT           NULL,
    price            DECIMAL(10,2) NULL,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_services_business (business_id),
    CONSTRAINT fk_services_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
    id          CHAR(36)     NOT NULL DEFAULT (UUID()),
    business_id CHAR(36)     NOT NULL,
    customer_id CHAR(36)     NULL,
    service_id  CHAR(36)     NULL,
    title       VARCHAR(255) NOT NULL,
    date        DATE         NULL,
    start_time  TIME         NULL,
    end_time    TIME         NULL,
    status      VARCHAR(50)  NULL,
    notes       TEXT         NULL,
    created_by  CHAR(36)     NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_appt_business (business_id),
    INDEX idx_appt_customer (customer_id),
    INDEX idx_appt_date     (date),
    CONSTRAINT fk_appt_business
        FOREIGN KEY (business_id) REFERENCES businesses(id)       ON DELETE CASCADE,
    CONSTRAINT fk_appt_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)        ON DELETE SET NULL,
    CONSTRAINT fk_appt_service
        FOREIGN KEY (service_id)  REFERENCES business_services(id) ON DELETE SET NULL
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
    id             CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)       NOT NULL,
    customer_id    CHAR(36)       NULL,
    invoice_number VARCHAR(50)    NOT NULL,
    date           DATE           NULL,
    due_date       DATE           NULL,
    items          JSON           NULL,
    subtotal       DECIMAL(10,2)  NOT NULL DEFAULT 0,
    tax            DECIMAL(10,2)  NOT NULL DEFAULT 0,
    total          DECIMAL(10,2)  NOT NULL DEFAULT 0,
    paid_amount    DECIMAL(10,2)  NOT NULL DEFAULT 0,
    status         VARCHAR(50)    NOT NULL DEFAULT 'draft',
    notes          TEXT           NULL,
    created_by     CHAR(36)       NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_invoice_number_biz (business_id, invoice_number),
    INDEX idx_invoices_business (business_id),
    INDEX idx_invoices_customer (customer_id),
    INDEX idx_invoices_status   (status),
    INDEX idx_invoices_due_date (due_date),
    CONSTRAINT fk_invoices_business
        FOREIGN KEY (business_id) REFERENCES businesses(id)  ON DELETE CASCADE,
    CONSTRAINT fk_invoices_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)   ON DELETE SET NULL
);

-- invoice_counter  (one row per business for auto-numbering)
CREATE TABLE IF NOT EXISTS invoice_counter (
    id          INT      NOT NULL AUTO_INCREMENT,
    business_id CHAR(36) NOT NULL,
    next_number INT      NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    UNIQUE KEY uq_counter_business (business_id),
    CONSTRAINT fk_counter_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
    id             CHAR(36)       NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)       NOT NULL,
    invoice_id     CHAR(36)       NOT NULL,
    amount         DECIMAL(10,2)  NOT NULL,
    date           DATE           NULL,
    payment_method VARCHAR(100)   NULL,
    reference      VARCHAR(255)   NULL,
    notes          TEXT           NULL,
    created_by     CHAR(36)       NULL,
    created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_payments_business (business_id),
    INDEX idx_payments_invoice (invoice_id),
    CONSTRAINT fk_payments_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- clockins
CREATE TABLE IF NOT EXISTS clockins (
    id             CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)      NOT NULL,
    employee_id    CHAR(36)      NOT NULL,
    clock_in_time  DATETIME      NOT NULL,
    clock_out_time DATETIME      NULL,
    hours_worked   DECIMAL(10,2) NULL,

    PRIMARY KEY (id),
    INDEX idx_clockins_business (business_id),
    INDEX idx_clockins_employee (employee_id),
    INDEX idx_clockins_time     (clock_in_time),
    CONSTRAINT fk_clockins_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_clockins_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)  ON DELETE CASCADE
);

-- ============================================================
-- 3. WORKSPACE — dynamic/custom module system
-- ============================================================

-- modules  (one row per business per module/tab)
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
    UNIQUE  KEY uq_module_biz_slug (business_id, slug),
    INDEX   idx_modules_business   (business_id),
    INDEX   idx_modules_order      (business_id, display_order),
    CONSTRAINT fk_modules_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- module_fields  (schema of a custom module)
CREATE TABLE IF NOT EXISTS module_fields (
    id            CHAR(36)      NOT NULL DEFAULT (UUID()),
    module_id     CHAR(36)      NOT NULL,
    business_id   CHAR(36)      NOT NULL,
    field_name    VARCHAR(100)  NOT NULL,
    field_label   VARCHAR(150)  NOT NULL,
    field_type    ENUM(
                    'text','number','date','boolean',
                    'select','email','phone','textarea'
                  )             NOT NULL DEFAULT 'text',
    required      BOOLEAN       NOT NULL DEFAULT FALSE,
    options       JSON          NULL,
    display_order INT           NOT NULL DEFAULT 0,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_field_mod_name (module_id, field_name),
    INDEX   idx_fields_module     (module_id),
    INDEX   idx_fields_business   (business_id),
    CONSTRAINT fk_fields_module
        FOREIGN KEY (module_id)   REFERENCES modules(id)    ON DELETE CASCADE,
    CONSTRAINT fk_fields_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- module_records  (generic record store for all custom modules)
CREATE TABLE IF NOT EXISTS module_records (
    id          CHAR(36)    NOT NULL DEFAULT (UUID()),
    module_id   CHAR(36)    NOT NULL,
    business_id CHAR(36)    NOT NULL,
    data_json   JSON        NOT NULL,
    created_by  CHAR(36)    NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_records_module   (module_id),
    INDEX idx_records_business (business_id),
    INDEX idx_records_created  (created_at),
    CONSTRAINT fk_records_module
        FOREIGN KEY (module_id)   REFERENCES modules(id)    ON DELETE CASCADE,
    CONSTRAINT fk_records_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- custom_module_tables  (tracks modules backed by a real DDL table)
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

-- ============================================================
-- 4. TRIGGERS — invoice automation
-- ============================================================

DROP TRIGGER IF EXISTS set_overdue_on_insert;
DROP TRIGGER IF EXISTS set_overdue_on_update;
DROP TRIGGER IF EXISTS auto_paid;
DROP TRIGGER IF EXISTS sync_paid_amount_insert;
DROP TRIGGER IF EXISTS sync_paid_amount_update;

DELIMITER $$

CREATE TRIGGER set_overdue_on_insert
    BEFORE INSERT ON invoices
    FOR EACH ROW
BEGIN
    IF NEW.due_date < CURDATE() AND NEW.status != 'Paid' THEN
        SET NEW.status = 'Overdue';
    END IF;
END$$

CREATE TRIGGER set_overdue_on_update
    BEFORE UPDATE ON invoices
    FOR EACH ROW
BEGIN
    IF NEW.due_date < CURDATE() AND NEW.status != 'Paid' THEN
        SET NEW.status = 'Overdue';
    END IF;
END$$

CREATE TRIGGER auto_paid
    BEFORE UPDATE ON invoices
    FOR EACH ROW
BEGIN
    IF COALESCE(NEW.paid_amount, 0) >= COALESCE(NEW.total, 0) THEN
        SET NEW.status = 'Paid';
    END IF;
END$$

CREATE TRIGGER sync_paid_amount_insert
    AFTER INSERT ON payments
    FOR EACH ROW
BEGIN
    UPDATE invoices
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE payments.invoice_id = invoices.id
    )
    WHERE invoices.id = NEW.invoice_id;
END$$

CREATE TRIGGER sync_paid_amount_update
    AFTER UPDATE ON payments
    FOR EACH ROW
BEGIN
    UPDATE invoices
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE payments.invoice_id = invoices.id
    )
    WHERE invoices.id = NEW.invoice_id;
END$$

DELIMITER ;
