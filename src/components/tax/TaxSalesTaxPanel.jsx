import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const EMPTY = {
  period_start: "",
  period_end: "",
  taxable_revenue: "",
  non_taxable_revenue: "",
  sales_tax_collected: "",
  sales_tax_remitted: "",
  state_code: "",
  notes: "",
};

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

export default function TaxSalesTaxPanel({ data, taxYear, profile }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const { data: summaries = [] } = useQuery({
    queryKey: ["tax-sales-summaries", taxYear],
    queryFn: () => Tax.getSalesSummaries(taxYear),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const create = useMutation({
    mutationFn: (d) => Tax.createSalesSummary(d),
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-sales-summaries"]);
      queryClient.invalidateQueries(["tax-dashboard"]);
      setShowForm(false);
      setForm(EMPTY);
      toast.success("Sales tax summary added.");
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const totalCollected = summaries.reduce((s, r) => s + parseFloat(r.sales_tax_collected || 0), 0);
  const totalRemitted  = summaries.reduce((s, r) => s + parseFloat(r.sales_tax_remitted || 0), 0);
  const totalDue       = Math.max(0, totalCollected - totalRemitted);

  // Also include from invoice-synced data
  const invoiceCollected = data?.revenue?.salesTaxCollected || 0;

  if (!profile?.sales_tax_enabled) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Tax Engine</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enable sales tax in your tax profile to activate</p>
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
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Tax Engine</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Collections, remittances &amp; outstanding balances</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalDue > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
              {fmt(totalDue)} due
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tax Collected</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(invoiceCollected || totalCollected)}</p>
              <p className="text-xs text-gray-400">From invoices + manual</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Already Remitted</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalRemitted)}</p>
              <p className="text-xs text-gray-400">Paid to state</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${totalDue > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Still Due</p>
              <p className={`text-lg font-bold ${totalDue > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {fmt(totalDue)}
              </p>
              <p className="text-xs text-gray-400">{totalDue > 0 ? "Needs remittance" : "All clear"}</p>
            </div>
          </div>

          {/* State rate info */}
          {data?.stateRules?.hasSalesTax && (
            <div className="mx-5 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>{data.stateRules.name}</strong> state base sales tax rate:{" "}
                <strong>{(data.stateRules.salesTaxRate * 100).toFixed(3)}%</strong>.{" "}
                {data.stateRules.servicesSubjectToSalesTax
                  ? "Services generally taxable in this state."
                  : "Most services are exempt in this state."}{" "}
                Local rates may apply additionally.
              </p>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
              className="mx-5 mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Add Sales Tax Period</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Period Start</Label>
                  <Input type="date" value={form.period_start} onChange={e => set("period_start", e.target.value)} required className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Period End</Label>
                  <Input type="date" value={form.period_end} onChange={e => set("period_end", e.target.value)} required className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Sales Tax Collected ($)</Label>
                  <Input type="number" step="0.01" value={form.sales_tax_collected} onChange={e => set("sales_tax_collected", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Sales Tax Remitted ($)</Label>
                  <Input type="number" step="0.01" value={form.sales_tax_remitted} onChange={e => set("sales_tax_remitted", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Taxable Revenue ($)</Label>
                  <Input type="number" step="0.01" value={form.taxable_revenue} onChange={e => set("taxable_revenue", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Non-Taxable Revenue ($)</Label>
                  <Input type="number" step="0.01" value={form.non_taxable_revenue} onChange={e => set("non_taxable_revenue", e.target.value)} placeholder="0.00" className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button type="submit" disabled={create.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                  {create.isPending ? "Saving..." : "Add Period"}
                </Button>
                <Button type="button" variant="outline" className="text-sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {!showForm && (
            <div className="px-5 mt-4">
              <Button onClick={() => setShowForm(true)} variant="outline" className="flex items-center gap-2 text-sm border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                <Plus className="w-4 h-4" />
                Add Sales Tax Period
              </Button>
            </div>
          )}

          {/* Period table */}
          <div className="px-5 pb-5 mt-3">
            {summaries.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <Receipt className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No sales tax periods recorded.</p>
                <p className="text-xs text-gray-400 mt-1">Track your monthly or quarterly sales tax collections here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {["Period", "Taxable Rev.", "Tax Collected", "Remitted", "Balance"].map((h, i) => (
                        <th key={i} className="text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-3 text-right first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s, i) => {
                      const bal = parseFloat(s.sales_tax_collected || 0) - parseFloat(s.sales_tax_remitted || 0);
                      return (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 text-xs">
                            {new Date(s.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                            {new Date(s.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{fmt(s.taxable_revenue)}</td>
                          <td className="py-2 pr-3 text-right text-gray-900 dark:text-gray-100 font-medium">{fmt(s.sales_tax_collected)}</td>
                          <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(s.sales_tax_remitted)}</td>
                          <td className={`py-2 text-right font-semibold ${bal > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {fmt(bal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 pb-4">
            <p className="text-xs text-gray-400 italic">Sales tax rates and taxability vary by state and product/service type. Verify with your state revenue department.</p>
          </div>
        </div>
      )}
    </div>
  );
}
