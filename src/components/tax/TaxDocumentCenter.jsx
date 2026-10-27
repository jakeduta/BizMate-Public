import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tax } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Plus, Trash2, PencilLine, CheckCircle2, AlertTriangle, Clock, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "w9",               label: "W-9 Form (Contractor)" },
  { value: "w4",               label: "W-4 Form (Employee)" },
  { value: "ein_verification", label: "EIN Verification" },
  { value: "prior_year_return", label: "Prior-Year Tax Return" },
  { value: "receipt",          label: "Receipt / Supporting Doc" },
  { value: "asset_purchase",   label: "Asset Purchase Document" },
  { value: "tax_payment_proof", label: "Tax Payment Proof" },
  { value: "sales_tax_proof",  label: "Sales Tax Remittance Proof" },
  { value: "payroll_support",  label: "Payroll Support Document" },
  { value: "contractor_doc",   label: "Contractor Agreement" },
  { value: "other",            label: "Other Document" },
];

const STATUS_CONFIG = {
  requested:     { icon: Clock,         color: "text-gray-500",    bg: "bg-gray-100 dark:bg-gray-800",        label: "Requested"    },
  uploaded:      { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Uploaded"   },
  under_review:  { icon: Eye,           color: "text-blue-500",    bg: "bg-blue-100 dark:bg-blue-900/30",     label: "Under Review" },
  approved:      { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Approved"   },
  missing:       { icon: XCircle,       color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30",       label: "Missing"      },
  expired:       { icon: AlertTriangle, color: "text-amber-500",   bg: "bg-amber-100 dark:bg-amber-900/30",   label: "Expired"      },
};

const CATEGORY_FILTERS = ["All", "w9", "w4", "receipt", "tax_payment_proof", "prior_year_return", "other"];

const EMPTY = { document_type: "", document_name: "", category: "", tax_year: "", status: "requested",
                file_name: "", upload_date: "", expiry_date: "", associated_entity: "", notes: "" };

function DocRow({ doc, onEdit, onDelete }) {
  const config = STATUS_CONFIG[doc.status] || STATUS_CONFIG.requested;
  const Icon   = config.icon;
  const typLabel = DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${doc.review_flag ? "border-amber-300 dark:border-amber-700" : "border-gray-100 dark:border-gray-800"} hover:bg-gray-50 dark:hover:bg-gray-800/30`}>
      <Icon className={`w-4 h-4 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.document_name}</p>
          {doc.review_flag && <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 rounded">Flag</span>}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{typLabel}{doc.associated_entity ? ` · ${doc.associated_entity}` : ""}{doc.tax_year ? ` · ${doc.tax_year}` : ""}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>{config.label}</span>
        {doc.upload_date && <p className="text-xs text-gray-400 hidden sm:block">{new Date(doc.upload_date).toLocaleDateString()}</p>}
        <button onClick={() => onEdit(doc)} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"><PencilLine className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(doc.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function TaxDocumentCenter() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter]   = useState("All");
  const [showForm, setShowForm]           = useState(false);
  const [editId, setEditId]               = useState(null);
  const [form, setForm]                   = useState(EMPTY);
  const queryClient = useQueryClient();

  const params = {};
  if (categoryFilter !== "All") params.document_type = categoryFilter;
  if (statusFilter !== "All")   params.status = statusFilter;

  const { data: docs = [] } = useQuery({
    queryKey: ["tax-documents", categoryFilter, statusFilter],
    queryFn: () => Tax.getDocuments(params),
    select: (d) => Array.isArray(d) ? d : [],
  });

  const invalidate = () => queryClient.invalidateQueries(["tax-documents"]);

  const create = useMutation({ mutationFn: Tax.createDocument, onSuccess: () => { invalidate(); setShowForm(false); setForm(EMPTY); toast.success("Document record added."); }, onError: e => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, data }) => Tax.updateDocument(id, data), onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm(EMPTY); toast.success("Document updated."); }, onError: e => toast.error(e.message) });
  const remove = useMutation({ mutationFn: Tax.deleteDocument, onSuccess: () => { invalidate(); toast.success("Document removed."); }, onError: e => toast.error(e.message) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEdit = (doc) => {
    setEditId(doc.id);
    setForm({ document_type: doc.document_type || "", document_name: doc.document_name || "",
      category: doc.category || "", tax_year: doc.tax_year || "", status: doc.status || "requested",
      file_name: doc.file_name || "", upload_date: doc.upload_date?.split("T")[0] || "",
      expiry_date: doc.expiry_date?.split("T")[0] || "", associated_entity: doc.associated_entity || "", notes: doc.notes || "" });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.document_type || !form.document_name) return toast.error("Type and name required.");
    if (editId) update.mutate({ id: editId, data: form });
    else create.mutate(form);
  };

  const missingCount = docs.filter(d => d.status === "missing").length;
  const uploadedCount = docs.filter(d => d.status === "uploaded" || d.status === "approved").length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
          <FolderOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tax Document Center</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track W-9s, receipts, payment proofs, and more</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {missingCount > 0 && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-2 py-0.5">{missingCount} missing</span>}
          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5">{uploadedCount} on file</span>
        </div>
      </div>

      <div className="p-5">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="flex gap-1 flex-wrap">
            {["All", "requested", "uploaded", "missing", "expired"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${statusFilter === s ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                {s === "All" ? "All Status" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY); }}
            variant="outline" className="ml-auto flex items-center gap-1.5 text-xs border-dashed border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400">
            <Plus className="w-3.5 h-3.5" />
            Add Document Record
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{editId ? "Edit Document" : "Add Document Record"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Document Type *</Label>
                <select value={form.document_type} onChange={e => set("document_type", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100" required>
                  <option value="">Select type...</option>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Document Name *</Label>
                <Input value={form.document_name} onChange={e => set("document_name", e.target.value)} placeholder="e.g., John Smith W-9 2025" required className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Status</Label>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Associated Entity</Label>
                <Input value={form.associated_entity} onChange={e => set("associated_entity", e.target.value)} placeholder="Contractor, employee name..." className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tax Year</Label>
                <Input type="number" value={form.tax_year} onChange={e => set("tax_year", e.target.value)} placeholder="2025" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Upload / Receipt Date</Label>
                <Input type="date" value={form.upload_date} onChange={e => set("upload_date", e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Expiry Date (if applicable)</Label>
                <Input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">File Name / Reference</Label>
                <Input value={form.file_name} onChange={e => set("file_name", e.target.value)} placeholder="filename.pdf (placeholder)" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-3">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes or review flags" className="dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="submit" disabled={create.isPending || update.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                {create.isPending || update.isPending ? "Saving..." : editId ? "Update" : "Add Document"}
              </Button>
              <Button type="button" variant="outline" className="text-sm" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancel</Button>
            </div>
          </form>
        )}

        {/* Document list */}
        {docs.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <FolderOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No documents tracked yet.</p>
            <p className="text-xs text-gray-400 mt-1">Add W-9s, receipts, payment proofs, and prior-year returns.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <DocRow key={doc.id} doc={doc} onEdit={handleEdit}
                onDelete={(id) => window.confirm("Remove document record?") && remove.mutate(id)} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 italic mt-4">
          BizMate tracks document records and status. Actual file storage integration is a future enhancement. Store physical files securely with your accountant or in a secure cloud service.
        </p>
      </div>
    </div>
  );
}
