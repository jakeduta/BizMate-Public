import { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function RecordModal({ open, onClose, moduleId, fields, record, onSaved }) {
    const { createRecord, updateRecord } = useWorkspace();
    const [form,  setForm]  = useState({});
    const [error, setError] = useState('');
    const [busy,  setBusy]  = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (record) {
            const data = typeof record.data_json === 'string'
                ? JSON.parse(record.data_json)
                : record.data_json;
            setForm(data ?? {});
        } else {
            setForm({});
        }
        setError('');
    }, [record, open]);

    function setField(name, value) {
        setForm(prev => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);
        try {
            if (record) {
                await updateRecord(moduleId, record.id, form);
            } else {
                await createRecord(moduleId, form);
            }
            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function renderField(field) {
        const val = form[field.field_name] ?? '';
        const common = {
            id: field.field_name,
            required: field.required,
        };

        switch (field.field_type) {
            case 'textarea':
                return (
                    <Textarea
                        {...common}
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                        rows={3}
                    />
                );
            case 'boolean':
                return (
                    <div className="flex items-center gap-2 h-10">
                        <Switch
                            id={field.field_name}
                            checked={!!form[field.field_name]}
                            onCheckedChange={v => setField(field.field_name, v)}
                        />
                        <Label htmlFor={field.field_name} className="cursor-pointer text-sm text-gray-600">
                            {form[field.field_name] ? 'Yes' : 'No'}
                        </Label>
                    </div>
                );
            case 'select': {
                const opts = Array.isArray(field.options)
                    ? field.options
                    : (typeof field.options === 'string' ? JSON.parse(field.options) : []);
                return (
                    <Select value={val} onValueChange={v => setField(field.field_name, v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.field_label}…`} />
                        </SelectTrigger>
                        <SelectContent>
                            {opts.map((opt, i) => (
                                <SelectItem key={i} value={String(opt.value ?? opt)}>
                                    {opt.label ?? opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            }
            case 'number':
                return (
                    <Input
                        {...common}
                        type="number"
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                    />
                );
            case 'date':
                return (
                    <Input
                        {...common}
                        type="date"
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                    />
                );
            case 'email':
                return (
                    <Input
                        {...common}
                        type="email"
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                    />
                );
            case 'phone':
                return (
                    <Input
                        {...common}
                        type="tel"
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                    />
                );
            default: // text
                return (
                    <Input
                        {...common}
                        type="text"
                        value={val}
                        onChange={e => setField(field.field_name, e.target.value)}
                        placeholder={field.field_label}
                    />
                );
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{record ? 'Edit Record' : 'New Record'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                            {error}
                        </p>
                    )}

                    {fields.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                            This module has no fields yet. Add fields in Workspace Settings.
                        </p>
                    )}

                    {fields.map(field => (
                        <div key={field.id} className="space-y-1.5">
                            <Label htmlFor={field.field_name}>
                                {field.field_label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {renderField(field)}
                        </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={busy || fields.length === 0}>
                            {busy
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                                : record ? 'Save Changes' : 'Create Record'
                            }
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
