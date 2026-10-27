-- ============================================================
-- BizMate Core Module Schema
-- Defines the built-in relational tables for core modules:
-- Customers, Employees, Business Services, Appointments,
-- Invoices, Payments, Clock-ins.
-- Run AFTER auth_schema.sql
-- ============================================================

USE bizmate;

-- ============================================================
-- customers
-- ============================================================
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

-- ============================================================
-- employees
-- ============================================================
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

-- ============================================================
-- business_services
-- Industry-agnostic service catalog per business.
-- ============================================================
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

-- ============================================================
-- appointments
-- ============================================================
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
    INDEX idx_appt_business  (business_id),
    INDEX idx_appt_customer  (customer_id),
    INDEX idx_appt_date      (date),
    CONSTRAINT fk_appt_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_appt_service
        FOREIGN KEY (service_id)  REFERENCES business_services(id) ON DELETE SET NULL
);

-- ============================================================
-- invoices
-- ============================================================
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
    INDEX idx_invoices_business  (business_id),
    INDEX idx_invoices_customer  (customer_id),
    INDEX idx_invoices_status    (status),
    INDEX idx_invoices_due_date  (due_date),
    CONSTRAINT fk_invoices_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- ============================================================
-- invoice_counter
-- One row per business — tracks the next auto-increment number.
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_counter (
    id          INT  NOT NULL AUTO_INCREMENT,
    business_id CHAR(36) NOT NULL,
    next_number INT  NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    UNIQUE KEY uq_counter_business (business_id),
    CONSTRAINT fk_counter_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- ============================================================
-- payments
-- ============================================================
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

-- ============================================================
-- clockins
-- ============================================================
CREATE TABLE IF NOT EXISTS clockins (
    id             CHAR(36)      NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)      NOT NULL,
    employee_id    CHAR(36)      NOT NULL,
    clock_in_time  DATETIME      NOT NULL,
    clock_out_time DATETIME      NULL,
    hours_worked   DECIMAL(10,2) NULL,

    PRIMARY KEY (id),
    INDEX idx_clockins_business  (business_id),
    INDEX idx_clockins_employee  (employee_id),
    INDEX idx_clockins_time      (clock_in_time),
    CONSTRAINT fk_clockins_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_clockins_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
