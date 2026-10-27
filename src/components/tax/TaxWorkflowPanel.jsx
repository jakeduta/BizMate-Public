import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardCheck, Lock, RotateCcw, Send, CheckCircle2, Clock,
  AlertTriangle, FileText, ChevronRight, Info,
} from "lucide-react";
import { toast } from "sonner";

const WORKFLOW_STAGES = [
  {
    key: "draft",
    label: "Draft",
    description: "Tax records are being entered and reviewed internally.",
    icon: FileText,
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-300 dark:border-gray-600",
  },
  {
    key: "needs_review",
    label: "Needs Review",
    description: "Records are complete — ready for CPA or manager review.",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-300 dark:border-amber-700",
  },
  {
    key: "approved",
    label: "Approved",
    description: "CPA or authorized reviewer has approved all figures.",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  {
    key: "locked",
    label: "Locked",
    description: "Tax year is locked. No further edits permitted without amendment.",
    icon: Lock,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
  },
  {
    key: "exported",
    label: "Exported",
    description: "Tax package has been exported and delivered to preparer.",
    icon: Send,
    color: "text-indigo-500",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    border: "border-indigo-300 dark:border-indigo-700",
  },
  {
    key: "filed_placeholder",
    label: "Filed (Placeholder)",
    description: "Return has been filed. This is a placeholder — BizMate does not file returns.",
    icon: CheckCircle2,
    color: "text-teal-500",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    border: "border-teal-300 dark:border-teal-700",
  },
  {
    key: "amended_placeholder",
    label: "Amended (Placeholder)",
    description: "An amended return has been filed. This is a placeholder record.",
    icon: RotateCcw,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
  },
];

const REVIEW_CHECKLIST = [
  { key: "income_verified",    label: "All income sources verified and reconciled" },
  { key: "expenses_reviewed",  label: "Expense entries reviewed for deductibility" },
  { key: "payroll_confirmed",  label: "Payroll tax figures confirmed" },
  { key: "contractors_1099",   label: "1099 contractor threshold checks complete" },
  { key: "sales_tax_filed",    label: "Sales tax periods reconciled" },
  { key: "book_adj_reviewed",  label: "Book-to-tax adjustments reviewed" },
  { key: "forms_ready",        label: "All applicable forms show ≥ 80% readiness" },
  { key: "docs_uploaded",      label: "Supporting documents uploaded or referenced" },
  { key: "compliance_active",  label: "Registration & compliance items are active" },
  { key: "cpa_notified",       label: "CPA / tax preparer notified" },
];

const ALLOWED_TRANSITIONS = {
  draft:               ["needs_review"],
  needs_review:        ["draft", "approved"],
  approved:            ["needs_review", "locked"],
  locked:              ["exported", "amended_placeholder"],
  exported:            ["filed_placeholder", "amended_placeholder"],
  filed_placeholder:   ["amended_placeholder"],
  amended_placeholder: [],
};

export default function TaxWorkflowPanel({ taxYear }) {
  const queryClient = useQueryClient();
  const [checklist, setChecklist]     = useState({});
  const [reviewNote, setReviewNote]   = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["tax-workflow", taxYear],
    queryFn: () => Tax.getWorkflow(taxYear),
  });

  const updateWorkflow = useMutation({
    mutationFn: (data) => Tax.updateWorkflow(taxYear, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-workflow", taxYear]);
      toast.success("Workflow status updated.");
      setReviewNote("");
    },
    onError: e => toast.error(e.message),
  });

  const currentStatus  = workflow?.status || "draft";
  const currentStage   = WORKFLOW_STAGES.find(s => s.key === currentStatus) || WORKFLOW_STAGES[0];
  const CurrentIcon    = currentStage.icon;
  const allowedNext    = ALLOWED_TRANSITIONS[currentStatus] || [];
  const stageIndex     = WORKFLOW_STAGES.findIndex(s => s.key === currentStatus);

  const checkedCount   = Object.values(checklist).filter(Boolean).length;
  const allChecked     = checkedCount === REVIEW_CHECKLIST.length;

  const handleTransition = (nextStatus) => {
    if (nextStatus === "locked" && !allChecked) {
      return toast.error("Complete the review checklist before locking the tax year.");
    }
    if (nextStatus === "approved" && !reviewNote.trim()) {
      return toast.error("Add a review note before approving.");
    }
    updateWorkflow.mutate({ status: nextStatus, review_note: reviewNote || undefined });
  };

  const stageConfig = (key) => WORKFLOW_STAGES.find(s => s.key === key);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-8 text-center">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading workflow status...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Year Workflow — {taxYear}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review, approval, and lock process for tax records</p>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentStage.bg} ${currentStage.color}`}>
            {currentStage.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stage progress bar */}
        <div>
          <div className="flex items-center gap-0">
            {WORKFLOW_STAGES.slice(0, 5).map((stage, i) => {
              const idx = WORKFLOW_STAGES.findIndex(s => s.key === currentStatus);
              const si  = WORKFLOW_STAGES.findIndex(s => s.key === stage.key);
              const done = si < idx;
              const active = stage.key === currentStatus;
              const Icon = stage.icon;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      active  ? `${stage.border} ${stage.bg}` :
                      done    ? "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30" :
                                "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${active ? stage.color : done ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`} />
                    </div>
                    <p className={`text-xs mt-1 whitespace-nowrap hidden sm:block ${
                      active ? stage.color : done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
                    }`}>{stage.label}</p>
                  </div>
                  {i < 4 && (
                    <div className={`h-0.5 flex-1 mx-1 mt-[-1rem] ${
                      si < idx ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Current status card */}
        <div className={`p-4 rounded-lg border ${currentStage.border} ${currentStage.bg}`}>
          <div className="flex items-start gap-3">
            <CurrentIcon className={`w-5 h-5 shrink-0 mt-0.5 ${currentStage.color}`} />
            <div>
              <p className={`text-sm font-semibold ${currentStage.color}`}>{currentStage.label}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{currentStage.description}</p>
              {workflow?.updated_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {new Date(workflow.updated_at).toLocaleString()}
                  {workflow.updated_by && ` by ${workflow.updated_by}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Review checklist — show when advancing toward lock */}
        {(currentStatus === "approved" || currentStatus === "needs_review") && (
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pre-Lock Review Checklist</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                allChecked ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                           : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
              }`}>{checkedCount} / {REVIEW_CHECKLIST.length}</span>
            </div>
            <div className="space-y-2">
              {REVIEW_CHECKLIST.map(item => (
                <label key={item.key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checklist[item.key]}
                    onChange={e => setChecklist(c => ({ ...c, [item.key]: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 accent-indigo-600 w-3.5 h-3.5"
                  />
                  <span className={`text-xs transition-colors ${
                    checklist[item.key] ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"
                  }`}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Review note */}
        {allowedNext.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Review Note / Comment</Label>
            <Input
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="Optional note for this status change (required to Approve)"
              className="dark:bg-gray-800 dark:border-gray-700 text-sm"
            />
          </div>
        )}

        {/* Transition buttons */}
        {allowedNext.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allowedNext.map(next => {
              const sc = stageConfig(next);
              const Icon = sc?.icon || ChevronRight;
              const isLock = next === "locked";
              return (
                <Button
                  key={next}
                  onClick={() => handleTransition(next)}
                  disabled={updateWorkflow.isPending || (isLock && !allChecked)}
                  variant={isLock ? "default" : "outline"}
                  className={`flex items-center gap-1.5 text-sm ${
                    isLock
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : next === "approved"
                      ? "border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      : next === "needs_review"
                      ? "border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      : ""
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  Move to: {sc?.label || next}
                  {isLock && !allChecked && (
                    <span className="text-xs opacity-70">(checklist incomplete)</span>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {/* Terminal state message */}
        {currentStatus === "amended_placeholder" && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                This tax year is marked as amended. If a second amendment is needed, contact your CPA and
                update your records manually. BizMate does not process or file returns.
              </p>
            </div>
          </div>
        )}
        {currentStatus === "filed_placeholder" && (
          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <p className="text-xs text-teal-700 dark:text-teal-300">
                Tax year is marked as filed. Keep all supporting documents for at least 7 years. If an
                amendment is required, mark this year as Amended Placeholder and document the reason.
              </p>
            </div>
          </div>
        )}

        {/* History */}
        {workflow?.history?.length > 0 && (
          <div>
            <button onClick={() => setShowHistory(h => !h)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? "rotate-90" : ""}`} />
              {showHistory ? "Hide" : "Show"} workflow history ({workflow.history.length} entries)
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1.5 border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                {workflow.history.map((entry, i) => {
                  const sc = stageConfig(entry.status);
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`font-medium whitespace-nowrap ${sc?.color || "text-gray-500"}`}>{sc?.label || entry.status}</span>
                      <span className="text-gray-400">{new Date(entry.timestamp).toLocaleString()}</span>
                      {entry.note && <span className="text-gray-500 italic">— {entry.note}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 italic">
          This workflow tracks internal review status only. BizMate does not file tax returns. Always work
          with a licensed CPA or tax preparer to file official returns.
        </p>
      </div>
    </div>
  );
}
