import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Database, AlertTriangle } from 'lucide-react';

const ICON_OPTIONS = [
    'Layers', 'Box', 'Tag', 'Star', 'Folder', 'File',
    'Briefcase', 'Package', 'List', 'Grid3x3', 'Database',
    'Clipboard', 'BarChart2', 'PieChart', 'Map', 'Globe',
];

// Mirror of the backend buildTableName logic so we can show a preview
function buildTableNamePreview(businessId, name) {
    if (!businessId || !name.trim()) return null;
    const prefix  = businessId.replace(/-/g, '').substring(0, 8).toLowerCase();
    const slug    = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').substring(0, 40);
    const safSlug = slug.replace(/[^a-z0-9_]/g, '_');
    if (!safSlug) return null;
    return `cm_${prefix}_${safSlug}`;
}

export default function AddTabModal({ open, onClose, onCreated }) {
    const { createModule } = useWorkspace();
    const { user }         = useAuth();
    const [name, setName]   = useState('');
    const [icon, setIcon]   = useState('Layers');
    const [error, setError] = useState('');
    const [busy, setBusy]   = useState(false);

    const tablePreview = buildTableNamePreview(user?.businessId, name);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) { setError('Module name is required'); return; }

        setBusy(true);
        try {
            const mod = await createModule(name.trim(), icon);
            setName('');
            setIcon('Layers');
            setError('');
            onCreated?.(mod);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Tab</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                            {error}
                        </p>
                    )}

                    {/* Real table notice */}
                    <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"/>
                        <div className="text-amber-800">
                            <span className="font-semibold">A real MySQL table will be created.</span>{" "}
                            Field names are permanent after creation. Deleting a field permanently
                            removes all data in that column.
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="tabName">Module Name</Label>
                        <Input
                            id="tabName"
                            placeholder="e.g. Projects, Vendors, Contracts…"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            autoFocus
                        />
                        {tablePreview && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <Database className="w-3.5 h-3.5 text-gray-400"/>
                                <p className="text-xs text-gray-400">
                                    Table: <code className="font-mono text-gray-600">{tablePreview}</code>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Icon</Label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {ICON_OPTIONS.map(ic => (
                                <button
                                    key={ic}
                                    type="button"
                                    onClick={() => setIcon(ic)}
                                    title={ic}
                                    className={`p-2 rounded-lg text-xs font-mono border transition-all
                                        ${icon === ic
                                            ? 'bg-blue-50 border-blue-500 text-blue-600'
                                            : 'border-gray-200 hover:border-gray-400 text-gray-500'
                                        }`}
                                >
                                    {ic.slice(0, 2)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={busy}>
                            {busy
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating…</>
                                : 'Create Tab'
                            }
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
