import { pool } from "../db.js";

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d) {
    return d.toISOString().slice(0, 10);
}

function getPeriodRange(period) {
    const now  = new Date();
    const y    = now.getFullYear();
    const m    = now.getMonth();
    const d    = now.getDate();
    const dow  = now.getDay(); // 0 = Sunday

    switch (period) {
        case "last_week": {
            const end   = new Date(y, m, d - dow - 1);
            const start = new Date(y, m, d - dow - 7);
            return { start: toDateStr(start), end: toDateStr(end) };
        }
        case "this_month":
            return { start: toDateStr(new Date(y, m, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
        case "last_month":
            return { start: toDateStr(new Date(y, m - 1, 1)), end: toDateStr(new Date(y, m, 0)) };
        case "last_3_months":
            return { start: toDateStr(new Date(y, m - 3, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
        case "last_6_months":
            return { start: toDateStr(new Date(y, m - 6, 1)), end: toDateStr(new Date(y, m + 1, 0)) };
        case "this_year":
            return { start: toDateStr(new Date(y, 0, 1)), end: toDateStr(new Date(y, 11, 31)) };
        case "this_week":
        default: {
            const start = new Date(y, m, d - dow);
            const end   = new Date(y, m, d - dow + 6);
            return { start: toDateStr(start), end: toDateStr(end) };
        }
    }
}

// ── Intent handlers ───────────────────────────────────────────────────────────

async function employeeHoursQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_week");

    const [rows] = await pool.query(
        `SELECT
             e.name                          AS employee,
             ROUND(SUM(c.hours_worked), 2)   AS total_hours,
             COUNT(*)                         AS shifts
         FROM clockins c
         JOIN employees e ON c.employee_id = e.id
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY e.id, e.name
         ORDER BY total_hours DESC`,
        [start, end]
    );

    const totalHours = rows.reduce((s, r) => s + Number(r.total_hours), 0);

    return {
        chartType: "bar",
        dataKeys: ["Hours"],
        data: rows.map(r => ({ name: r.employee, Hours: Number(r.total_hours), Shifts: r.shifts })),
        kpis: [
            { label: "Total Hours",        value: totalHours.toFixed(1), unit: "hrs" },
            { label: "Employees Tracked",  value: rows.length },
            { label: "Period",             value: `${start} → ${end}` },
        ],
    };
}

async function topWorkersQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [rows] = await pool.query(
        `SELECT
             e.name                                            AS employee,
             e.role                                            AS job_role,
             e.hourly_rate,
             ROUND(SUM(c.hours_worked), 2)                    AS total_hours,
             COUNT(*)                                          AS shift_count,
             ROUND(SUM(c.hours_worked) * e.hourly_rate, 2)    AS estimated_pay
         FROM clockins c
         JOIN employees e ON c.employee_id = e.id
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY e.id, e.name, e.role, e.hourly_rate
         ORDER BY total_hours DESC
         LIMIT 10`,
        [start, end]
    );

    return {
        chartType: "bar",
        dataKeys: ["Hours"],
        data: rows.map(r => ({
            name:   r.employee,
            Hours:  Number(r.total_hours),
            Shifts: r.shift_count,
        })),
        kpis: [
            { label: "Top Employee",     value: rows[0]?.employee ?? "N/A" },
            { label: "Top Hours",        value: rows[0] ? `${rows[0].total_hours} hrs` : "N/A" },
            { label: "Employees Ranked", value: rows.length },
        ],
        tableData: rows.map((r, i) => ({
            Rank:       i + 1,
            Employee:   r.employee,
            Role:       r.job_role,
            Hours:      Number(r.total_hours),
            Shifts:     r.shift_count,
            "Est. Pay": `$${Number(r.estimated_pay).toFixed(2)}`,
        })),
    };
}

async function laborCostsQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [rows] = await pool.query(
        `SELECT
             e.name                                            AS employee,
             e.hourly_rate,
             ROUND(SUM(c.hours_worked), 2)                    AS total_hours,
             ROUND(SUM(c.hours_worked) * e.hourly_rate, 2)    AS labor_cost
         FROM clockins c
         JOIN employees e ON c.employee_id = e.id
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY e.id, e.name, e.hourly_rate
         ORDER BY labor_cost DESC`,
        [start, end]
    );

    const totalCost  = rows.reduce((s, r) => s + Number(r.labor_cost), 0);
    const totalHours = rows.reduce((s, r) => s + Number(r.total_hours), 0);
    const avgRate    = totalHours > 0 ? (totalCost / totalHours).toFixed(2) : "N/A";

    return {
        chartType: "bar",
        dataKeys: ["Cost ($)"],
        data: rows.map(r => ({
            name:    r.employee,
            "Cost ($)": Number(r.labor_cost),
            Hours:   Number(r.total_hours),
        })),
        kpis: [
            { label: "Total Labor Cost", value: `$${totalCost.toFixed(2)}` },
            { label: "Total Hours",      value: `${totalHours.toFixed(1)} hrs` },
            { label: "Avg Eff. Rate",    value: avgRate === "N/A" ? "N/A" : `$${avgRate}/hr` },
        ],
    };
}

async function payrollSummaryQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [rows] = await pool.query(
        `SELECT
             YEARWEEK(c.clock_in_time, 1)                              AS week_key,
             MIN(DATE(c.clock_in_time))                                 AS week_start,
             ROUND(SUM(c.hours_worked), 2)                             AS total_hours,
             ROUND(SUM(c.hours_worked * e.hourly_rate), 2)             AS payroll_total,
             COUNT(DISTINCT c.employee_id)                              AS employees_active
         FROM clockins c
         JOIN employees e ON c.employee_id = e.id
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY YEARWEEK(c.clock_in_time, 1)
         ORDER BY week_key ASC`,
        [start, end]
    );

    const totalPayroll = rows.reduce((s, r) => s + Number(r.payroll_total), 0);

    return {
        chartType: "bar",
        dataKeys: ["Payroll ($)"],
        data: rows.map(r => ({
            name:        String(r.week_start),
            "Payroll ($)": Number(r.payroll_total),
            Hours:       Number(r.total_hours),
            Employees:   r.employees_active,
        })),
        kpis: [
            { label: "Total Payroll",  value: `$${totalPayroll.toFixed(2)}` },
            { label: "Pay Periods",    value: rows.length },
            { label: "Period",         value: `${start} → ${end}` },
        ],
    };
}

async function revenueOverviewQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [[payments]] = await pool.query(
        `SELECT
             COALESCE(SUM(p.amount), 0)  AS total_revenue,
             COUNT(p.id)                 AS payment_count
         FROM payments p
         JOIN invoices i ON p.invoice_id = i.id
         WHERE p.date BETWEEN ? AND ?`,
        [start, end]
    );

    const [[outstanding]] = await pool.query(
        `SELECT
             COALESCE(SUM(GREATEST(total - paid_amount, 0)), 0) AS outstanding
         FROM invoices
         WHERE LOWER(status) IN ('overdue', 'sent')`
    );

    const [[newInv]] = await pool.query(
        `SELECT
             COUNT(*)                    AS new_invoices,
             COALESCE(SUM(total), 0)     AS new_total
         FROM invoices
         WHERE date BETWEEN ? AND ?`,
        [start, end]
    );

    return {
        chartType: "kpi",
        data: [],
        kpis: [
            { label: "Revenue Collected",  value: `$${Number(payments.total_revenue).toFixed(2)}` },
            { label: "Payments Made",      value: payments.payment_count },
            { label: "Outstanding Balance", value: `$${Number(outstanding.outstanding).toFixed(2)}` },
            { label: "New Invoices",       value: newInv.new_invoices },
            { label: "New Invoice Total",  value: `$${Number(newInv.new_total).toFixed(2)}` },
        ],
    };
}

async function invoiceStatusQuery(businessId) {
    const [rows] = await pool.query(
        `SELECT
             status,
             COUNT(*)                                          AS invoice_count,
             ROUND(SUM(total), 2)                             AS total_amount,
             ROUND(SUM(GREATEST(total - paid_amount, 0)), 2)  AS outstanding
         FROM invoices
         GROUP BY status
         ORDER BY total_amount DESC`
    );

    const totalCount       = rows.reduce((s, r) => s + r.invoice_count, 0);
    const totalAmount      = rows.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding), 0);

    return {
        chartType: "pie",
        dataKeys: ["value"],
        data: rows.map(r => ({
            name:   r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "Unknown",
            value:  r.invoice_count,
            amount: Number(r.total_amount ?? 0),
        })),
        kpis: [
            { label: "Total Invoices",  value: totalCount },
            { label: "Total Value",     value: `$${totalAmount.toFixed(2)}` },
            { label: "Outstanding",     value: `$${totalOutstanding.toFixed(2)}` },
        ],
    };
}

