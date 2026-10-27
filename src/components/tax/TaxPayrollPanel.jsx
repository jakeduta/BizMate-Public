import React, { useState } from "react";
import { Users, Clock, DollarSign, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function StatCard({ label, value, sub, color = "indigo" }) {
  const colors = {
    indigo:  "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
    amber:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    rose:    "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300",
  };
  return (
    <div className={`p-4 rounded-lg ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function TaxPayrollPanel({ data, profile }) {
  const [open, setOpen] = useState(false);

  const { payroll } = data || {};
  const enabled = profile?.payroll_enabled;

  const SS_WAGE_BASE = 176100;
  const employeeSSRate    = 0.062;
  const employeeMedRate   = 0.0145;
  const employerSSRate    = 0.062;
  const employerMedRate   = 0.0145;

  const wages = payroll?.estimatedWages || 0;
  const employeeCount = payroll?.employeeCount || 0;
  const totalHours = payroll?.totalHours || 0;

  const wagesForSS = Math.min(wages, SS_WAGE_BASE);
  const employeeFICA = (wagesForSS * employeeSSRate) + (wages * employeeMedRate);
  const employerFICA = (wagesForSS * employerSSRate) + (wages * employerMedRate);
  const totalFICA = employeeFICA + employerFICA;

  if (!enabled) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payroll Tax Engine</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enable payroll tracking in your tax profile</p>
          </div>
          <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">Disabled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payroll Tax Engine</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {employeeCount} employee{employeeCount !== 1 ? "s" : ""} · {totalHours.toFixed(0)} total hours
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">{fmt(payroll?.payrollTaxLiability)} est. liability</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-5">
          {employeeCount === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No employee records found</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Add employees in the Employees tab to enable payroll tax calculations.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <StatCard label="Employees" value={employeeCount} sub="Active records" color="indigo" />
                <StatCard label="Total Hours" value={`${totalHours.toFixed(0)}h`} sub="From clock-ins" color="emerald" />
                <StatCard label="Est. Wages" value={fmt(wages)} sub="Based on hours × rates" color="amber" />
                <StatCard label="Employer FICA" value={fmt(employerFICA)} sub="7.65% employer share" color="rose" />
              </div>

              {/* Breakdown */}
              <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">FICA Tax Breakdown</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: "Estimated Wages", value: fmt(wages), sub: "Based on clock-in hours × avg hourly rate" },
                    { label: "Employee SS (6.2%)", value: fmt(wagesForSS * employeeSSRate), sub: `On $${Math.min(wages, SS_WAGE_BASE).toFixed(0)} (SS wage base: $${SS_WAGE_BASE.toLocaleString()})` },
                    { label: "Employee Medicare (1.45%)", value: fmt(wages * employeeMedRate), sub: "On all wages" },
                    { label: "Employer SS (6.2%)", value: fmt(wagesForSS * employerSSRate), sub: "Employer's matching contribution" },
                    { label: "Employer Medicare (1.45%)", value: fmt(wages * employerMedRate), sub: "Employer's matching contribution" },
                    { label: "Total FICA (both sides)", value: fmt(totalFICA), highlight: true },
                  ].map((row, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${row.highlight ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}>
                      <div>
                        <p className={`text-sm ${row.highlight ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>{row.label}</p>
                        {row.sub && <p className="text-xs text-gray-400">{row.sub}</p>}
                      </div>
                      <p className={`text-sm font-semibold ${row.highlight ? "text-indigo-600 dark:text-indigo-400" : "text-gray-800 dark:text-gray-200"}`}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* State payroll note */}
              {data.stateRules && (
                <div className="mt-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>{data.stateRules.name}</strong> new employer SUI (unemployment) base rate: approx.{" "}
                    <strong>varies</strong>. Check with your state workforce agency for exact rates. FUTA: 6% on first $7,000 wages per employee (0.6% after state credit).
                  </p>
                </div>
              )}

              {/* W-2 placeholder */}
              <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-center">
                <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">W-2 Preparation (Coming Soon)</p>
                <p className="text-xs text-gray-400 mt-1">Full W-2 generation workflow will be available in a future update. Export payroll summary now using the Reports tab.</p>
              </div>
            </>
          )}

          <p className="text-xs text-gray-400 italic mt-4">
            Payroll estimates are based on clock-in data and hourly rates in employee records. Actual payroll obligations depend on exact salary agreements, benefits, and state requirements. Consult a payroll specialist.
          </p>
        </div>
      )}
    </div>
  );
}
