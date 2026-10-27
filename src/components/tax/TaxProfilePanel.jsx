import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const ENTITY_TYPES = [
  { value: "sole_prop",   label: "Sole Proprietorship (Schedule C)" },
  { value: "single_llc", label: "Single-Member LLC (Default pass-through)" },
  { value: "multi_llc",  label: "Multi-Member LLC / Partnership" },
  { value: "partnership", label: "General Partnership" },
  { value: "s_corp",     label: "S-Corporation" },
  { value: "c_corp",     label: "C-Corporation" },
  { value: "nonprofit",  label: "Nonprofit (501c3 placeholder)" },
];

const INDUSTRY_TYPES = [
  "Retail", "Food & Beverage", "Professional Services", "Healthcare",
  "Construction", "Real Estate", "Technology", "Creative / Media",
  "Transportation", "Education", "Personal Services (Salon/Spa/Fitness)",
  "E-Commerce", "Manufacturing", "Consulting", "Other",
];

// All 50 states + DC
const STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
  ["DC","District of Columbia"],
];

const EMPTY = {
  legal_name: "", ein: "", entity_type: "", tax_year: 2025, fiscal_year_end_month: 12,
  primary_state: "", industry_type: "", sales_tax_enabled: false, payroll_enabled: false,
  contractor_tracking: false, estimated_payments_enabled: false, home_office_deduction: false,
  mileage_deduction: false, asset_depreciation: false, nexus_states: [],
};

export default function TaxProfilePanel({ profile }) {
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(true);
  const [nexusInput, setNexusInput] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profile) {
      setForm({ ...EMPTY, ...profile, nexus_states: profile.nexus_states || [] });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: (data) => Tax.saveProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-dashboard"]);
      queryClient.invalidateQueries(["tax-profile"]);
      toast.success("Tax profile saved successfully.");
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addNexusState = () => {
    const s = nexusInput.trim().toUpperCase();
    if (s && !form.nexus_states.includes(s)) {
      set("nexus_states", [...form.nexus_states, s]);
    }
    setNexusInput("");
  };

  const removeNexus = (s) => set("nexus_states", form.nexus_states.filter(x => x !== s));

  const handleSubmit = (e) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Profile & Business Setup</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Entity type, state, and feature configuration</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Legal Name */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Legal Business Name</Label>
              <Input
                value={form.legal_name}
                onChange={e => set("legal_name", e.target.value)}
                placeholder="e.g., Acme LLC"
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            {/* EIN */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">EIN (optional)</Label>
              <Input
                value={form.ein}
                onChange={e => set("ein", e.target.value)}
                placeholder="XX-XXXXXXX"
                className="dark:bg-gray-800 dark:border-gray-700"
              />
              <p className="text-xs text-gray-400">Stored locally only. Not transmitted externally.</p>
            </div>

            {/* Entity Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Business Entity Type <span className="text-red-500">*</span></Label>
              <select
                value={form.entity_type}
                onChange={e => set("entity_type", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
                required
              >
                <option value="">Select entity type...</option>
                {ENTITY_TYPES.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
              </select>
            </div>

            {/* Tax Year */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tax Year</Label>
              <select
                value={form.tax_year}
                onChange={e => set("tax_year", parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Primary State */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Primary Business State <span className="text-red-500">*</span></Label>
              <select
                value={form.primary_state}
                onChange={e => set("primary_state", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              >
                <option value="">Select state...</option>
                {STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Industry Type</Label>
              <select
                value={form.industry_type}
                onChange={e => set("industry_type", e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              >
                <option value="">Select industry...</option>
                {INDUSTRY_TYPES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nexus States */}
          <div className="mt-4 flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Additional Nexus States</Label>
            <div className="flex gap-2">
              <select
                value={nexusInput}
                onChange={e => setNexusInput(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              >
                <option value="">Add nexus state...</option>
                {STATES.filter(([c]) => c !== form.primary_state && !form.nexus_states.includes(c))
                  .map(([code, name]) => (
                    <option key={code} value={code}>{name} ({code})</option>
                  ))}
              </select>
              <Button type="button" variant="outline" onClick={addNexusState} className="shrink-0">Add</Button>
            </div>
            {form.nexus_states.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.nexus_states.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => removeNexus(s)} className="text-indigo-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400">States where you have tax obligations beyond your primary state.</p>
          </div>

          {/* Feature Toggles */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Feature Toggles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "sales_tax_enabled",        label: "Sales Tax Tracking" },
                { key: "payroll_enabled",           label: "Payroll Tax Tracking" },
                { key: "contractor_tracking",       label: "1099 Contractor Tracking" },
                { key: "estimated_payments_enabled", label: "Quarterly Estimated Payments" },
                { key: "home_office_deduction",     label: "Home Office Deduction" },
                { key: "mileage_deduction",         label: "Mileage / Vehicle Deduction" },
                { key: "asset_depreciation",        label: "Asset Depreciation Tracking" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  <Switch
                    checked={!!form[key]}
                    onCheckedChange={val => set(key, val)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-gray-400 italic">
              Fields marked * are required for accurate tax estimation.
            </p>
            <Button
              type="submit"
              disabled={save.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {save.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
