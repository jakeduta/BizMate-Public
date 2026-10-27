import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Trash2, PencilLine, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

const ADJ_TYPES = [
  { value: "nondeductible_expense",    label: "Nondeductible Expense",           description: "Expenses that are book costs but not tax-deductible" },
  { value: "meals_limitation",         label: "Meals Limitation (50%)",           description: "Only 50% of business meals are deductible for tax" },
  { value: "depreciation",            label: "Depreciation vs. Expensing",       description: "GAAP depreciation vs. Sec. 179 / bonus depreciation" },
  { value: "owner_distribution",      label: "Owner Distribution / Draw",        description: "Not deductible for income tax (differs from salary)" },
  { value: "guaranteed_payment",      label: "Guaranteed Payment (Partnership)", description: "Partners' guaranteed payments — deductible to partnership" },
  { value: "carryforward",           label: "Prior-Year Loss Carryforward",      description: "NOL or other losses carried forward from prior year" },
  { value: "overpayment_carryover",  label: "Estimated Tax Overpayment",         description: "Prior-year overpayment applied to current year" },
  { value: "basis_adjustment",       label: "Shareholder / Partner Basis",       description: "Basis adjustments affecting deductibility of losses" },
  { value: "business_use_pct",       label: "Business-Use Percentage",           description: "Mixed-use asset — only business % is deductible" },
  { value: "personal_mixed_use",     label: "Personal vs. Business Mixed Use",   description: "Personal portion of mixed expenses is not deductible" },
  { value: "m1_adjustment",          label: "M-1 Style Adjustment",              description: "Book-to-tax reconciliation item (C-Corp / S-Corp)" },
  { value: "other",                  label: "Other Adjustment",                  description: "Other book-to-tax difference" },
];

const EMPTY = { adjustment_type: "", description: "", book_amount: "", tax_amount: "", tax_year: new Date().getFullYear(), requires_review: false, notes: "" };

function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0); }