async function appointmentSummaryQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [rows] = await pool.query(
        `SELECT
             s.name                           AS service,
             COUNT(a.id)                      AS appointment_count,
             ROUND(SUM(s.price), 2)           AS potential_revenue
         FROM appointments a
         JOIN business_services s ON a.service_id = s.id
         WHERE a.date BETWEEN ? AND ?
         GROUP BY s.id, s.name
         ORDER BY appointment_count DESC`,
        [start, end]
    );

    const totalAppts   = rows.reduce((s, r) => s + r.appointment_count, 0);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.potential_revenue), 0);

    return {
        chartType: rows.length > 0 ? "bar" : "kpi",
        dataKeys: ["Appointments"],
        data: rows.map(r => ({
            name:          r.service,
            Appointments:  r.appointment_count,
            "Revenue ($)": Number(r.potential_revenue),
        })),
        kpis: [
            { label: "Total Appointments",  value: totalAppts },
            { label: "Services Booked",     value: rows.length },
            { label: "Potential Revenue",   value: `$${totalRevenue.toFixed(2)}` },
        ],
    };
}

async function staffingTrendsQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_year");

    const [rows] = await pool.query(
        `SELECT
             DATE_FORMAT(c.clock_in_time, '%Y-%m')     AS month,
             COUNT(DISTINCT c.employee_id)              AS active_employees,
             ROUND(SUM(c.hours_worked), 2)             AS total_hours,
             COUNT(*)                                   AS total_shifts
         FROM clockins c
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY DATE_FORMAT(c.clock_in_time, '%Y-%m')
         ORDER BY month ASC`,
        [start, end]
    );

    const totalHours = rows.reduce((s, r) => s + Number(r.total_hours), 0);

    return {
        chartType: "line",
        dataKeys: ["Active Employees", "Total Hours"],
        data: rows.map(r => ({
            name:               r.month,
            "Active Employees": r.active_employees,
            "Total Hours":      Number(r.total_hours),
            Shifts:             r.total_shifts,
        })),
        kpis: [
            { label: "Months Tracked",       value: rows.length },
            { label: "Total Hours (period)", value: `${totalHours.toFixed(1)} hrs` },
        ],
    };
}

