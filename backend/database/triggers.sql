-- ============================================================
-- BizMate Triggers
-- Run AFTER core_schema.sql (requires invoices and payments tables).
-- Note: setup.sql includes these triggers inline — only run this
-- file separately if you used the individual schema files.
-- ============================================================

USE bizmate;

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
