import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Trash2, PencilLine, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

const ENTITY_CONFIG = {
  sole_prop:   { label: "Sole Proprietor",    detailType: "owner",       showK1: false, showSalary: false },
  single_llc:  { label: "Single-Member LLC",  detailType: "owner",       showK1: false, showSalary: false },
  multi_llc:   { label: "Multi-Member LLC",   detailType: "partner",     showK1: true,  showSalary: true  },
  partnership: { label: "Partnership",        detailType: "partner",     showK1: true,  showSalary: true  },
  s_corp:      { label: "S-Corporation",      detailType: "shareholder", showK1: true,  showSalary: true  },
  c_corp:      { label: "C-Corporation",      detailType: "officer",     showK1: false, showSalary: true  },
};

const EMPTY = { detail_type: "partner", name: "", ownership_pct: "", tax_year: new Date().getFullYear(),
                compensation: "", distributions: "", k1_issued: false, basis_amount: "", ssn_last4: "", notes: "" };

function fmt(n) { return n ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n) : "—"; }

// Entity-specific guidance
const ENTITY_GUIDANCE = {
  sole_prop: [
    { title: "Schedule C", msg: "Report all business income and expenses on Schedule C of your personal 1040." },
    { title: "Self-Employment Tax", msg: "Pay 15.3% SE tax on 92.35% of net profit. Deduct half on Form 1040." },
    { title: "Owner Draws", msg: "Draws from the business are not salary and not deductible. Track separately." },
    { title: "Quarterly Payments", msg: "Make estimated tax payments to avoid underpayment penalties." },
  ],
  single_llc: [
    { title: "Default Taxation", msg: "Single-member LLCs are disregarded entities — taxed like a sole proprietor on Schedule C." },
    { title: "Electing Corp Status", msg: "You may elect S-Corp or C-Corp taxation for the LLC. Consult your CPA." },
    { title: "SE Tax Applies", msg: "Self-employment tax (15.3%) applies unless S-Corp election is in place." },
  ],
  multi_llc: [
    { title: "Partnership Return", msg: "File Form 1065. Each partner receives a K-1 showing their share of income/loss." },
    { title: "Guaranteed Payments", msg: "Payments to partners for services are deductible to the partnership but taxable to the partner." },
    { title: "Basis Tracking", msg: "Each partner must track their outside basis to determine deductibility of losses." },
    { title: "K-1 Distribution", msg: "K-1s must be distributed to partners by March 15 (or extended deadline)." },
  ],
  partnership: [
    { title: "Form 1065", msg: "Partnership files Form 1065 information return — no entity-level income tax." },
    { title: "K-1 to Each Partner", msg: "Partners report their allocated share of income/loss on personal returns." },
    { title: "Ownership Percentage", msg: "Track each partner's ownership % as it affects income allocation and distributions." },
  ],
  s_corp: [
    { title: "Form 1120-S", msg: "S-Corp files Form 1120-S. Shareholders receive K-1s for pass-through income." },
    { title: "Reasonable Salary", msg: "Shareholder-employees must receive a reasonable salary before taking distributions. IRS scrutinizes this." },
    { title: "Distributions vs. Salary", msg: "Salary is subject to payroll taxes. Distributions are not (up to basis). Balance matters." },
    { title: "Shareholder Basis", msg: "Track each shareholder's stock and debt basis — losses deductible only to extent of basis." },
  ],
  c_corp: [
    { title: "Form 1120", msg: "C-Corp files Form 1120 and pays 21% flat federal corporate income tax." },
    { title: "Double Taxation Risk", msg: "Dividends paid to shareholders are taxed again at individual level. Plan carefully." },
    { title: "Officer Compensation", msg: "Salary to officer-employees is deductible. Must be reasonable for services rendered." },
    { title: "Retained Earnings", msg: "C-Corps can retain earnings in the business without immediate individual tax." },
  ],
};