async function customerMetricsQuery(businessId) {
    const [[total]] = await pool.query(
        `SELECT COUNT(*) AS total FROM customers`
    );

    const [[recent]] = await pool.query(
        `SELECT COUNT(*) AS new_this_month
         FROM customers
         WHERE created_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    );

    const [monthly] = await pool.query(
        `SELECT
             DATE_FORMAT(created_date, '%Y-%m') AS month,
             COUNT(*)                            AS new_customers
         FROM customers
         WHERE created_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(created_date, '%Y-%m')
         ORDER BY month ASC`
    );

    return {
        chartType: monthly.length > 1 ? "bar" : "kpi",
        dataKeys: ["New Customers"],
        data: monthly.map(r => ({ name: r.month, "New Customers": r.new_customers })),
        kpis: [
            { label: "Total Customers",  value: total.total },
            { label: "New This Month",   value: recent.new_this_month },
        ],
    };
}

async function weeklyHoursChartQuery(businessId, period) {
    const { start, end } = getPeriodRange(period || "this_month");

    const [rows] = await pool.query(
        `SELECT
             e.name                                                                    AS employee,
             DATE_FORMAT(
                 DATE_SUB(DATE(c.clock_in_time),
                     INTERVAL WEEKDAY(c.clock_in_time) DAY),
                 '%Y-%m-%d')                                                          AS week_start,
             ROUND(SUM(c.hours_worked), 2)                                           AS hours
         FROM clockins c
         JOIN employees e ON c.employee_id = e.id
         WHERE c.clock_out_time IS NOT NULL
           AND DATE(c.clock_in_time) BETWEEN ? AND ?
         GROUP BY e.id, e.name,
                  DATE_FORMAT(DATE_SUB(DATE(c.clock_in_time), INTERVAL WEEKDAY(c.clock_in_time) DAY), '%Y-%m-%d')
         ORDER BY week_start ASC, hours DESC`,
        [start, end]
    );

    // Pivot: rows become { name: week_start, [employee]: hours, ... }
    const weeks     = [...new Set(rows.map(r => r.week_start))];
    const employees = [...new Set(rows.map(r => r.employee))];

    const pivoted = weeks.map(week => {
        const entry = { name: week };
        for (const emp of employees) {
            const row    = rows.find(r => r.week_start === week && r.employee === emp);
            entry[emp]   = row ? Number(row.hours) : 0;
        }
        return entry;
    });

    return {
        chartType: "bar",
        dataKeys: employees,
        data: pivoted,
        kpis: [
            { label: "Weeks",      value: weeks.length },
            { label: "Employees",  value: employees.length },
        ],
    };
}

async function monthlyRevenueTrendQuery(businessId) {
    const [rows] = await pool.query(
        `SELECT
             DATE_FORMAT(p.date, '%Y-%m')    AS month,
             ROUND(SUM(p.amount), 2)         AS revenue,
             COUNT(p.id)                     AS payment_count
         FROM payments p
         WHERE p.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(p.date, '%Y-%m')
         ORDER BY month ASC`
    );

    const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
    const avgMonthly   = rows.length ? (totalRevenue / rows.length).toFixed(2) : "0.00";

    return {
        chartType: "line",
        dataKeys: ["Revenue ($)"],
        data: rows.map(r => ({
            name:        r.month,
            "Revenue ($)": Number(r.revenue),
            Payments:    r.payment_count,
        })),
        kpis: [
            { label: "Total Revenue (12mo)", value: `$${totalRevenue.toFixed(2)}` },
            { label: "Monthly Average",      value: `$${avgMonthly}` },
            { label: "Months With Data",     value: rows.length },
        ],
    };
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

/**
 * Run a safe, predefined analytics query for the given intent.
 * All queries are parameterized and scoped by businessId.
 * Returns { chartType, dataKeys, data, kpis, tableData? }
 */
export async function runAnalyticsQuery(intent, period, groupBy, businessId) {
    switch (intent) {
        case "employee_hours_weekly":    return employeeHoursQuery(businessId, period ?? "this_week");
        case "employee_hours_monthly":   return employeeHoursQuery(businessId, period ?? "this_month");
        case "top_workers":              return topWorkersQuery(businessId, period);
        case "labor_costs":              return laborCostsQuery(businessId, period);
        case "payroll_summary":          return payrollSummaryQuery(businessId, period);
        case "revenue_overview":         return revenueOverviewQuery(businessId, period);
        case "invoice_status_breakdown": return invoiceStatusQuery(businessId);
        case "appointment_summary":      return appointmentSummaryQuery(businessId, period);
        case "staffing_trends":          return staffingTrendsQuery(businessId, period);
        case "customer_metrics":         return customerMetricsQuery(businessId);
        case "weekly_hours_chart":       return weeklyHoursChartQuery(businessId, period);
        case "monthly_revenue_trend":    return monthlyRevenueTrendQuery(businessId);
        default:                         return revenueOverviewQuery(businessId, period);
    }
}
