import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { FileText, CheckCircle2, AlertCircle, Clock, Lock, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_CONFIG = {
  not_started:  { label: "Not Started",   color: "text-gray-500 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-gray-800",          icon: Clock },
  in_progress:  { label: "In Progress",   color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-900/30",       icon: Clock },
  needs_review: { label: "Needs Review",  color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-100 dark:bg-amber-900/30",     icon: AlertCircle },
  ready:        { label: "Ready",         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2 },
  locked:       { label: "Locked",        color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-100 dark:bg-purple-900/30",   icon: Lock },
  exported:     { label: "Exported",      color: "text-indigo-600 dark:text-indigo-400",bg: "bg-indigo-100 dark:bg-indigo-900/30",   icon: Send },
};

const ENTITY_LABELS = {
  sole_prop: "Sole Proprietorship", single_llc: "Single-Member LLC",
  multi_llc: "Multi-Member LLC", partnership: "Partnership",
  s_corp: "S-Corporation", c_corp: "C-Corporation",
};

function FormCard({ form, taxYear, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(form.reviewerNotes || "");
  const status = form.storedStatus || form.status;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {/* Progress ring */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
              className="text-gray-200 dark:text-gray-700" strokeWidth="3" />
            <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
              className={form.completionPct >= 80 ? "text-emerald-500" : form.completionPct >= 50 ? "text-amber-500" : "text-blue-500"}
              stroke="currentColor"
              strokeDasharray={`${(form.completionPct / 100) * 125.6} 125.6`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
            {form.completionPct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{form.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
              <Icon className="w-3 h-3 inline mr-1" />{config.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{form.description}</p>
          <p className="text-xs text-gray-400 mt-0.5">Filed with: {form.filedWith}</p>
        </div>

        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 bg-gray-50 dark:bg-gray-800/40">
          {/* Field checklist */}
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Required Data</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {form.fields?.map((field, i) => {
              const missing = form.missingFields?.includes(field.label);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {missing
                    ? <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  <span className={missing ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-400"}>
                    {field.label} {field.required ? "*" : "(opt)"}
                  </span>
                </div>
              );
            })}
          </div>

          {form.missingFields?.length > 0 && (
            <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-3">
              <p className="text-xs text-red-700 dark:text-red-300">
                <strong>Missing:</strong> {form.missingFields.join(", ")}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="flex gap-2 flex-wrap">
            {["in_progress", "needs_review", "ready", "locked"].map(s => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => onUpdateStatus(form.code, s, notes)}
                className={`text-xs ${status === s ? "bg-indigo-600 text-white" : ""}`}
              >
                {STATUS_CONFIG[s].label}
              </Button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reviewer notes (optional)..."
            rows={2}
            className="mt-2 w-full text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 resize-none"
          />

          {form.lockedAt && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Locked: {new Date(form.lockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaxFormReadinessPanel({ taxYear, profile }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tax-forms", taxYear],
    queryFn: () => Tax.getForms(taxYear),
    select: (d) => Array.isArray(d?.forms) ? d.forms : [],
  });

  const updateStatus = useMutation({
    mutationFn: ({ code, status, notes }) =>
      Tax.updateFormStatus(code, { status, reviewer_notes: notes, tax_year: taxYear }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-forms"]);
      toast.success("Form status updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const forms = data ?? [];
  const entityType = profile?.entity_type;

  const readyCount      = forms.filter(f => (f.storedStatus || f.status) === "ready").length;
  const needsReviewCount= forms.filter(f => (f.storedStatus || f.status) === "needs_review").length;
  const notStartedCount = forms.filter(f => (f.storedStatus || f.status) === "not_started").length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Forms &amp; Filing Readiness</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {entityType ? ENTITY_LABELS[entityType] : "Configure entity type in Tax Profile"} · Tax Year {taxYear}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {readyCount > 0 && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5">{readyCount} ready</span>}
          {needsReviewCount > 0 && <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5">{needsReviewCount} review</span>}
          {notStartedCount > 0 && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">{notStartedCount} pending</span>}
        </div>
      </div>

      <div className="p-5">
        {/* Legal disclaimer */}
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Preparation readiness only.</strong> BizMate does not generate legally complete tax forms or e-file returns. Use this center to track data completeness and coordinate with your CPA or tax software.
          </p>
        </div>

        {!entityType ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Configure your business entity type in the Tax Profile tab to see applicable forms.</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading form readiness...</div>
        ) : forms.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No applicable forms found for this entity type.</div>
        ) : (
          <div className="space-y-3">
            {forms.map(form => (
              <FormCard
                key={form.code}
                form={form}
                taxYear={taxYear}
                onUpdateStatus={(code, status, notes) => updateStatus.mutate({ code, status, notes })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
