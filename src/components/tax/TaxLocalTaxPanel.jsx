import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapPin, Plus, Trash2, PencilLine, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TAX_TYPES = [
  { value: "city_income",        label: "City Income Tax" },
  { value: "county_income",      label: "County Income Tax" },
  { value: "city_sales",         label: "City Sales Tax" },
  { value: "county_sales",       label: "County Sales Tax" },
  { value: "local_business",     label: "Local Business Tax / License Fee" },
  { value: "occupational",       label: "Occupational Tax / Privilege Tax" },
  { value: "payroll_local",      label: "Local Payroll Tax" },
  { value: "gross_receipts",     label: "Gross Receipts Tax" },
  { value: "excise_local",       label: "Local Excise Tax" },
  { value: "other",              label: "Other Local Tax" },
];

const FREQ_OPTIONS = [
  { value: "monthly",    label: "Monthly" },
  { value: "quarterly",  label: "Quarterly" },
  { value: "annual",     label: "Annual" },
  { value: "as_needed",  label: "As Needed" },
];

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const EMPTY = {
  jurisdiction_name: "", jurisdiction_type: "city", state_code: "", tax_type: "",
  tax_rate: "", flat_amount: "", applies_to: "", filing_frequency: "quarterly",
  account_number: "", next_due_date: "", is_active: true, notes: "",
};

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
}

