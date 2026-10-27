import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Plus, Trash2, PencilLine, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

const REG_TYPES = [
  { value: "sales_tax_permit",       label: "Sales Tax Permit" },
  { value: "payroll_tax_account",    label: "Payroll Tax Account (EIN/FEIN)" },
  { value: "unemployment_account",   label: "State Unemployment (SUI) Account" },
  { value: "state_withholding",      label: "State Income Tax Withholding" },
  { value: "franchise_tax",          label: "Franchise / Privilege Tax Registration" },
  { value: "nexus_registration",     label: "Nexus State Registration" },
  { value: "resale_certificate",     label: "Resale Certificate" },
  { value: "business_license",       label: "Business License / Compliance" },
  { value: "local_business_tax",     label: "Local Business Tax Registration" },
  { value: "other",                  label: "Other Registration" },
];

const STATUS_CONFIG = {
  not_started:   { label: "Not Started",   icon: Clock,         color: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800"            },
  pending:       { label: "Pending",       icon: Clock,         color: "text-amber-500",   bg: "bg-amber-100 dark:bg-amber-900/30"        },
  active:        { label: "Active",        icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30"    },
  review_needed: { label: "Review Needed", icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30"        },
  expired:       { label: "Expired",       icon: XCircle,       color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30"            },
  inactive:      { label: "Inactive",      icon: XCircle,       color: "text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800"             },
};

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const EMPTY = { registration_type: "", state_code: "", jurisdiction: "", status: "not_started",
                account_number: "", registration_date: "", renewal_date: "", notes: "" };

function RegCard({ reg, onEdit, onDelete }) {
  const config = STATUS_CONFIG[reg.status] || STATUS_CONFIG.not_started;
  const Icon = config.icon;
  const type = REG_TYPES.find(t => t.value === reg.registration_type);
  const isRenewing = reg.renewal_date && new Date(reg.renewal_date) < new Date(Date.now() + 30 * 86400000);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isRenewing ? "border-amber-300 dark:border-amber-700" : "border-gray-100 dark:border-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-800/30`}>
      <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{type?.label || reg.registration_type}</p>
          {isRenewing && <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 rounded">Renew Soon</span>}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {reg.state_code && <span className="font-medium">{reg.state_code} </span>}
          {reg.jurisdiction && <span>{reg.jurisdiction} </span>}
          {reg.account_number && <span>· Acct: {reg.account_number}</span>}
        </p>
        {reg.renewal_date && (
          <p className="text-xs text-gray-400">Renews: {new Date(reg.renewal_date).toLocaleDateString()}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>{config.label}</span>
        <button onClick={() => onEdit(reg)} className="p-1 text-gray-400 hover:text-indigo-600"><PencilLine className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(reg.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function TaxComplianceSetup() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const { data: registrations = [] } = useQuery({
    queryKey: ["tax-compliance"],
    queryFn: () => Tax.getCompliance(),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => queryClient.invalidateQueries(["tax-compliance"]);

  const create = useMutation({ mutationFn: Tax.createCompliance, onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); toast.success("Registration added."); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, d }) => Tax.updateCompliance(id, d), onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm(EMPTY); toast.success("Registration updated."); }, onError: e => toast.error(e.message) });
  const remove = useMutation({ mutationFn: Tax.deleteCompliance, onSuccess: () => { invalidate(); toast.success("Registration removed."); }, onError: e => toast.error(e.message) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleEdit = (r) => {
    setEditId(r.id);
    setForm({ registration_type: r.registration_type || "", state_code: r.state_code || "",
      jurisdiction: r.jurisdiction || "", status: r.status || "not_started",
      account_number: r.account_number || "", registration_date: r.registration_date?.split("T")[0] || "",
      renewal_date: r.renewal_date?.split("T")[0] || "", notes: r.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.registration_type) return toast.error("Registration type required.");
    if (editId) update.mutate({ id: editId, d: form });
    else create.mutate(form);
  };

  const activeCount  = registrations.filter(r => r.status === "active").length;
  const missingCount = registrations.filter(r => r.status === "not_started" || r.status === "expired").length;

  // Default checklist for new businesses
  const defaultItems = [
    { type: "sales_tax_permit",     label: "Sales Tax Permit",          needed: true  },
    { type: "payroll_tax_account",  label: "Federal EIN / Payroll ID",  needed: true  },
    { type: "unemployment_account", label: "State UI Account",          needed: true  },
    { type: "state_withholding",    label: "State Withholding Account", needed: true  },
    { type: "business_license",     label: "Business License",          needed: true  },
  ];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Registration &amp; Compliance Setup</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tax accounts, permits, and business registrations</p>
        </div>
        <div className="ml-auto flex gap-2">
          {activeCount > 0 && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5">{activeCount} active</span>}
          {missingCount > 0 && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5">{missingCount} incomplete</span>}
        </div>
      </div>

      <div className="p-5">
        {/* Quick checklist for items not yet tracked */}
        {registrations.length === 0 && (
          <div className="mb-5 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">Suggested registrations to track:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {defaultItems.map(item => (
                <div key={item.type} className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <Clock className="w-3 h-3 shrink-0" />{item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add button */}
        <div className="flex mb-4">
          <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY); }}
            variant="outline" className="flex items-center gap-1.5 text-xs border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400">
            <Plus className="w-3.5 h-3.5" /> Add Registration
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit Registration" : "Add Registration"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Registration Type *</Label>
                <select value={form.registration_type} onChange={e => set("registration_type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100" required>
                  <option value="">Select type...</option>
                  {REG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                <Label className="text-xs">Jurisdiction / Agency</Label>
                <Input value={form.jurisdiction} onChange={e => set("jurisdiction", e.target.value)} placeholder="e.g., California CDTFA" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Account Number (masked)</Label>
                <Input value={form.account_number} onChange={e => set("account_number", e.target.value)} placeholder="Last 4 digits or placeholder" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Registration Date</Label>
                <Input type="date" value={form.registration_date} onChange={e => set("registration_date", e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Renewal / Expiry Date</Label>
                <Input type="date" value={form.renewal_date} onChange={e => set("renewal_date", e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add Registration"}
              </Button>
              <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</Button>
            </div>
          </form>
        )}

        {/* List */}
        {registrations.length === 0 && !showForm ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No registrations tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {registrations.map(r => (
              <RegCard key={r.id} reg={r} onEdit={handleEdit}
                onDelete={(id) => window.confirm("Remove registration?") && remove.mutate(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
