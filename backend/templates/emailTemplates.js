/**
 * Shared email templates for BizMate customer notifications.
 */

const baseStyle = `
  font-family: Arial, sans-serif;
  color: #222;
  background: #f9f9f9;
  padding: 32px;
`;

const cardStyle = `
  background: #fff;
  border-radius: 8px;
  padding: 28px 32px;
  max-width: 560px;
  margin: 0 auto;
  border: 1px solid #e5e7eb;
`;

const labelStyle = `color: #6b7280; font-size: 13px; margin: 0;`;
const valueStyle = `font-size: 15px; font-weight: 600; margin: 2px 0 12px;`;
const dividerStyle = `border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;`;
const badgeStyle = (bg, color) =>
    `display:inline-block; padding: 3px 10px; border-radius: 999px; font-size:12px; font-weight:600; background:${bg}; color:${color};`;

/**
 * Invoice Created email
 *
 * @param {object} p
 * @param {string} p.customerName
 * @param {string} p.businessName
 * @param {string} p.invoiceNumber
 * @param {string} p.invoiceDate      formatted date string
 * @param {string} p.dueDate          formatted date string
 * @param {string|number} p.total
 * @param {string} [p.invoiceLink]
 */
export function invoiceCreatedHtml(p) {
    const linkRow = p.invoiceLink
        ? `<p style="margin-top:20px;">
             <a href="${p.invoiceLink}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
               View Invoice
             </a>
           </p>`
        : "";

    return `
<div style="${baseStyle}">
  <div style="${cardStyle}">
    <h2 style="margin:0 0 4px; font-size:20px;">New Invoice</h2>
    <p style="margin:0 0 20px; color:#6b7280; font-size:14px;">
      ${p.businessName} has sent you an invoice.
    </p>
    <hr style="${dividerStyle}" />

    <p style="${labelStyle}">Customer</p>
    <p style="${valueStyle}">${p.customerName}</p>

    <p style="${labelStyle}">Invoice Number</p>
    <p style="${valueStyle}">${p.invoiceNumber}</p>

    <p style="${labelStyle}">Invoice Date</p>
    <p style="${valueStyle}">${p.invoiceDate}</p>

    <p style="${labelStyle}">Due Date</p>
    <p style="${valueStyle}">${p.dueDate}</p>

    <p style="${labelStyle}">Total Amount</p>
    <p style="font-size:22px; font-weight:700; color:#2563eb; margin: 2px 0 12px;">
      $${Number(p.total).toFixed(2)}
    </p>

    ${linkRow}

    <hr style="${dividerStyle}" />
    <p style="font-size:12px; color:#9ca3af; margin:0;">
      This is an automated message from ${p.businessName} via BizMate.
    </p>
  </div>
</div>`.trim();
}

/**
 * Payment Received email
 *
 * @param {object} p
 * @param {string} p.customerName
 * @param {string} p.businessName
 * @param {string} p.invoiceNumber
 * @param {string} p.paymentDate      formatted date string
 * @param {string|number} p.amount    payment amount
 * @param {string|number} p.invoiceTotal
 * @param {string|number} p.paidAmount total paid so far (including this payment)
 * @param {boolean} p.paidInFull
 */
export function paymentReceivedHtml(p) {
    const remaining = Math.max(0, Number(p.invoiceTotal) - Number(p.paidAmount));

    const statusBadge = p.paidInFull
        ? `<span style="${badgeStyle("#dcfce7", "#16a34a")}">Paid in Full</span>`
        : `<span style="${badgeStyle("#fef9c3", "#b45309")}">Partial Payment</span>`;

    return `
<div style="${baseStyle}">
  <div style="${cardStyle}">
    <h2 style="margin:0 0 4px; font-size:20px;">Payment Received</h2>
    <p style="margin:0 0 4px; color:#6b7280; font-size:14px;">
      ${p.businessName} has recorded a payment for invoice ${p.invoiceNumber}.
    </p>
    <p style="margin:0 0 20px;">${statusBadge}</p>
    <hr style="${dividerStyle}" />

    <p style="${labelStyle}">Customer</p>
    <p style="${valueStyle}">${p.customerName}</p>

    <p style="${labelStyle}">Invoice Number</p>
    <p style="${valueStyle}">${p.invoiceNumber}</p>

    <p style="${labelStyle}">Payment Date</p>
    <p style="${valueStyle}">${p.paymentDate}</p>

    <p style="${labelStyle}">Amount Paid (This Payment)</p>
    <p style="font-size:22px; font-weight:700; color:#16a34a; margin: 2px 0 12px;">
      $${Number(p.amount).toFixed(2)}
    </p>

    <p style="${labelStyle}">Invoice Total</p>
    <p style="${valueStyle}">$${Number(p.invoiceTotal).toFixed(2)}</p>

    <p style="${labelStyle}">Total Paid</p>
    <p style="${valueStyle}">$${Number(p.paidAmount).toFixed(2)}</p>

    ${!p.paidInFull ? `
    <p style="${labelStyle}">Remaining Balance</p>
    <p style="${valueStyle}; color:#b45309;">$${remaining.toFixed(2)}</p>
    ` : ""}

    <hr style="${dividerStyle}" />
    <p style="font-size:12px; color:#9ca3af; margin:0;">
      This is an automated message from ${p.businessName} via BizMate.
    </p>
  </div>
</div>`.trim();
}
