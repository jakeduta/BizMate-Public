import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/context/PermissionsContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

// ── Permission key metadata ───────────────────────────────────────────────────
// Groups and human-readable labels for display in the matrix.

const PERMISSION_GROUPS = [
    {
        label: 'Dashboard',
        keys: ['module:dashboard:view'],
        keyLabels: { 'module:dashboard:view': 'View Dashboard' },
    },
    {
        label: 'Invoices',
        keys: ['module:invoices:view','module:invoices:create','module:invoices:edit','module:invoices:delete'],
        keyLabels: {
            'module:invoices:view':   'View',
            'module:invoices:create': 'Create',
            'module:invoices:edit':   'Edit',
            'module:invoices:delete': 'Delete',
        },
    },
    {
        label: 'Payments',
        keys: ['module:payments:view','module:payments:create','module:payments:edit','module:payments:delete'],
        keyLabels: {
            'module:payments:view':   'View',
            'module:payments:create': 'Create',
            'module:payments:edit':   'Edit',
            'module:payments:delete': 'Delete',
        },
    },
    {
        label: 'Employees',
        keys: ['module:employees:view','module:employees:create','module:employees:edit','module:employees:delete'],
        keyLabels: {
            'module:employees:view':   'View',
            'module:employees:create': 'Create',
            'module:employees:edit':   'Edit',
            'module:employees:delete': 'Delete',
        },
    },
    {
        label: 'Clock-ins',
        keys: ['module:clockins:view','module:clockins:create'],
        keyLabels: {
            'module:clockins:view':   'View',
            'module:clockins:create': 'Clock In / Out',
        },
    },
    {
        label: 'Appointments',
        keys: ['module:appointments:view','module:appointments:create','module:appointments:edit','module:appointments:delete'],
        keyLabels: {
            'module:appointments:view':   'View',
            'module:appointments:create': 'Create',
            'module:appointments:edit':   'Edit',
            'module:appointments:delete': 'Delete',
        },
    },
    {
        label: 'Customers',
        keys: ['module:customers:view','module:customers:create','module:customers:edit','module:customers:delete'],
        keyLabels: {
            'module:customers:view':   'View',
            'module:customers:create': 'Create',
            'module:customers:edit':   'Edit',
            'module:customers:delete': 'Delete',
        },
    },
    {
        label: 'Services',
        keys: ['module:services:view','module:services:create','module:services:edit','module:services:delete'],
        keyLabels: {
            'module:services:view':   'View',
            'module:services:create': 'Create',
            'module:services:edit':   'Edit',
            'module:services:delete': 'Delete',
        },
    },
    {
        label: 'Features',
        keys: ['feature:analytics','feature:member_management','feature:workspace_customize','feature:settings','feature:export'],
        keyLabels: {
            'feature:analytics':           'Dashboard Analytics',
            'feature:member_management':   'Manage Members',
            'feature:workspace_customize': 'Customize Workspace',
            'feature:settings':            'Settings Page',
            'feature:export':              'Export Data',
        },
    },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function getGranted(matrix, role, key) {
    const row = matrix.find(p => p.role === role && p.permission_key === key);
    return row ? Boolean(row.granted) : false;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PermissionsMatrix() {
    const { user } = useAuth();
    const { loadMatrix, updatePermission, matrix, allKeys } = usePermissions();
    const [loadingMatrix, setLoadingMatrix] = useState(false);
    const [toggling, setToggling] = useState(null); // "role:key" while saving

    const isAdmin = user?.role === 'Admin';

    // Columns the current user can edit
    const editableRoles = isAdmin
        ? ['Manager', 'Employee', 'Customer']
        : ['Employee', 'Customer']; // Manager cannot edit Manager

    useEffect(() => {
        setLoadingMatrix(true);
        loadMatrix().finally(() => setLoadingMatrix(false));
    }, []);

    async function handleToggle(role, key, currentValue) {
        const toggleId = `${role}:${key}`;
        setToggling(toggleId);
        try {
            await updatePermission(role, key, !currentValue);
        } catch (err) {
            alert(`Failed to update permission: ${err.message}`);
        } finally {
            setToggling(null);
        }
    }

    if (loadingMatrix) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2"/>
                <span className="text-gray-500">Loading permissions…</span>
            </div>
        );
    }

    return (
        <div>
            {/* Admin immutability notice */}
            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-6">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"/>
                <div>
                    <p className="text-sm font-semibold text-indigo-800">Admin has full access</p>
                    <p className="text-sm text-indigo-700 mt-0.5">
                        Admin permissions are immutable and cannot be changed. Configure permissions for
                        Manager, Employee, and Customer roles below.
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-3 font-semibold text-gray-700 w-64">Permission</th>
                            {/* Admin (read-only) */}
                            <th className="text-center px-4 py-3 font-semibold text-purple-700 w-28">
                                <div className="flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-4 h-4"/>
                                    Admin
                                </div>
                                <div className="text-xs font-normal text-purple-500">Full access</div>
                            </th>
                            {/* Manager */}
                            <th className="text-center px-4 py-3 font-semibold text-blue-700 w-28">
                                Manager
                                {!isAdmin && <div className="text-xs font-normal text-blue-400">Read-only</div>}
                            </th>
                            {/* Employee */}
                            <th className="text-center px-4 py-3 font-semibold text-green-700 w-28">Employee</th>
                            {/* Customer */}
                            <th className="text-center px-4 py-3 font-semibold text-gray-600 w-28">Customer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSION_GROUPS.map(group => (
                            <React.Fragment key={group.label}>
                                {/* Group header row */}
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <td
                                        colSpan={5}
                                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500"
                                    >
                                        {group.label}
                                    </td>
                                </tr>
                                {/* Permission rows */}
                                {group.keys.map(key => {
                                    const label = group.keyLabels[key] ?? key;
                                    return (
                                        <tr
                                            key={key}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-2.5 pl-8 text-gray-700">{label}</td>

                                            {/* Admin — always on, read-only */}
                                            <td className="text-center px-4 py-2.5">
                                                <Switch checked={true} disabled className="opacity-50"/>
                                            </td>

                                            {/* Manager, Employee, Customer */}
                                            {['Manager', 'Employee', 'Customer'].map(role => {
                                                const granted   = getGranted(matrix, role, key);
                                                const canEdit   = editableRoles.includes(role);
                                                const toggleId  = `${role}:${key}`;
                                                const isSaving  = toggling === toggleId;

                                                return (
                                                    <td key={role} className="text-center px-4 py-2.5">
                                                        {canEdit ? (
                                                            <div className="flex items-center justify-center">
                                                                {isSaving ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400"/>
                                                                ) : (
                                                                    <Switch
                                                                        checked={granted}
                                                                        onCheckedChange={() => handleToggle(role, key, granted)}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            // Manager column for Manager-level user — read-only
                                                            <Switch checked={granted} disabled className="opacity-60"/>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3"/>
                Changes take effect immediately. Employees and Customers must log out and back in to see sidebar changes.
            </p>
        </div>
    );
}