export default function TaxBookAdjustments({ taxYear }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, tax_year: taxYear });
  const queryClient = useQueryClient();

  const { data: adjustments = [] } = useQuery({
    queryKey: ["tax-book-adjustments", taxYear],
    queryFn: () => Tax.getBookAdjustments(taxYear),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["tax-book-adjustments"]);
    queryClient.invalidateQueries(["tax-dashboard"]);
  };

  const create = useMutation({ mutationFn: Tax.createBookAdjustment, onSuccess: () => { invalidate(); setShowForm(false); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Adjustment added."); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, d }) => Tax.updateBookAdjustment(id, d), onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Adjustment updated."); }, onError: e => toast.error(e.message) });
  const remove = useMutation({ mutationFn: Tax.deleteBookAdjustment, onSuccess: () => { invalidate(); toast.success("Adjustment removed."); }, onError: e => toast.error(e.message) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleEdit = (a) => {
    setEditId(a.id);
    setForm({ adjustment_type: a.adjustment_type || "", description: a.description || "",
      book_amount: a.book_amount || "", tax_amount: a.tax_amount || "",
      tax_year: a.tax_year || taxYear, requires_review: !!a.requires_review, notes: a.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.adjustment_type || !form.description) return toast.error("Type and description required.");
    if (editId) update.mutate({ id: editId, d: form });
    else create.mutate(form);
  };

  const totalNetAdj = adjustments.reduce((s, a) => s + (parseFloat(a.tax_amount || 0) - parseFloat(a.book_amount || 0)), 0);
  const reviewCount = adjustments.filter(a => a.requires_review).length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
          <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Book-to-Tax Adjustments</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Reconcile bookkeeping totals with tax-reportable amounts</p>
        </div>
        <div className="ml-auto flex gap-2">
          {reviewCount > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5">{reviewCount} need review</span>}
          {adjustments.length > 0 && (
            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${totalNetAdj < 0 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
              Net adj: {fmt(totalNetAdj)}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Info banner */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Advanced section.</strong> Book-to-tax adjustments reconcile your accounting records with your taxable income. These differ when tax law treats items differently than GAAP. Consult your CPA for exact amounts.
            </p>
          </div>
        </div>

        <div className="flex mb-4">
          <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); }}
            variant="outline" className="flex items-center gap-1.5 text-xs border-dashed border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400">
            <Plus className="w-3.5 h-3.5" /> Add Adjustment
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit Adjustment" : "Add Book-to-Tax Adjustment"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Adjustment Type *</Label>
                <select value={form.adjustment_type} onChange={e => { set("adjustment_type", e.target.value); const t = ADJ_TYPES.find(a => a.value === e.target.value); if (t && !form.description) set("description", t.label); }}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100" required>
                  <option value="">Select type...</option>
                  {ADJ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {form.adjustment_type && (
                  <p className="text-xs text-gray-400">{ADJ_TYPES.find(t => t.value === form.adjustment_type)?.description}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Description *</Label>
                <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe this adjustment" required className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Book Amount ($)</Label>
                <Input type="number" step="0.01" value={form.book_amount} onChange={e => set("book_amount", e.target.value)} placeholder="As recorded in books" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tax Amount ($)</Label>
                <Input type="number" step="0.01" value={form.tax_amount} onChange={e => set("tax_amount", e.target.value)} placeholder="As reportable for tax" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              {(form.book_amount && form.tax_amount) && (
                <div className="sm:col-span-2 text-xs text-gray-600 dark:text-gray-400">
                  Net adjustment: <strong className={parseFloat(form.tax_amount) < parseFloat(form.book_amount) ? "text-emerald-600" : "text-amber-600"}>
                    {fmt(parseFloat(form.tax_amount || 0) - parseFloat(form.book_amount || 0))}
                  </strong>
                  {" "}({parseFloat(form.tax_amount) < parseFloat(form.book_amount) ? "reduces taxable income" : "increases taxable income"})
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Label className="text-sm cursor-pointer">Requires CPA Review</Label>
                <Switch checked={!!form.requires_review} onCheckedChange={v => set("requires_review", v)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add Adjustment"}
              </Button>
              <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); }}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Adjustments table */}
        {adjustments.length === 0 && !showForm ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No book-to-tax adjustments recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Type", "Description", "Book Amount", "Tax Amount", "Adjustment", ""].map((h, i) => (
                    <th key={i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3 ${i >= 2 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjustments.map(a => {
                  const net = parseFloat(a.tax_amount || 0) - parseFloat(a.book_amount || 0);
                  const type = ADJ_TYPES.find(t => t.value === a.adjustment_type);
                  return (
                    <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          {a.requires_review && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">{type?.label || a.adjustment_type}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{a.description}</td>
                      <td className="py-2 pr-3 text-right text-gray-600 dark:text-gray-400">{fmt(a.book_amount)}</td>
                      <td className="py-2 pr-3 text-right text-gray-900 dark:text-gray-100 font-medium">{fmt(a.tax_amount)}</td>
                      <td className={`py-2 pr-3 text-right font-semibold ${net < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {net >= 0 ? "+" : ""}{fmt(net)}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handleEdit(a)} className="p-1 text-gray-400 hover:text-indigo-600"><PencilLine className="w-3.5 h-3.5" /></button>
                          <button onClick={() => window.confirm("Remove adjustment?") && remove.mutate(a.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {adjustments.length > 0 && (
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                    <td colSpan={4} className="py-2 pr-3 text-xs text-gray-600 dark:text-gray-400">Net Book-to-Tax Adjustment</td>
                    <td className={`py-2 pr-3 text-right ${totalNetAdj < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{totalNetAdj >= 0 ? "+" : ""}{fmt(totalNetAdj)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-400 italic mt-4">
          These adjustments are estimations only. Your CPA must verify and finalize all book-to-tax reconciliations before filing.
        </p>
      </div>
    </div>
  );
}
