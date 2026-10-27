import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import xlsx from "xlsx";
import crypto from "crypto";
import { pool } from "../db.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

function sheetToJson(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet, { defval: "" });
}

const TABLE_SCHEMAS = {
    customers: {
        fields: ["name", "email", "phone", "company", "created_date", "created_by"],
        example: {
            name: "John Doe", email: "john@example.com", phone: "555-2001",
            company: "Example Co", created_date: "2025-01-01", created_by: "system"
        }
    },
    employees: {
        fields: ["name", "role", "hourly_rate", "email", "phone", "active", "created_date", "created_by"],
        example: {
            name: "Jane Smith", role: "Technician", hourly_rate: 22.50,
            email: "jane@example.com", phone: "555-3001", active: true,
            created_date: "2025-01-01", created_by: "system"
        }
    },
    invoices: {
        fields: ["customer_name", "invoice_number", "date", "due_date", "subtotal", "tax", "total", "status", "notes", "created_by"],
        example: {
            customer_name: "John Doe", invoice_number: "INV-001",
            date: "2025-03-01", due_date: "2025-03-31", subtotal: 100.00, tax: 10.00, total: 110.00,
            status: "draft", notes: "Net 30", created_by: "system"
        }
    },
    appointments: {
        fields: ["title", "date", "start_time", "end_time", "status", "notes", "created_by"],
        example: {
            title: "Consultation", date: "2025-04-01", start_time: "09:00:00",
            end_time: "10:00:00", status: "scheduled", notes: "", created_by: "system"
        }
    },
    business_services: {
        fields: ["name", "description", "category", "duration_minutes", "price"],
        example: {
            name: "Haircut", description: "Standard haircut", category: "Hair",
            duration_minutes: 30, price: 25.00
        }
    }
};

