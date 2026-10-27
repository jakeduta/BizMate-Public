import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { sendEmail } from "../services/emailService.js";
import { paymentReceivedHtml } from "../templates/emailTemplates.js";

const router = express.Router();

// GET all payments
router.get("/", checkPermission('module:payments:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*, i.invoice_number, c.name AS customer_name
            FROM payments p
                     JOIN invoices i ON p.invoice_id = i.id
                     JOIN customers c ON i.customer_id = c.id
            ORDER BY p.date DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create new payment
router.post("/", checkPermission('module:payments:create'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { invoice_id, amount, date, payment_method, reference, notes, created_by } = req.body;

        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO payments
             (id, invoice_id, amount, date, payment_method, reference, notes, created_by)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
            [invoice_id, amount, date, payment_method, reference, notes, created_by]
        );

        const [[invoice]] = await connection.query(
            `SELECT total, COALESCE(paid_amount, 0) AS paid_amount FROM invoices WHERE id = ?`,
            [invoice_id]
        );

        if (invoice) {
            const newPaidAmount = invoice.paid_amount + parseFloat(amount);
            const newStatus = newPaidAmount >= invoice.total ? "paid" : "sent";
            await connection.query(
                `UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?`,
                [newPaidAmount, newStatus, invoice_id]
            );
        }

        await connection.commit();

        // Capture values needed for email before connection is released
        const emailInvoiceId = invoice_id;
        const emailAmount    = amount;
        const emailDate      = date;
        const emailNewPaid   = invoice ? invoice.paid_amount + parseFloat(amount) : null;
        const emailTotal     = invoice?.total ?? null;
        const emailPaidInFull = emailNewPaid != null && emailNewPaid >= emailTotal;

        // Send payment confirmation email — fire-and-forget, never blocks the response
        (async () => {
            try {
                const [[row]] = await pool.query(
                    `SELECT i.invoice_number, i.total, i.paid_amount,
                            c.name AS customer_name, c.email AS customer_email
                     FROM invoices i
                     JOIN customers c ON c.id = i.customer_id
                     WHERE i.id = ?`,
                    [emailInvoiceId]
                );
                if (!row?.customer_email) return;

                const [[business]] = await pool.query(
                    `SELECT name FROM businesses WHERE id = ?`,
                    [req.user.businessId]
                );
                const businessName = business?.name || "Your Business";

                const html = paymentReceivedHtml({
                    customerName:  row.customer_name,
                    businessName,
                    invoiceNumber: row.invoice_number,
                    paymentDate:   emailDate,
                    amount:        emailAmount,
                    invoiceTotal:  row.total,
                    paidAmount:    row.paid_amount,
                    paidInFull:    emailPaidInFull,
                });

                await sendEmail(
                    row.customer_email,
                    `Payment received for Invoice #${row.invoice_number}`,
                    html
                );
            } catch (emailErr) {
                console.error("[Email] Payment notification error:", emailErr.message);
            }
        })();

        res.json({ success: true, message: "Payment recorded and invoice updated" });
    } catch (err) {
        await connection.rollback();
        console.error("Payment transaction error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// PUT update payment
router.put("/:id", checkPermission('module:payments:edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, date, payment_method, reference, notes } = req.body;
        await pool.query(
            `UPDATE payments SET amount = ?, date = ?, payment_method = ?, reference = ?, notes = ? WHERE id = ?`,
            [amount, date, payment_method, reference, notes, id]
        );
        res.json({ success: true, message: "Payment updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE payment
router.delete("/:id", checkPermission('module:payments:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM payments WHERE id = ?", [id]);
        res.json({ success: true, message: "Payment deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