export default function TaxEntityPanel({ taxYear, profile }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, tax_year: taxYear });
  const queryClient = useQueryClient();

  const entityType = profile?.entity_type;
  const config = ENTITY_CONFIG[entityType] || { label: "Not configured", detailType: "partner", showK1: false, showSalary: false };
  const guidance = ENTITY_GUIDANCE[entityType] || [];

  const { data: details = [] } = useQuery({
    queryKey: ["tax-entity-details", taxYear],
    queryFn: () => Tax.getEntityDetails(taxYear),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => queryClient.invalidateQueries(["tax-entity-details"]);

  const create = useMutation({ mutationFn: Tax.createEntityDetail, onSuccess: () => { invalidate(); setShowForm(false); setForm({ ...EMPTY, tax_year: taxYear, detail_type: config.detailType }); toast.success("Added."); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, d }) => Tax.updateEntityDetail(id, d), onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear, detail_type: config.detailType }); toast.success("Updated."); }, onError: e => toast.error(e.message) });
  const remove = useMutation({ mutationFn: Tax.deleteEntityDetail, onSuccess: () => { invalidate(); toast.success("Removed."); }, onError: e => toast.error(e.message) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleEdit = (d) => {
    setEditId(d.id);
    setForm({ detail_type: d.detail_type || config.detailType, name: d.name || "",
      ownership_pct: d.ownership_pct || "", tax_year: d.tax_year || taxYear,
      compensation: d.compensation || "", distributions: d.distributions || "",
      k1_issued: !!d.k1_issued, basis_amount: d.basis_amount || "",
      ssn_last4: d.ssn_last4 || "", notes: d.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return toast.error("Name required.");
    if (editId) update.mutate({ id: editId, d: form });
    else create.mutate({ ...form, detail_type: config.detailType });
  };

  const totalOwnership = details.reduce((s, d) => s + parseFloat(d.ownership_pct || 0), 0);
  const totalComp      = details.reduce((s, d) => s + parseFloat(d.compensation || 0), 0);
  const totalDist      = details.reduce((s, d) => s + parseFloat(d.distributions || 0), 0);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
          <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Entity-Specific Tax Panel</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{config.label} · Partners, shareholders &amp; officers</p>
        </div>
        {totalOwnership > 0 && (
          <span className={`ml-auto text-xs rounded-full px-2 py-0.5 ${totalOwnership === 100 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"}`}>
            {totalOwnership.toFixed(1)}% ownership tracked
          </span>
        )}
      </div>

      <div className="p-5">
        {!entityType ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Configure your business entity type in the Tax Profile tab.
          </div>
        ) : (
          <>
            {/* Entity guidance */}
            {guidance.length > 0 && (
              <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guidance.map((g, i) => (
                  <div key={i} className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex gap-2">
                      <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200">{g.title}</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">{g.msg}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {details.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                  <p className="text-xs text-gray-500 mb-1">{config.label}s</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{details.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                  <p className="text-xs text-gray-500 mb-1">Compensation</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(totalComp)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                  <p className="text-xs text-gray-500 mb-1">Distributions</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(totalDist)}</p>
                </div>
              </div>
            )}

            {/* Add button */}
            <div className="flex mb-4">
              <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY, tax_year: taxYear, detail_type: config.detailType }); }}
                variant="outline" className="flex items-center gap-1.5 text-xs border-dashed border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400">
                <Plus className="w-3.5 h-3.5" /> Add {config.detailType.charAt(0).toUpperCase() + config.detailType.slice(1)}
              </Button>
            </div>

            {/* Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit" : "Add"} {config.detailType.charAt(0).toUpperCase() + config.detailType.slice(1)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label className="text-xs">Full Legal Name *</Label>
                    <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" required className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Ownership % </Label>
                    <Input type="number" step="0.001" min="0" max="100" value={form.ownership_pct} onChange={e => set("ownership_pct", e.target.value)} placeholder="e.g., 50.000" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  {config.showSalary && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Compensation / Salary ($)</Label>
                      <Input type="number" step="0.01" value={form.compensation} onChange={e => set("compensation", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Distributions / Draws ($)</Label>
                    <Input type="number" step="0.01" value={form.distributions} onChange={e => set("distributions", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Basis Amount (placeholder)</Label>
                    <Input type="number" step="0.01" value={form.basis_amount} onChange={e => set("basis_amount", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">SSN / TIN (last 4 only)</Label>
                    <Input value={form.ssn_last4} onChange={e => set("ssn_last4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="####" maxLength={4} className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  {config.showK1 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <Label className="text-sm cursor-pointer">K-1 Issued</Label>
                      <Switch checked={!!form.k1_issued} onCheckedChange={v => set("k1_issued", v)} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                    {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add"}
                  </Button>
                  <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
                </div>
              </form>
            )}

            {/* Detail list */}
            {details.length === 0 && !showForm ? (
              <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No {config.detailType}s tracked for {taxYear}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["Name", "Ownership", "Compensation", "Distributions", config.showK1 ? "K-1" : "", ""].filter(Boolean).map((h, i) => (
                        <th key={i} className={`text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3 ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {details.map(d => (
                      <tr key={d.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{d.name}</td>
                        <td className="py-2 pr-3 text-right text-gray-600 dark:text-gray-400">{d.ownership_pct ? `${parseFloat(d.ownership_pct).toFixed(1)}%` : "—"}</td>
                        <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{fmt(d.compensation)}</td>
                        <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{fmt(d.distributions)}</td>
                        {config.showK1 && (
                          <td className="py-2 pr-3 text-right">{d.k1_issued ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" /> : <AlertCircle className="w-4 h-4 text-amber-400 inline" />}</td>
                        )}
                        <td className="py-2">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => handleEdit(d)} className="p-1 text-gray-400 hover:text-indigo-600"><PencilLine className="w-3.5 h-3.5" /></button>
                            <button onClick={() => window.confirm("Remove?") && remove.mutate(d.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-400 italic mt-4">
              Ownership percentages, basis amounts, and compensation figures are placeholders for planning. Verify all figures with your CPA before filing.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
