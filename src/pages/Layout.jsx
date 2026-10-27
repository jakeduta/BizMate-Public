import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { usePermissions } from "@/context/PermissionsContext";
import {
    LayoutDashboard, FileText, CreditCard, Users, Clock,
    Calendar, UserCircle, Settings, LogOut, Layers,
    Box, Tag, Star, Folder, File, Briefcase, Package,
    List, Database, Clipboard, BarChart2, PieChart,
    Map, Globe, Grid3x3, Loader2, SlidersHorizontal, ShieldCheck, Receipt, TrendingUp,
} from "lucide-react";

const ICON_MAP = {
    LayoutDashboard, FileText, CreditCard, Users, Clock,
    Calendar, UserCircle, Settings, Layers, Box, Tag,
    Star, Folder, File, Briefcase, Package, List, Database,
    Clipboard, BarChart2, PieChart, Map, Globe, Grid3x3,
};

function ModuleIcon({ name, className }) {
    const Icon = ICON_MAP[name] ?? Layers;
    return <Icon className={className}/>;
}

const CORE_PATHS = {
    dashboard:    '/Dashboard',
    invoices:     '/Invoices',
    payments:     '/Payments',
    employees:    '/Employees',
    clockins:     '/ClockIns',
    appointments: '/Appointments',
    customers:    '/Customers',
    services:     '/Services',
    settings:     '/Settings',
};

// Maps module slugs to the permission key that controls sidebar visibility.
// Custom modules (not in this map) are always shown if enabled.
const MODULE_PERMISSION = {
    dashboard:    'module:dashboard:view',
    invoices:     'module:invoices:view',
    payments:     'module:payments:view',
    employees:    'module:employees:view',
    clockins:     'module:clockins:view',
    appointments: 'module:appointments:view',
    customers:    'module:customers:view',
    services:     'module:services:view',
    settings:     'feature:settings',
};

const ROLE_BADGE = {
    Admin:    { bg:'#f3e8ff', text:'#7c3aed' },
    Manager:  { bg:'#dbeafe', text:'#1d4ed8' },
    Employee: { bg:'#dcfce7', text:'#15803d' },
    Customer: { bg:'#f1f5f9', text:'#64748b' },
};

export default function Layout({ children, currentPageName }) {
    const location                   = useLocation();
    const { user, logout }           = useAuth();
    const { modules, loading, canCustomize } = useWorkspace();
    const { hasPermission }          = usePermissions();

    function getPath(mod) {
        if (mod.type === 'core') return CORE_PATHS[mod.slug] ?? createPageUrl(mod.name);
        return `/module/${mod.slug}`;
    }

    function isActive(mod) {
        return location.pathname.toLowerCase() === getPath(mod).toLowerCase();
    }

    const badge = user?.role ? (ROLE_BADGE[user.role] ?? ROLE_BADGE.Customer) : null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
            <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed h-full flex flex-col">
                {/* Brand */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="w-full flex justify-center">
                        <h1 className="text-4xl font-bold shimmer">BizMate</h1>
                    </div>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-1">Business Management</p>
                </div>

                {/* Nav */}
                <nav className="p-4 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300"/>
                        </div>
                    ) : (
                        <>
                            {modules
                                .filter(mod => {
                                    // If this slug has a permission key, check it
                                    const permKey = MODULE_PERMISSION[mod.slug];
                                    if (permKey) return hasPermission(permKey);
                                    // Custom modules without a key are shown to all
                                    return true;
                                })
                                .map(mod => (
                                    <Link
                                        key={mod.id}
                                        to={getPath(mod)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                                            isActive(mod)
                                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <ModuleIcon name={mod.icon} className="w-5 h-5 flex-shrink-0"/>
                                        <span className="font-medium truncate">{mod.name}</span>
                                    </Link>
                                ))
                            }

                            {(user?.role === 'Admin' || user?.role === 'Manager') && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-3"/>
                                    <Link
                                        to="/Analytics"
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                                            location.pathname === '/Analytics'
                                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <TrendingUp className="w-5 h-5 flex-shrink-0"/>
                                        <span className="font-medium">Analytics</span>
                                    </Link>
                                    <Link
                                        to="/TaxIntegration"
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                                            location.pathname === '/TaxIntegration'
                                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <Receipt className="w-5 h-5 flex-shrink-0"/>
                                        <span className="font-medium">Tax Integration</span>
                                    </Link>
                                </>
                            )}

                            {hasPermission('feature:member_management') && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-gray-800 my-3"/>
                                    <Link
                                        to="/Members"
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                                            location.pathname === '/Members'
                                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <ShieldCheck className="w-5 h-5 flex-shrink-0"/>
                                        <span className="font-medium">Members</span>
                                    </Link>
                                </>
                            )}

                            {hasPermission('feature:workspace_customize') && (
                                <>
                                    {!hasPermission('feature:member_management') && (
                                        <div className="border-t border-gray-100 dark:border-gray-800 my-3"/>
                                    )}
                                    <Link
                                        to="/Workspace"
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                                            location.pathname === '/Workspace'
                                                ? "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        <SlidersHorizontal className="w-5 h-5 flex-shrink-0"/>
                                        <span className="font-medium">Customize</span>
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </nav>

                {/* User footer */}
                {user && badge && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <span
                                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
                                    style={{ background: badge.bg, color: badge.text }}
                                >
                                    {user.role}
                                </span>
                                <p className="text-xs text-gray-400 truncate">{user.id?.slice(0, 8)}…</p>
                            </div>
                            <button
                                onClick={logout}
                                title="Sign out"
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                            >
                                <LogOut className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    );
}
