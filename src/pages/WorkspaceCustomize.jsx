import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import AddTabModal from '@/components/workspace/AddTabModal';
import FieldsEditor from '@/components/workspace/FieldsEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Plus, GripVertical, Pencil, Trash2, ChevronDown,
    ChevronUp, Loader2, Check, X, Settings,
    LayoutDashboard, FileText, CreditCard, Users, Clock,
    Calendar, UserCircle, Layers, Box, Tag,
    Star, Folder, File, Briefcase, Package, List, Database,
    Clipboard, BarChart2, PieChart, Map, Globe, Grid3x3,
    RotateCcw,
} from 'lucide-react';

const ICON_MAP = {
    LayoutDashboard, FileText, CreditCard, Users, Clock,
    Calendar, UserCircle, Settings, Layers, Box, Tag,
    Star, Folder, File, Briefcase, Package, List, Database,
    Clipboard, BarChart2, PieChart, Map, Globe, Grid3x3,
};

const CORE_DEFAULTS = {
    dashboard:    { name: 'Dashboard',    icon: 'LayoutDashboard' },
    invoices:     { name: 'Invoices',     icon: 'FileText' },
    payments:     { name: 'Payments',     icon: 'CreditCard' },
    employees:    { name: 'Employees',    icon: 'Users' },
    clockins:     { name: 'Clock-ins',    icon: 'Clock' },
    appointments: { name: 'Appointments', icon: 'Calendar' },
    customers:    { name: 'Customers',    icon: 'UserCircle' },
    services:     { name: 'Services',     icon: 'Briefcase' },
    settings:     { name: 'Settings',     icon: 'Settings' },
};

