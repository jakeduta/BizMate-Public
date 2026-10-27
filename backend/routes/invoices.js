import express from "express";
import { pool } from "../db.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { sendEmail } from "../services/emailService.js";
import { invoiceCreatedHtml } from "../templates/emailTemplates.js";

const router = express.Router();

// GET all invoices
router.get("/", checkPermission('module:invoices:view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, c.name AS customer_name, c.email AS customer_email
            FROM invoices i
                     JOIN customers c ON i.customer_id = c.id
            ORDER BY i.date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching invoices:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST create new invoice
router.post("/", checkPermission('module:invoices:create'), async (req, res) => {
    try {
        const data = req.body;

        // Normalize invoice number (treat empty as missing)
        let invoiceNumber = (data.invoice_number || "").trim();

        // Auto generate using invoice_counter if missing
        if (!invoiceNumber) {
            const [[counter]] = await pool.query(`
                SELECT next_number FROM invoice_counter LIMIT 1
            `);

            const next = counter.next_number;
            invoiceNumber = "INV-" + next.toString().padStart(4, "0");

            await pool.query(`
                UPDATE invoice_counter SET next_number = next_number + 1 WHERE id = 1
            `);
        }

        const itemsValue =
            typeof data.items === "string" ? data.items : JSON.stringify(data.items);

        if (data.status?.toLowerCase() === "paid") {
            data.paid_amount = data.total;
        }

        await pool.query(
            `INSERT INTO invoices
             (id, customer_id, invoice_number, date, due_date, items, subtotal, tax, total, paid_amount, status, notes, created_by)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.customer_id,
                invoiceNumber,
                data.date,
                data.due_date,
                itemsValue,
                data.subtotal,
                data.tax,
                data.total,
                data.paid_amount ?? 0,
                data.status ?? "draft",
                data.notes,
                data.created_by ?? "system",
            ]
        );

        // Send invoice created email — fire-and-forget, never blocks the response
        (async () => {
            try {
                const [[customer]] = await pool.query(
                    `SELECT name, email FROM customers WHERE id = ?`,
                    [data.customer_id]
                );
                if (!customer?.email) return;

                const [[business]] = await pool.query(
                    `SELECT name FROM businesses WHERE id = ?`,
                    [req.user.businessId]
                );
                const businessName = business?.name || "Your Business";

                const html = invoiceCreatedHtml({
                    customerName:  customer.name,
                    businessName,
                    invoiceNumber,
                    invoiceDate:   data.date,
                    dueDate:       data.due_date,
                    total:         data.total,
                });

                await sendEmail(
                    customer.email,
                    `Invoice #${invoiceNumber} from ${businessName}`,
                    html
                );
            } catch (emailErr) {
                console.error("[Email] Invoice notification error:", emailErr.message);
            }
        })();

        res.json({ success: true, message: "Invoice created successfully", invoice_number: invoiceNumber });
    } catch (err) {
        console.error("Invoice insert error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT update invoice
router.put("/:id", checkPermission('module:invoices:edit'), async (req, res) => {
    try {
        const data = req.body;
        const { id } = req.params;

        const itemsValue =
            typeof data.items === "string" ? data.items : JSON.stringify(data.items);

        if (data.status?.toLowerCase() === "paid") {
            data.paid_amount = data.total;
        }

        if (Number(data.paid_amount) >= Number(data.total)) {
            data.status = "Paid";
            data.paid_amount = data.total;
        }

        await pool.query(
            `UPDATE invoices
             SET due_date = ?, items = ?, subtotal = ?, tax = ?, total = ?, paid_amount = ?, status = ?, notes = ?
             WHERE id = ?`,
            [data.due_date, itemsValue, data.subtotal, data.tax, data.total, data.paid_amount, data.status, data.notes, id]
        );

        res.json({ success: true, message: "Invoice updated successfully" });
    } catch (err) {
        console.error("Invoice update error:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE invoice
router.delete("/:id", checkPermission('module:invoices:delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM invoices WHERE id = ?", [id]);
        res.json({ success: true, message: "Invoice deleted successfully" });
    } catch (err) {
        console.error("Invoice delete error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
