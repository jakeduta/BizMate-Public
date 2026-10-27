import React from "react";
import {
  DollarSign, TrendingDown, AlertTriangle, CheckCircle2,
  Calendar, Building2, FileText, ShieldCheck, Percent
} from "lucide-react";

function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtPct(n) {
  if (!n) return "0%";
  return `${n.toFixed(1)}%`;
}

function Card({ icon: Icon, label, value, sub, color = "indigo", alert = false }) {
  const colorMap = {
    indigo:  { bg: "bg-indigo-100 dark:bg-indigo-900/40",  text: "text-indigo-600 dark:text-indigo-400"  },
    emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
    amber:   { bg: "bg-amber-100 dark:bg-amber-900/40",    text: "text-amber-600 dark:text-amber-400"    },
    red:     { bg: "bg-red-100 dark:bg-red-900/40",        text: "text-red-600 dark:text-red-400"        },
    purple:  { bg: "bg-purple-100 dark:bg-purple-900/40",  text: "text-purple-600 dark:text-purple-400"  },
    sky:     { bg: "bg-sky-100 dark:bg-sky-900/40",        text: "text-sky-600 dark:text-sky-400"        },
    rose:    { bg: "bg-rose-100 dark:bg-rose-900/40",      text: "text-rose-600 dark:text-rose-400"      },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-xl border ${alert ? "border-amber-400 dark:border-amber-500" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        {alert && <AlertTriangle className="w-4 h-4 text-amber-500" />}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function TaxDashboardCards({ data }) {
  if (!data) return null;

  const { federalEstimates, stateTaxEstimate, netIncome, revenue, payroll, readinessScore, alerts, deadlines } = data;

  const nextDeadline = deadlines?.find(d => d.severity === "due_soon" || d.severity === "upcoming");
  const overdueCount = deadlines?.filter(d => d.severity === "overdue").length || 0;
  const alertCount = alerts?.length || 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <Card
        icon={DollarSign}
        label="Est. Federal Tax"
        value={fmt(federalEstimates?.totalFederalTax)}
        sub={`Inc. tax + SE tax · ${fmtPct(federalEstimates?.effectiveRate)} eff. rate`}
        color="indigo"
      />
      <Card
        icon={Building2}
        label="Est. State Tax"
        value={fmt(stateTaxEstimate)}
        sub={data.stateCode ? `${data.stateCode} estimated` : "No state selected"}
        color="purple"
        alert={!data.stateCode}
      />
      <Card
        icon={Percent}
        label="Est. Self-Emp. Tax"
        value={fmt(federalEstimates?.selfEmploymentTax)}
        sub="15.3% on net SE income"
        color="sky"
      />
      <Card
        icon={TrendingDown}
        label="Net Taxable Income"
        value={fmt(netIncome)}
        sub="Revenue minus deductions"
        color="emerald"
      />
      <Card
        icon={DollarSign}
        label="Deductible Expenses"
        value={fmt(data.expenses?.deductibleExpenses)}
        sub="Manual entries recorded"
        color="emerald"
      />
      <Card
        icon={DollarSign}
        label="Sales Tax Collected"
        value={fmt(revenue?.salesTaxCollected)}
        sub={`$${(revenue?.salesTaxDue || 0).toFixed(2)} estimated due`}
        color={revenue?.salesTaxDue > 0 ? "amber" : "emerald"}
        alert={revenue?.salesTaxDue > 0}
      />
      <Card
        icon={DollarSign}
        label="Est. Payroll Tax"
        value={fmt(payroll?.payrollTaxLiability)}
        sub={`${payroll?.employeeCount || 0} employee(s) · ${payroll?.totalHours?.toFixed(0) || 0} hrs`}
        color="rose"
      />
      <Card
        icon={Calendar}
        label="Next Tax Deadline"
        value={nextDeadline ? new Date(nextDeadline.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
        sub={nextDeadline?.label || "No upcoming deadlines"}
        color={overdueCount > 0 ? "red" : "amber"}
        alert={overdueCount > 0}
      />
      <Card
        icon={ShieldCheck}
        label="Tax Readiness"
        value={`${readinessScore?.score || 0}%`}
        sub={readinessScore?.label || "Incomplete"}
        color={readinessScore?.score >= 80 ? "emerald" : readinessScore?.score >= 50 ? "amber" : "red"}
      />
      <Card
        icon={AlertTriangle}
        label="Compliance Alerts"
        value={alertCount}
        sub={overdueCount > 0 ? `${overdueCount} overdue deadline(s)` : alertCount === 0 ? "All clear" : "Review needed"}
        color={alertCount === 0 ? "emerald" : "red"}
        alert={alertCount > 0}
      />
    </div>
  );
}
