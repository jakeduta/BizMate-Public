import nodemailer from "nodemailer";

/**
 * Returns a configured nodemailer transporter, or null if SMTP is not configured.
 */
function createTransporter() {
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    const port   = parseInt(process.env.SMTP_PORT  || "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    return nodemailer.createTransport({
        host:   SMTP_HOST,
        port,
        secure,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
}

/**
 * Send an email. Swallows errors so callers never fail due to email issues.
 *
 * @param {string} to      Recipient address
 * @param {string} subject Email subject
 * @param {string} html    HTML body
 * @returns {Promise<{sent: boolean, skipped?: string, error?: string}>}
 */
export async function sendEmail(to, subject, html) {
    if (!to || !to.includes("@")) {
        console.log(`[Email] Skipped — no valid address (to=${to})`);
        return { sent: false, skipped: "no_email" };
    }

    const transporter = createTransporter();
    if (!transporter) {
        console.log("[Email] Skipped — SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)");
        return { sent: false, skipped: "no_smtp_config" };
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
        await transporter.sendMail({ from, to, subject, html });
        console.log(`[Email] Sent "${subject}" → ${to}`);
        return { sent: true };
    } catch (err) {
        console.error(`[Email] Failed to send "${subject}" → ${to}:`, err.message);
        return { sent: false, error: err.message };
    }
}
