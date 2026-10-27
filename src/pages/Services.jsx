import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Briefcase, Clock, DollarSign, Tag } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { getAuthToken } from '@/api/dbClient';

const API = '/api/services';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
    };
}

async function fetchServices() {
    const res = await fetch(`${API}/all`, { headers: authHeaders() });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

const EMPTY_FORM = {
    name: '', description: '', category: '', duration_minutes: '', price: '',
};

export default function Services() {
    const qc = useQueryClient();
    const { hasPermission } = usePermissions();

    const { data: services = [], isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: fetchServices,
    });

    const [showModal, setShowModal]     = useState(false);
    const [editing, setEditing]         = useState(null);
    const [form, setForm]               = useState(EMPTY_FORM);
    const [formError, setFormError]     = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());

    const canCreate = hasPermission('module:services:create');
    const canEdit   = hasPermission('module:services:edit');
    const canDelete = hasPermission('module:services:delete');

    // ── Mutations ─────────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
            if (!res.ok) throw new Error((await res.json()).error);
            return res.json();
        },
        onSuccess: () => { qc.invalidateQueries(['services']); setShowModal(false); },
        onError:   (err) => setFormError(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
            if (!res.ok) throw new Error((await res.json()).error);
            return res.json();
        },
        onSuccess: () => { qc.invalidateQueries(['services']); setShowModal(false); },
        onError:   (err) => setFormError(err.message),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }) => {
            const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ is_active }) });
            if (!res.ok) throw new Error((await res.json()).error);
        },
        onSuccess: () => qc.invalidateQueries(['services']),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`${API}/${id}?hard=true`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json()).error);
        },
        onSuccess: () => qc.invalidateQueries(['services']),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────

    function openCreate() {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    }

    function openEdit(svc) {
        setEditing(svc);
        setForm({
            name:             svc.name,
            description:      svc.description ?? '',
            category:         svc.category ?? '',
            duration_minutes: svc.duration_minutes != null ? String(svc.duration_minutes) : '',
            price:            svc.price != null ? String(svc.price) : '',
        });
        setFormError('');
        setShowModal(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        setFormError('');
        if (!form.name.trim()) { setFormError('Service name is required'); return; }

        const payload = {
            name:             form.name.trim(),
            description:      form.description || null,
            category:         form.category || null,
            duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
            price:            form.price ? parseFloat(form.price) : null,
        };

        if (editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
        } else {
            createMutation.mutate(payload);
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
        if (selectedIds.size === services.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(services.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} service(s)? This cannot be undone.`)) return;
        await Promise.all(
            [...selectedIds].map(id =>
                fetch(`${API}/${id}?hard=true`, { method: 'DELETE', headers: authHeaders() })
            )
        );
        setSelectedIds(new Set());
        qc.invalidateQueries(['services']);
    };

    const isSaving    = createMutation.isPending || updateMutation.isPending;
    const allSelected = services.length > 0 && selectedIds.size === services.length;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Services</h1>
                    <p className="text-gray-500 mt-1">Define the services your business offers</p>
                </div>
                <div className="flex items-center gap-3">
                    {canDelete && services.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleToggleAll}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            Select All
                        </label>
                    )}
                    {canDelete && selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Selected ({selectedIds.size})
                        </Button>
                    )}
                    {canCreate && (
                        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2"/>
                            Add Service
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-400">Loading services…</div>
            ) : services.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-16">
                        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500 font-medium">No services yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Add your first service to start linking it to appointments and invoices.
                        </p>
                        {canCreate && (
                            <Button onClick={openCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-2"/>
                                Add Service
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {services.map(svc => {
                        const isSelected = selectedIds.has(svc.id);
                        return (
                            <Card
                                key={svc.id}
                                className={`transition-all ${!svc.is_active ? 'opacity-60' : ''} ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : ''}`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {canDelete && (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(svc.id)}
                                                    className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <CardTitle className="text-base font-semibold truncate">
                                                    {svc.name}
                                                </CardTitle>
                                                {svc.category && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Tag className="w-3 h-3 text-gray-400"/>
                                                        <span className="text-xs text-gray-500">{svc.category}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <Switch
                                                checked={Boolean(svc.is_active)}
                                                onCheckedChange={(v) => toggleActiveMutation.mutate({ id: svc.id, is_active: v })}
                                                title={svc.is_active ? 'Active' : 'Inactive'}
                                            />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {svc.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{svc.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        {svc.duration_minutes != null && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5"/>
                                                <span>{svc.duration_minutes} min</span>
                                            </div>
                                        )}
                                        {svc.price != null && (
                                            <div className="flex items-center gap-1 font-medium text-gray-800">
                                                <DollarSign className="w-3.5 h-3.5"/>
                                                <span>{parseFloat(svc.price).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    {(canEdit || canDelete) && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                            {canEdit && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(svc)}
                                                    className="flex-1"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 mr-1.5"/>
                                                    Edit
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        if (confirm(`Delete "${svc.name}"? This cannot be undone.`)) {
                                                            deleteMutation.mutate(svc.id);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5"/>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                Service Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Oil Change, Haircut, Tutoring Session"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                            <Input
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                placeholder="e.g., Auto, Hair, Academic"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    Duration (minutes)
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.duration_minutes}
                                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                    placeholder="e.g., 60"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Price ($)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="e.g., 49.99"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Optional description of this service…"
                            />
                        </div>

                        {formError && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                {formError}
                            </p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Add Service'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
