import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, PencilLine, Users, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const THRESHOLD_1099 = 600;

const EMPTY = { contractor_name: "", tin: "", w9_on_file: false, total_paid: "", tax_year: new Date().getFullYear(), notes: "" };

function StatusBadge({ contractor }) {
  if (!contractor.w9_on_file) {
    return (
      <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Missing W-9
      </span>
    );
  }
  if (contractor.requires_1099) {
    return (
      <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Needs 1099 Review
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      OK
    </span>
  );
}

export default function TaxContractorPanel({ taxYear }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, tax_year: taxYear });
  const queryClient = useQueryClient();

  const { data: contractors = [] } = useQuery({
    queryKey: ["tax-contractors", taxYear],
    queryFn: () => Tax.getContractors(taxYear),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries(["tax-contractors"]);
    queryClient.invalidateQueries(["tax-dashboard"]);
  };

  const create = useMutation({
    mutationFn: (d) => Tax.createContractor(d),
    onSuccess: () => { invalidate(); setShowForm(false); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Contractor added."); },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => Tax.updateContractor(id, data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); toast.success("Contractor updated."); },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id) => Tax.deleteContractor(id),
    onSuccess: () => { invalidate(); toast.success("Contractor removed."); },
    onError: (e) => toast.error(e.message),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEdit = (c) => {
    setEditId(c.id);
    setForm({ contractor_name: c.contractor_name || "", tin: c.tin || "", w9_on_file: !!c.w9_on_file, total_paid: c.total_paid || "", tax_year: c.tax_year || taxYear, notes: c.notes || "" });
    setShowForm(true);
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.contractor_name || !form.total_paid) return toast.error("Name and amount are required.");
    if (editId) update.mutate({ id: editId, data: form });
    else create.mutate(form);
  };

  const needsReview = contractors.filter(c => !c.w9_on_file || c.requires_1099).length;
  const totalPaid = contractors.reduce((s, c) => s + parseFloat(c.total_paid || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40">
            <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">1099 Contractor Tracking</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {contractors.length} contractor{contractors.length !== 1 ? "s" : ""} · ${totalPaid.toFixed(2)} total paid
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {needsReview > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
              {needsReview} need review
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* 1099 info banner */}
          <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>1099-NEC Threshold:</strong> Contractors paid ${THRESHOLD_1099}+ in a calendar year generally require a 1099-NEC. Ensure W-9 forms are on file before year-end.
            </p>
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mx-5 mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit Contractor" : "Add Contractor"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Contractor Name *</Label>
                  <Input value={form.contractor_name} onChange={e => set("contractor_name", e.target.value)} placeholder="Full legal name or business name" required className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Total Paid ($) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.total_paid} onChange={e => set("total_paid", e.target.value)} placeholder="0.00" required className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">TIN / EIN / SSN (last 4 placeholder)</Label>
                  <Input value={form.tin} onChange={e => set("tin", e.target.value)} placeholder="e.g., ****1234" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <Label className="text-sm cursor-pointer">W-9 Form on File</Label>
                  <Switch checked={form.w9_on_file} onCheckedChange={val => set("w9_on_file", val)} />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                  {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add Contractor"}
                </Button>
                <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear }); }}>Cancel</Button>
              </div>
            </form>
          )}

          {!showForm && (
            <div className="px-5 mt-4">
              <Button onClick={() => setShowForm(true)} variant="outline" className="flex items-center gap-2 text-sm border-dashed border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                <Plus className="w-4 h-4" />
                Add Contractor
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="px-5 pb-5 mt-3">
            {contractors.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No contractors recorded for {taxYear}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["Contractor", "TIN", "Total Paid", "W-9", "Status", ""].map((h, i) => (
                        <th key={i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4 ${i === 2 || i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contractors.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{c.contractor_name}</td>
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs">{c.tin || "—"}</td>
                        <td className={`py-2 pr-4 text-right font-semibold ${parseFloat(c.total_paid) >= THRESHOLD_1099 ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-gray-200"}`}>
                          ${parseFloat(c.total_paid || 0).toFixed(2)}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {c.w9_on_file
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                            : <AlertTriangle className="w-4 h-4 text-red-500 inline" />}
                        </td>
                        <td className="py-2 pr-4"><StatusBadge contractor={c} /></td>
                        <td className="py-2">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"><PencilLine className="w-3.5 h-3.5" /></button>
                            <button onClick={() => window.confirm("Remove contractor?") && remove.mutate(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