async function insertRecord(table, record, userId, businessId, unmatchedCustomers = []) {
    const id = crypto.randomUUID();
    const createdBy = record.created_by || userId || "system";
    let inserted = false;

    switch (table) {
        case "customers":
            await pool.query(
                `INSERT INTO customers (id, business_id, name, email, phone, company, created_date, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    businessId,
                    record.name || null,
                    record.email || null,
                    (record.phone || "").toString().trim() || null,
                    record.company || null,
                    record.created_date || new Date(),
                    createdBy
                ]
            );
            inserted = true;
            break;

        case "employees":
            await pool.query(
                `INSERT INTO employees (id, business_id, name, role, hourly_rate, email, phone, active, created_date, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    businessId,
                    record.name || null,
                    record.role || null,
                    record.hourly_rate != null ? parseFloat(record.hourly_rate) : null,
                    record.email || null,
                    (record.phone || "").toString().trim() || null,
                    record.active != null ? Boolean(record.active) : true,
                    record.created_date || new Date(),
                    createdBy
                ]
            );
            inserted = true;
            break;

        case "invoices": {
            const subtotal = parseFloat(record.subtotal) || 0;
            const tax      = parseFloat(record.tax) || 0;
            const total    = parseFloat(record.total) || (subtotal + tax);
            let invoiceNumber = (record.invoice_number || "").toString().trim();
            if (!invoiceNumber) {
                invoiceNumber = "INV-" + id.slice(0, 8).toUpperCase();
            }

            // Resolve customer by name (case-insensitive, scoped to business)
            let customerId = null;
            if (record.customer_name) {
                const [[customer]] = await pool.query(
                    `SELECT id FROM customers WHERE LOWER(name) = LOWER(?) AND business_id = ? LIMIT 1`,
                    [record.customer_name.trim(), businessId]
                );
                customerId = customer?.id || null;
                if (!customerId) {
                    console.warn(`No customer match for "${record.customer_name}" in business ${businessId}`);
                    unmatchedCustomers.push({
                        customer_name: record.customer_name.trim(),
                        invoice_number: invoiceNumber,
                    });
                }
            }

            if (!customerId) break;

            await pool.query(
                `INSERT INTO invoices (id, business_id, customer_id, invoice_number, date, due_date, subtotal, tax, total, status, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    businessId,
                    customerId,
                    invoiceNumber,
                    record.date || null,
                    record.due_date || null,
                    subtotal, tax, total,
                    record.status || "draft",
                    record.notes || null,
                    createdBy
                ]
            );
            inserted = true;
            break;
        }

        case "appointments":
            await pool.query(
                `INSERT INTO appointments (id, business_id, title, date, start_time, end_time, status, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    businessId,
                    record.title || null,
                    record.date || null,
                    record.start_time || null,
                    record.end_time || null,
                    record.status || null,
                    record.notes || null,
                    createdBy
                ]
            );
            inserted = true;
            break;

        case "business_services":
            await pool.query(
                `INSERT INTO business_services (id, business_id, name, description, category, duration_minutes, price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    businessId,
                    record.name || null,
                    record.description || null,
                    record.category || null,
                    record.duration_minutes != null ? parseInt(record.duration_minutes) : null,
                    record.price != null ? parseFloat(record.price) : null
                ]
            );
            inserted = true;
            break;

        default:
            throw new Error(`Unsupported table: ${table}`);
    }

    return inserted;
}

router.post("/", upload.single("file"), async (req, res) => {
    console.log("AI IMPORT ROUTE HIT");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const userId = req.user.userId;
    const businessId = req.user.businessId;

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = req.file.path;
    const rows = sheetToJson(filePath);
    fs.unlinkSync(filePath);

    if (!rows || rows.length === 0) {
        return res.status(400).json({ error: "Empty spreadsheet." });
    }

    const schemaDescriptions = Object.entries(TABLE_SCHEMAS).map(([tbl, def]) =>
        `- "${tbl}": fields ${JSON.stringify(def.fields)}\n  Example record: ${JSON.stringify(def.example)}`
    ).join("\n");

    const prompt = `
You are a data importer. Analyze the spreadsheet sample and map it to the most appropriate table below.

Supported tables:
${schemaDescriptions}

Rules:
- Choose exactly ONE table that best matches the data
- Map spreadsheet columns to the matching fields for that table
- Set "id" to null for every record
- Do not include fields that are not listed for the chosen table
- Return ONLY a JSON object with this exact structure:

{
  "table": "<table_name>",
  "records": [ { ...fields... } ]
}

Spreadsheet sample (first rows):
${JSON.stringify(rows.slice(0, 10), null, 2)}
`;

    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You output only pure JSON. Never return text outside the JSON object."
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    let raw = completion.choices[0].message.content;
    console.log("AI RAW CONTENT:", raw);

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        return res.status(400).json({ error: "AI returned invalid JSON.", raw });
    }

    const { table, records } = parsed;

    if (!TABLE_SCHEMAS[table]) {
        return res.status(400).json({
            error: `AI chose unsupported table: "${table}". Supported: ${Object.keys(TABLE_SCHEMAS).join(", ")}`
        });
    }

    let inserted = 0;
    const errors = [];
    const unmatchedCustomers = [];

    for (const record of records) {
        try {
            const wasInserted = await insertRecord(table, record, userId, businessId, unmatchedCustomers);
            if (wasInserted) inserted++;
        } catch (err) {
            console.error("Insert error:", err.sqlMessage || err.message);
            errors.push(err.sqlMessage || err.message);
        }
    }

    let message = `Imported ${inserted} record(s) into "${table}"`;
    if (unmatchedCustomers.length > 0) {
        message += `. ${unmatchedCustomers.length} invoice(s) could not be matched to a customer`;
    }

    return res.json({
        message,
        table,
        inserted,
        attempted: records.length,
        ...(unmatchedCustomers.length > 0 && { unmatchedCustomers }),
        ...(errors.length > 0 && { errors })
    });
});

export default router;
