import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Trash2, PencilLine, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_TYPES = [
  { value: "federal_estimated", label: "Federal Estimated Tax", level: "federal" },
  { value: "federal_income",    label: "Federal Income Tax",    level: "federal" },
  { value: "federal_se",        label: "Self-Employment Tax",   level: "federal" },
  { value: "state_estimated",   label: "State Estimated Tax",   level: "state"   },
  { value: "state_income",      label: "State Income Tax",      level: "state"   },
  { value: "sales_tax",         label: "Sales Tax Remittance",  level: "state"   },
  { value: "payroll_fica",      label: "Payroll FICA Deposit",  level: "federal" },
  { value: "payroll_futa",      label: "FUTA Payment",          level: "federal" },
  { value: "payroll_suta",      label: "State Unemployment (SUI)", level: "state" },
  { value: "local",             label: "Local Tax Payment",     level: "local"   },
  { value: "other",             label: "Other Tax Payment",     level: "federal" },
];

const STATUS_CONFIG = {
  pending:  { icon: Clock,         color: "text-amber-500",   bg: "bg-amber-100 dark:bg-amber-900/30",     label: "Scheduled" },
  paid:     { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Paid"      },
  overdue:  { icon: AlertTriangle, color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30",         label: "Overdue"   },
  waived:   { icon: CheckCircle2,  color: "text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",          label: "Waived"    },
  adjusted: { icon: PencilLine,    color: "text-blue-500",    bg: "bg-blue-100 dark:bg-blue-900/30",       label: "Adjusted"  },
};

const LEVEL_COLORS = {
  federal: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  state:   "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  local:   "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
};

const EMPTY = { payment_type: "", payment_level: "federal", state_code: "", amount: "",
                payment_date: "", period_start: "", period_end: "", tax_year: new Date().getFullYear(),
                quarter: "", status: "pending", confirmation_number: "", payment_method: "", notes: "" };

function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0); }

export default function TaxPaymentTracker({ taxYear }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, tax_year: taxYear });
  const [filter, setFilter] = useState("All");
  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ["tax-payments", taxYear],
    queryFn: () => Tax.getPayments(taxYear),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["tax-payments"]);
    queryClient.invalidateQueries(["tax-dashboard"]);
  };

  const create = useMutation({ mutationFn: Tax.createPayment, onSuccess: () => { invalidate(); setShowForm(false); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Payment logged."); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, d }) => Tax.updatePayment(id, d), onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Payment updated."); }, onError: e => toast.error(e.message) });
  const remove = useMutation({ mutationFn: Tax.deletePayment, onSuccess: () => { invalidate(); toast.success("Payment removed."); }, onError: e => toast.error(e.message) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ payment_type: p.payment_type || "", payment_level: p.payment_level || "federal",
      state_code: p.state_code || "", amount: p.amount || "", payment_date: p.payment_date?.split("T")[0] || "",
      period_start: p.period_start?.split("T")[0] || "", period_end: p.period_end?.split("T")[0] || "",
      tax_year: p.tax_year || taxYear, quarter: p.quarter || "",
      status: p.status || "pending", confirmation_number: p.confirmation_number || "",
      payment_method: p.payment_method || "", notes: p.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.payment_type || !form.amount) return toast.error("Payment type and amount required.");
    const ptype = PAYMENT_TYPES.find(t => t.value === form.payment_type);
    const data = { ...form, payment_level: ptype?.level || form.payment_level };
    if (editId) update.mutate({ id: editId, d: data });
    else create.mutate(data);
  };

  const filtered = filter === "All" ? payments : payments.filter(p => p.status === filter);
  const totalPaid    = payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === "overdue").reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Payment Ledger</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track all tax payments, deposits, and remittances</p>
        </div>
      </div>

      <div className="p-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
            <p className="text-xs text-gray-500 mb-1">Paid</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
            <p className="text-xs text-gray-500 mb-1">Scheduled</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(totalPending)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
            <p className="text-xs text-gray-500 mb-1">Overdue</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(totalOverdue)}</p>
          </div>
        </div>

        {/* Filter + Add */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {["All", "pending", "paid", "overdue"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border ${filter === s ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"}`}>
              {s === "All" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
          <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); }}
            variant="outline" className="ml-auto flex items-center gap-1.5 text-xs border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400">
            <Plus className="w-3.5 h-3.5" /> Log Payment
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit Payment" : "Log Tax Payment"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Payment Type *</Label>
                <select value={form.payment_type} onChange={e => set("payment_type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100" required>
                  <option value="">Select type...</option>
                  {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Amount ($) *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" required className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Payment Date</Label>
                <Input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Quarter</Label>
                <select value={form.quarter} onChange={e => set("quarter", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  <option value="">Annual / Other</option>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Payment Method</Label>
                <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  <option value="">Select...</option>
                  {["EFTPS", "ACH", "Check", "Online Portal", "Card", "Other"].map(m => <option key={m} value={m.toLowerCase().replace(" ", "_")}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Confirmation / Reference Number</Label>
                <Input value={form.confirmation_number} onChange={e => set("confirmation_number", e.target.value)} placeholder="IRS EFT confirmation, check number, etc." className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">State (if applicable)</Label>
                <Input value={form.state_code} onChange={e => set("state_code", e.target.value.toUpperCase())} placeholder="e.g., CA" maxLength={2} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                {create.isPending || update.isPending ? "Saving..." : editId ? "Update Payment" : "Log Payment"}
              </Button>
              <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); }}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Payment list */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tax payments recorded for {taxYear}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Type", "Amount", "Date", "Q", "Status", "Conf. #", ""].map((h, i) => (
                    <th key={i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3 ${i >= 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const ptype = PAYMENT_TYPES.find(t => t.value === p.payment_type);
                  const sconf = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  const StatusIcon = sconf.icon;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 pr-3">
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{ptype?.label || p.payment_type}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${LEVEL_COLORS[p.payment_level] || LEVEL_COLORS.federal}`}>{p.payment_level}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(p.amount)}</td>
                      <td className="py-2 pr-3 text-right text-gray-500 text-xs whitespace-nowrap">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-3 text-right text-gray-500 text-xs">{p.quarter ? `Q${p.quarter}` : "—"}</td>
                      <td className="py-2 pr-3 text-right">
                        <span className={`flex items-center justify-end gap-1 text-xs px-1.5 py-0.5 rounded-full ${sconf.bg} ${sconf.color}`}>
                          <StatusIcon className="w-3 h-3" />{sconf.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-xs text-gray-400 truncate max-w-[100px]">{p.confirmation_number || "—"}</td>
                      <td className="py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleEdit(p)} className="p-1 text-gray-400 hover:text-indigo-600"><PencilLine className="w-3.5 h-3.5" /></button>
                          <button onClick={() => window.confirm("Remove payment record?") && remove.mutate(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
