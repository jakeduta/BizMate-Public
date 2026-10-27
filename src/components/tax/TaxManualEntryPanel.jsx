import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, PencilLine, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "rent",               label: "Rent / Lease" },
  { value: "utilities",          label: "Utilities" },
  { value: "insurance",          label: "Business Insurance" },
  { value: "loan_interest",      label: "Loan Interest" },
  { value: "equipment",          label: "Equipment / Assets" },
  { value: "home_office",        label: "Home Office Expense" },
  { value: "mileage",            label: "Mileage / Vehicle" },
  { value: "contractor",         label: "Contractor Payment" },
  { value: "owner_draw",         label: "Owner Draw / Distribution" },
  { value: "estimated_payment",  label: "Estimated Tax Payment Made" },
  { value: "sales_tax_remitted", label: "Sales Tax Already Remitted" },
  { value: "subscriptions",      label: "Software / Subscriptions" },
  { value: "marketing",          label: "Marketing / Advertising" },
  { value: "professional_fees",  label: "Professional / Legal Fees" },
  { value: "meals",              label: "Business Meals (50% deductible)" },
  { value: "travel",             label: "Business Travel" },
  { value: "supplies",           label: "Office Supplies" },
  { value: "other",              label: "Other Deductible Expense" },
];

const EMPTY_FORM = {
  category: "",
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  tax_year: new Date().getFullYear(),
  is_deductible: true,
  notes: "",
};

export default function TaxManualEntryPanel({ taxYear }) {
  const [open, setOpen]         = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM, tax_year: taxYear });
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ["tax-manual-entries", taxYear],
    queryFn: () => Tax.getManualEntries(taxYear),
    select: (data) => Array.isArray(data) ? data : [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["tax-manual-entries"]);
    queryClient.invalidateQueries(["tax-dashboard"]);
  };

  const create = useMutation({
    mutationFn: (data) => Tax.createManualEntry(data),
    onSuccess: () => { invalidate(); setShowForm(false); setForm({ ...EMPTY_FORM, tax_year: taxYear }); toast.success("Expense entry added."); },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => Tax.updateManualEntry(id, data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM, tax_year: taxYear }); toast.success("Entry updated."); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => Tax.deleteManualEntry(id),
    onSuccess: () => { invalidate(); toast.success("Entry removed."); },
    onError: (e) => toast.error(e.message),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEdit = (entry) => {
    setEditId(entry.id);
    setForm({
      category: entry.category || "",
      description: entry.description || "",
      amount: entry.amount || "",
      date: entry.date?.split("T")[0] || "",
      tax_year: entry.tax_year || taxYear,
      is_deductible: entry.is_deductible !== false,
      notes: entry.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category || !form.amount) return toast.error("Category and amount are required.");
    if (editId) {
      update.mutate({ id: editId, data: form });
    } else {
      create.mutate(form);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_FORM, tax_year: taxYear });
  };

  const totalDeductions = entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <PencilLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Manual Tax Entries</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Expenses, deductions &amp; payments not in other modules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            ${totalDeductions.toFixed(2)} total
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Entry Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                {editId ? "Edit Entry" : "Add New Entry"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Category *</Label>
                  <select
                    value={form.category}
                    onChange={e => set("category", e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => set("amount", e.target.value)}
                    placeholder="0.00"
                    required
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => set("date", e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    placeholder="Brief description of expense"
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Tax Year</Label>
                  <select
                    value={form.tax_year}
                    onChange={e => set("tax_year", parseInt(e.target.value))}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100"
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                  {create.isPending || update.isPending ? "Saving..." : editId ? "Update Entry" : "Add Entry"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="text-sm">Cancel</Button>
              </div>
            </form>
          )}

          {/* Add button */}
          {!showForm && (
            <div className="px-5 pt-4">
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                className="flex items-center gap-2 text-sm border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                <Plus className="w-4 h-4" />
                Add Expense / Deduction
              </Button>
            </div>
          )}

          {/* Entries table */}
          <div className="px-5 pb-5 mt-3">
            {entries.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <PencilLine className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No manual entries yet.</p>
                <p className="text-xs text-gray-400 mt-1">Add expenses, deductions, and payments that aren't tracked in other modules.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4">Category</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4">Description</th>
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4">Date</th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4">Amount</th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const cat = CATEGORIES.find(c => c.value === entry.category);
                      return (
                        <tr key={entry.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-2 pr-4">
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                              {cat?.label || entry.category}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                            {entry.description || "—"}
                          </td>
                          <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                            {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2 pr-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                            ${parseFloat(entry.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                              >
                                <PencilLine className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => window.confirm("Remove this entry?") && remove.mutate(entry.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={3} className="py-2 pr-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Total Deductions
                      </td>
                      <td className="py-2 pr-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ${totalDeductions.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
