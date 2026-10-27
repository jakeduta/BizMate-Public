import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/context/WorkspaceContext';
import RecordModal from '@/components/workspace/RecordModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Layers } from 'lucide-react';

function formatValue(value, fieldType) {
    if (value === null || value === undefined || value === '') return <span className="text-gray-300">—</span>;
    if (fieldType === 'boolean') return value ? '✓ Yes' : '✗ No';
    if (fieldType === 'date') return new Date(value).toLocaleDateString();
    return String(value);
}

export default function CustomModule() {
    const { slug }                = useParams();
    const navigate                = useNavigate();
    const { getModuleBySlug, getFields, getRecords, deleteRecord, modules, loading: wsLoading } = useWorkspace();

    const [mod,          setMod]          = useState(null);
    const [fields,       setFields]       = useState([]);
    const [records,      setRecords]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [modalOpen,    setModalOpen]    = useState(false);
    const [editRecord,   setEditRecord]   = useState(null);
    const [deletingId,   setDeletingId]   = useState(null);
    const [selectedIds,  setSelectedIds]  = useState(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [error,        setError]        = useState('');

    useEffect(() => {
        if (wsLoading) return;
        const found = getModuleBySlug(slug);
        if (!found) {
            setError('Module not found or is disabled.');
            setLoading(false);
            return;
        }
        setMod(found);
    }, [slug, modules, wsLoading]);

    useEffect(() => {
        if (!mod) return;
        loadData();
    }, [mod]);

    async function loadData() {
        setLoading(true);
        try {
            const [f, r] = await Promise.all([
                getFields(mod.id),
                getRecords(mod.id),
            ]);
            setFields(f);
            setRecords(r);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(record) {
        if (!confirm('Delete this record?')) return;
        setDeletingId(record.id);
        try {
            await deleteRecord(mod.id, record.id);
            setRecords(prev => prev.filter(r => r.id !== record.id));
        } catch (err) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    }

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleToggleAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    async function handleBulkDelete() {
        if (!confirm(`Delete ${selectedIds.size} record(s)? This cannot be undone.`)) return;
        setBulkDeleting(true);
        try {
            await Promise.all([...selectedIds].map(id => deleteRecord(mod.id, id)));
            setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
            setSelectedIds(new Set());
        } catch (err) {
            alert(err.message);
        } finally {
            setBulkDeleting(false);
        }
    }

    function openNew() {
        setEditRecord(null);
        setModalOpen(true);
    }

    function openEdit(record) {
        setEditRecord(record);
        setModalOpen(true);
    }

    if (wsLoading || loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                <p className="text-gray-500">{error}</p>
                <Button variant="outline" onClick={() => navigate('/Dashboard')}>Go to Dashboard</Button>
            </div>
        );
    }

    const dataFields  = fields.filter(f => f.field_type !== undefined);
    const allSelected = records.length > 0 && selectedIds.size === records.length;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{mod.name}</h1>
                        <p className="text-sm text-gray-400">{records.length} record{records.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Badge variant="outline">custom</Badge>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                        >
                            {bulkDeleting
                                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                : <Trash2 className="w-4 h-4 mr-1" />
                            }
                            Delete Selected ({selectedIds.size})
                        </Button>
                    )}
                    <Button onClick={openNew}>
                        <Plus className="w-4 h-4 mr-2" /> New Record
                    </Button>
                </div>
            </div>

            {/* No fields warning */}
            {fields.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-4">
                    This module has no fields defined. Admins/Managers can add fields in{' '}
                    <button onClick={() => navigate('/Workspace')} className="underline font-medium">
                        Workspace Settings
                    </button>.
                </div>
            )}

            {/* Table */}
            {records.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                    <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No records yet</p>
                    <p className="text-gray-400 text-sm mt-1">Click "+ New Record" to get started.</p>
                </div>
            ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={handleToggleAll}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                </th>
                                {dataFields.map(f => (
                                    <th key={f.id} className="px-4 py-3 text-left font-semibold text-gray-600">
                                        {f.field_label}
                                        {f.required && <span className="text-red-400 ml-1">*</span>}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                                <th className="px-4 py-3 w-20" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {records.map(record => {
                                const data = typeof record.data_json === 'string'
                                    ? JSON.parse(record.data_json)
                                    : record.data_json;
                                const isSelected = selectedIds.has(record.id);
                                return (
                                    <tr
                                        key={record.id}
                                        className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/20' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(record.id)}
                                                className="w-4 h-4 accent-indigo-600"
                                            />
                                        </td>
                                        {dataFields.map(f => (
                                            <td key={f.id} className="px-4 py-3 text-gray-700">
                                                {formatValue(data?.[f.field_name], f.field_type)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {new Date(record.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => openEdit(record)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record)}
                                                    disabled={deletingId === record.id}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    {deletingId === record.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Trash2 className="w-3.5 h-3.5" />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <RecordModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                moduleId={mod?.id}
                fields={dataFields}
                record={editRecord}
                onSaved={loadData}
            />
        </div>
    );
}
