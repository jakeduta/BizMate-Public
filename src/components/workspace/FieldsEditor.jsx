import { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';

const FIELD_TYPES = [
    { value: 'text',     label: 'Text' },
    { value: 'number',   label: 'Number' },
    { value: 'date',     label: 'Date' },
    { value: 'boolean',  label: 'Yes/No' },
    { value: 'select',   label: 'Dropdown' },
    { value: 'email',    label: 'Email' },
    { value: 'phone',    label: 'Phone' },
    { value: 'textarea', label: 'Long Text' },
];

const emptyField = () => ({
    field_name: '', field_label: '', field_type: 'text', required: false, options: [],
});

// hasDdlTable: true when the module's data lives in a real MySQL table.
// Passed from WorkspaceCustomize so the delete warning is accurate.
export default function FieldsEditor({ moduleId, hasDdlTable = false }) {
    const { getFields, saveField, deleteField } = useWorkspace();
    const [fields,   setFields]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [adding,   setAdding]   = useState(false);
    const [newField, setNewField] = useState(emptyField());
    const [error,    setError]    = useState('');
    const [savingId, setSavingId] = useState(null);

    useEffect(() => { load(); }, [moduleId]);

    async function load() {
        setLoading(true);
        try { setFields(await getFields(moduleId)); }
        catch { /* ignored */ }
        finally { setLoading(false); }
    }

    async function handleAddField(e) {
        e.preventDefault();
        if (!newField.field_label.trim()) { setError('Field label is required'); return; }

        setSavingId('new');
        try {
            await saveField(moduleId, {
                ...newField,
                field_name: newField.field_label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            });
            setNewField(emptyField());
            setAdding(false);
            setError('');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSavingId(null);
        }
    }

    async function handleDelete(fieldId) {
        const warning = hasDdlTable
            ? 'Delete this field? This will permanently DROP the database column and all data stored in it. This cannot be undone.'
            : 'Delete this field? Existing records will retain their stored data.';
        if (!confirm(warning)) return;
        setSavingId(fieldId);
        try {
            await deleteField(moduleId, fieldId);
            await load();
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
        }
    }

    async function toggleRequired(field) {
        setSavingId(field.id);
        try {
            await saveField(moduleId, { id: field.id, field_name: field.field_name, field_label: field.field_label, field_type: field.field_type, required: !field.required });
            await load();
        } finally {
            setSavingId(null);
        }
    }

    if (loading) return <div className="py-6 text-center text-sm text-gray-400">Loading fields…</div>;

    return (
        <div className="space-y-3">
            {fields.length === 0 && !adding && (
                <p className="text-sm text-gray-400 text-center py-4">
                    No custom fields yet. Add one below.
                </p>
            )}

            {fields.map(f => (
                <div key={f.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group">
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{f.field_label}</span>
                            <Badge variant="outline" className="text-xs">{FIELD_TYPES.find(t => t.value === f.field_type)?.label}</Badge>
                            {f.required && <Badge className="text-xs bg-orange-100 text-orange-700 border-0">Required</Badge>}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{f.field_name}</p>
                    </div>
                    <Switch
                        checked={!!f.required}
                        onCheckedChange={() => toggleRequired(f)}
                        disabled={savingId === f.id}
                        title="Toggle required"
                    />
                    <button
                        onClick={() => handleDelete(f.id)}
                        disabled={savingId === f.id}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                        {savingId === f.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                        }
                    </button>
                </div>
            ))}

            {adding ? (
                <form onSubmit={handleAddField} className="p-3 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-3">
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Field Label *</Label>
                            <Input
                                placeholder="e.g. Project Name"
                                value={newField.field_label}
                                onChange={e => setNewField(p => ({ ...p, field_label: e.target.value }))}
                                autoFocus
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={newField.field_type}
                                onValueChange={v => setNewField(p => ({ ...p, field_type: v }))}
                            >
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            id="req"
                            checked={newField.required}
                            onCheckedChange={v => setNewField(p => ({ ...p, required: v }))}
                        />
                        <Label htmlFor="req" className="text-xs cursor-pointer">Required field</Label>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" size="sm"
                            onClick={() => { setAdding(false); setError(''); setNewField(emptyField()); }}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={savingId === 'new'}>
                            {savingId === 'new' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add Field'}
                        </Button>
                    </div>
                </form>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={() => setAdding(true)}
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Field
                </Button>
            )}
        </div>
    );
}
