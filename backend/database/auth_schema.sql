-- ============================================================
-- BizMate Auth Schema
-- Run this after your existing bizmate database is created.
-- ============================================================

USE bizmate;

-- ============================================================
-- users
-- ============================================================
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

-- ============================================================
-- businesses
-- ============================================================
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

-- ============================================================
-- user_business_roles  (multi-tenant pivot table)
-- One row per user per business — defines their role in that business.
-- ============================================================
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

-- ============================================================
-- refresh_tokens
-- Stores hashed refresh tokens for secure rotation.
-- ============================================================
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

-- ============================================================
-- role_permissions
-- Per-business, per-role permission matrix.
-- Admin is always granted everything and has no rows here.
-- Rows are seeded on business registration.
-- ============================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id             CHAR(36)                              NOT NULL DEFAULT (UUID()),
    business_id    CHAR(36)                              NOT NULL,
    role           ENUM('Manager','Employee','Customer')  NOT NULL,
    permission_key VARCHAR(100)                           NOT NULL,
    granted        BOOLEAN                               NOT NULL DEFAULT FALSE,
    updated_at     DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                         ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_perm           (business_id, role, permission_key),
    INDEX   idx_perm_business     (business_id),
    CONSTRAINT fk_perm_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