function LocalTaxCard({ config, onEdit, onDelete }) {
  const type = TAX_TYPES.find(t => t.value === config.tax_type);
  const isOverdue = config.next_due_date && new Date(config.next_due_date) < new Date();
  const isDueSoon = config.next_due_date && !isOverdue &&
    new Date(config.next_due_date) < new Date(Date.now() + 14 * 86400000);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      isOverdue ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10" :
      isDueSoon ? "border-amber-300 dark:border-amber-700" :
      "border-gray-100 dark:border-gray-800"
    } hover:bg-gray-50 dark:hover:bg-gray-800/30`}>
      <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${
        isOverdue ? "text-red-500" : isDueSoon ? "text-amber-500" : "text-indigo-400"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{config.jurisdiction_name}</p>
          {config.state_code && <span className="text-xs text-gray-400">{config.state_code}</span>}
          {!config.is_active && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 rounded">Inactive</span>
          )}
          {isOverdue && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 rounded">Overdue</span>}
          {isDueSoon && <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 rounded">Due Soon</span>}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {type?.label || config.tax_type}
          {config.tax_rate ? ` · ${parseFloat(config.tax_rate).toFixed(3)}%` : ""}
          {config.flat_amount ? ` · ${fmt(config.flat_amount)} flat` : ""}
          {config.applies_to ? ` · on ${config.applies_to}` : ""}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {config.filing_frequency && (
            <span className="text-xs text-gray-400 capitalize">{config.filing_frequency}</span>
          )}
          {config.next_due_date && (
            <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              Due: {new Date(config.next_due_date).toLocaleDateString()}
            </span>
          )}
          {config.account_number && (
            <span className="text-xs text-gray-400">Acct: {config.account_number}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(config)} className="p-1 text-gray-400 hover:text-indigo-600"><PencilLine className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(config.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function TaxLocalTaxPanel() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterActive, setFilterActive] = useState("all");
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ["tax-local-config"],
    queryFn: () => Tax.getLocalConfig(),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => queryClient.invalidateQueries(["tax-local-config"]);

  const create = useMutation({
    mutationFn: Tax.createLocalConfig,
    onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); toast.success("Local tax added."); },
    onError: e => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, d }) => Tax.updateLocalConfig(id, d),
    onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm(EMPTY); toast.success("Local tax updated."); },
    onError: e => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: Tax.deleteLocalConfig,
    onSuccess: () => { invalidate(); toast.success("Local tax removed."); },
    onError: e => toast.error(e.message),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleEdit = (c) => {
    setEditId(c.id);
    setForm({
      jurisdiction_name: c.jurisdiction_name || "", jurisdiction_type: c.jurisdiction_type || "city",
      state_code: c.state_code || "", tax_type: c.tax_type || "", tax_rate: c.tax_rate || "",
      flat_amount: c.flat_amount || "", applies_to: c.applies_to || "",
      filing_frequency: c.filing_frequency || "quarterly", account_number: c.account_number || "",
      next_due_date: c.next_due_date?.split("T")[0] || "", is_active: !!c.is_active, notes: c.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.jurisdiction_name || !form.tax_type) return toast.error("Jurisdiction name and tax type required.");
    if (editId) update.mutate({ id: editId, d: form });
    else create.mutate(form);
  };

  const filtered = configs.filter(c => {
    if (filterActive === "active") return c.is_active;
    if (filterActive === "inactive") return !c.is_active;
    if (filterActive === "overdue") return c.next_due_date && new Date(c.next_due_date) < new Date();
    return true;
  });

  const overdueCount = configs.filter(c => c.next_due_date && new Date(c.next_due_date) < new Date() && c.is_active).length;
  const activeCount = configs.filter(c => c.is_active).length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40">
          <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Local Tax Configuration</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">City, county, and municipality tax exposure</p>
        </div>
        <div className="ml-auto flex gap-2">
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5">
              {overdueCount} overdue
            </span>
          )}
          {activeCount > 0 && (
            <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full px-2 py-0.5">
              {activeCount} tracked
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Info */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Local tax varies widely.</strong> Cities like New York City, Philadelphia, and Columbus impose
              local income or payroll taxes. Many states have county sales tax add-ons. Add any local jurisdictions
              where your business has a tax obligation. Verify rates with your CPA or local tax authority.
            </p>
          </div>
        </div>

        {/* Common examples callout */}
        {configs.length === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Common local taxes to check:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {[
                "NYC City Income Tax (NY)",
                "Philadelphia Wage Tax (PA)",
                "Columbus City Income Tax (OH)",
                "Detroit City Income Tax (MI)",
                "San Francisco Gross Receipts Tax (CA)",
                "Denver Occupational Privilege Tax (CO)",
              ].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {["all", "active", "inactive", "overdue"].map(f => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors capitalize ${
                filterActive === f
                  ? "bg-teal-600 text-white border-teal-600"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}>
              {f === "all" ? "All" : f}
            </button>
          ))}
          <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY); }}
            variant="outline" className="ml-auto flex items-center gap-1.5 text-xs border-dashed border-teal-300 dark:border-teal-700 text-teal-600 dark:text-teal-400">
            <Plus className="w-3.5 h-3.5" /> Add Local Tax
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              {editId ? "Edit Local Tax" : "Add Local Tax"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Jurisdiction Name *</Label>
                <Input value={form.jurisdiction_name} onChange={e => set("jurisdiction_name", e.target.value)}
                  placeholder="e.g., City of Philadelphia" required className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Jurisdiction Type</Label>
                <select value={form.jurisdiction_type} onChange={e => set("jurisdiction_type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  {["city", "county", "municipality", "district", "borough", "township"].map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">State</Label>
                <select value={form.state_code} onChange={e => set("state_code", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  <option value="">Select state...</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tax Type *</Label>
                <select value={form.tax_type} onChange={e => set("tax_type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100" required>
                  <option value="">Select type...</option>
                  {TAX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input type="number" step="0.001" min="0" value={form.tax_rate} onChange={e => set("tax_rate", e.target.value)}
                  placeholder="e.g., 3.75" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Flat Annual Amount ($)</Label>
                <Input type="number" step="0.01" value={form.flat_amount} onChange={e => set("flat_amount", e.target.value)}
                  placeholder="If flat fee (e.g., 100)" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Applies To</Label>
                <Input value={form.applies_to} onChange={e => set("applies_to", e.target.value)}
                  placeholder="e.g., wages, gross receipts" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Filing Frequency</Label>
                <select value={form.filing_frequency} onChange={e => set("filing_frequency", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Account Number</Label>
                <Input value={form.account_number} onChange={e => set("account_number", e.target.value)}
                  placeholder="Local tax account #" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Next Due Date</Label>
                <Input type="date" value={form.next_due_date} onChange={e => set("next_due_date", e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Optional notes" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Label className="text-sm cursor-pointer">Active Obligation</Label>
                <Switch checked={!!form.is_active} onCheckedChange={v => set("is_active", v)} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add Local Tax"}
              </Button>
              <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</Button>
            </div>
          </form>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filterActive !== "all" ? "No local taxes match this filter." : "No local taxes configured yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <LocalTaxCard key={c.id} config={c} onEdit={handleEdit}
                onDelete={(id) => window.confirm("Remove local tax?") && remove.mutate(id)} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 italic mt-4">
          Local tax rates and filing requirements vary significantly. Always verify obligations with the local taxing authority or your CPA before filing.
        </p>
      </div>
    </div>
  );
}