export default function WorkspaceCustomize() {
    const { user }                        = useAuth();
    const { fetchAllModules, updateModule, reorderModules, deleteModule, canCustomize } = useWorkspace();
    const navigate = useNavigate();

    const [modules,       setModules]       = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [addOpen,       setAddOpen]       = useState(false);
    const [expandedId,    setExpandedId]    = useState(null);
    const [renamingId,    setRenamingId]    = useState(null);
    const [renameValue,   setRenameValue]   = useState('');
    const [savingId,      setSavingId]      = useState(null);
    const [dragIndex,       setDragIndex]       = useState(null);
    const [dragOverIndex,   setDragOverIndex]   = useState(null);
    const [iconPickerOpenId, setIconPickerOpenId] = useState(null);
    const iconPickerRef = useRef({});

    // Guard: redirect non-admins/managers
    useEffect(() => {
        if (!canCustomize) navigate('/Dashboard', { replace: true });
    }, [canCustomize]);

    // Close icon picker on outside click
    useEffect(() => {
        if (!iconPickerOpenId) return;
        function handleClick(e) {
            const el = iconPickerRef.current[iconPickerOpenId];
            if (el && !el.contains(e.target)) {
                setIconPickerOpenId(null);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [iconPickerOpenId]);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try { setModules(await fetchAllModules()); }
        catch { /* ignore */ }
        finally { setLoading(false); }
    }

    // ── Enable / disable ──────────────────────────────────────────────────────
    async function handleToggle(mod) {
        setSavingId(mod.id);
        try {
            const updated = await updateModule(mod.id, { enabled: !mod.enabled });
            setModules(prev => prev.map(m => m.id === mod.id ? updated : m));
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
        }
    }

    // ── Rename ────────────────────────────────────────────────────────────────
    function startRename(mod) {
        setRenamingId(mod.id);
        setRenameValue(mod.name);
    }

    async function commitRename(mod) {
        if (!renameValue.trim() || renameValue === mod.name) {
            setRenamingId(null); return;
        }
        setSavingId(mod.id);
        try {
            const updated = await updateModule(mod.id, { name: renameValue.trim() });
            setModules(prev => prev.map(m => m.id === mod.id ? updated : m));
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
            setRenamingId(null);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    async function handleDelete(mod) {
        if (!confirm(`Delete "${mod.name}"? All records in this module will be permanently deleted.`)) return;
        setSavingId(mod.id);
        try {
            await deleteModule(mod.id);
            setModules(prev => prev.filter(m => m.id !== mod.id));
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
        }
    }

    // ── Icon change ───────────────────────────────────────────────────────────
    async function handleIconChange(mod, iconName) {
        setIconPickerOpenId(null);
        if (iconName === mod.icon) return;
        setSavingId(mod.id);
        try {
            const updated = await updateModule(mod.id, { icon: iconName });
            setModules(prev => prev.map(m => m.id === mod.id ? updated : m));
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
        }
    }

    // ── Reset core module to defaults ─────────────────────────────────────────
    async function handleReset(mod) {
        const defaults = CORE_DEFAULTS[mod.slug];
        if (!defaults) return;
        if (mod.name === defaults.name && mod.icon === defaults.icon) return;
        setSavingId(mod.id);
        try {
            const updated = await updateModule(mod.id, { name: defaults.name, icon: defaults.icon });
            setModules(prev => prev.map(m => m.id === mod.id ? updated : m));
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingId(null);
        }
    }

    // ── Drag-and-drop reorder ─────────────────────────────────────────────────
    function onDragStart(e, index) {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragOver(e, index) {
        e.preventDefault();
        setDragOverIndex(index);
    }

    async function onDrop(e, dropIndex) {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null); setDragOverIndex(null); return;
        }

        const reordered = [...modules];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);

        const withOrder = reordered.map((m, i) => ({ ...m, display_order: i + 1 }));
        setModules(withOrder);
        setDragIndex(null);
        setDragOverIndex(null);

        try {
            await reorderModules(withOrder.map(m => ({ id: m.id, display_order: m.display_order })));
        } catch (err) {
            alert('Failed to save order: ' + err.message);
            await load(); // revert on error
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6" /> Customize Workspace
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Reorder tabs, enable/disable modules, and add custom tabs for your team.
                    </p>
                </div>
                <Button onClick={() => setAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Tab
                </Button>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-700">
                <strong>Tip:</strong> Drag rows to reorder. Click a module's icon to change it. Core modules can be renamed — use the reset button to restore defaults. Custom tabs create real MySQL tables — field names are permanent and deleting a field permanently removes all data in that column.
            </div>

            {/* Module list */}
            <div className="space-y-2">
                {modules.map((mod, index) => (
                    <div
                        key={mod.id}
                        draggable
                        onDragStart={e => onDragStart(e, index)}
                        onDragOver={e => onDragOver(e, index)}
                        onDrop={e => onDrop(e, index)}
                        onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                        className={`border rounded-xl bg-white transition-all
                            ${dragOverIndex === index ? 'border-blue-400 shadow-md' : 'border-gray-200'}
                            ${!mod.enabled ? 'opacity-60' : ''}`}
                    >
                        {/* Row */}
                        <div className="flex items-center gap-3 p-3">
                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Icon picker button */}
                            <div className="relative" ref={el => { iconPickerRef.current[mod.id] = el; }}>
                                <button
                                    onClick={() => setIconPickerOpenId(iconPickerOpenId === mod.id ? null : mod.id)}
                                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                                    title="Change icon"
                                >
                                    {(() => { const Icon = ICON_MAP[mod.icon] ?? Layers; return <Icon className="w-5 h-5"/>; })()}
                                </button>
                                {iconPickerOpenId === mod.id && (
                                    <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 w-52">
                                        <div className="grid grid-cols-6 gap-1">
                                            {Object.entries(ICON_MAP).map(([name, Icon]) => (
                                                <button
                                                    key={name}
                                                    onClick={() => handleIconChange(mod, name)}
                                                    title={name}
                                                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                                        mod.icon === name ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'text-gray-600 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4"/>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Name / rename */}
                            <div className="flex-1 min-w-0">
                                {renamingId === mod.id ? (
                                    <div className="flex items-center gap-1">
                                        <Input
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            className="h-7 text-sm"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') commitRename(mod);
                                                if (e.key === 'Escape') setRenamingId(null);
                                            }}
                                        />
                                        <button onClick={() => commitRename(mod)} className="text-green-600 hover:text-green-700">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setRenamingId(null)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{mod.name}</span>
                                        <Badge variant={mod.type === 'core' ? 'secondary' : 'outline'} className="text-xs">
                                            {mod.type}
                                        </Badge>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 font-mono">/{mod.slug}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {/* Enable/disable toggle */}
                                <Switch
                                    checked={mod.enabled}
                                    onCheckedChange={() => handleToggle(mod)}
                                    disabled={savingId === mod.id}
                                />

                                {/* Rename (all modules) */}
                                <button
                                    onClick={() => startRename(mod)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Rename"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>

                                {/* Reset to default (core only) */}
                                {mod.type === 'core' && (() => {
                                    const d = CORE_DEFAULTS[mod.slug];
                                    const isChanged = d && (mod.name !== d.name || mod.icon !== d.icon);
                                    return isChanged ? (
                                        <button
                                            onClick={() => handleReset(mod)}
                                            disabled={savingId === mod.id}
                                            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                                            title="Reset to default"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    ) : null;
                                })()}

                                {/* Expand fields (all data modules) */}
                                {!['dashboard', 'settings'].includes(mod.slug) && (
                                    <button
                                        onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                    >
                                        {expandedId === mod.id
                                            ? <ChevronUp className="w-3.5 h-3.5" />
                                            : <ChevronDown className="w-3.5 h-3.5" />
                                        }
                                    </button>
                                )}

                                {/* Delete (custom only) */}
                                {mod.type === 'custom' && (
                                    <button
                                        onClick={() => handleDelete(mod)}
                                        disabled={savingId === mod.id}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                        {savingId === mod.id
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />
                                        }
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded: fields editor */}
                        {expandedId === mod.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                    {mod.type === 'core' ? 'Extra Fields' : 'Custom Fields'}
                                </p>
                                {mod.type === 'core' && (
                                    <p className="text-xs text-gray-400 mb-3">
                                        Add extra fields on top of the built-in ones. These are saved to the real database table and appear in the add/edit form.
                                    </p>
                                )}
                                <FieldsEditor moduleId={mod.id} hasDdlTable={mod.type === 'core' ? true : mod.has_table} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <AddTabModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={() => load()}
            />
        </div>
    );
}
