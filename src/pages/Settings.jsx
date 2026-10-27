import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Trash2, AlertTriangle, Shield, Sun, Moon, Monitor, Copy, Check, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAuthToken } from "@/api/dbClient";
import PermissionsMatrix from "@/components/settings/PermissionsMatrix";
import { useTheme } from "next-themes";

const API_BASE = "/api";

function authFetch(url, opts = {}) {
    return fetch(url, {
        ...opts,
        headers: {
            ...(opts.headers ?? {}),
            Authorization: `Bearer ${getAuthToken()}`,
        },
    });
}

export default function Settings() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState("data");
    const [stats, setStats] = useState({
        customers: 0, invoices: 0, payments: 0,
        employees: 0, clockIns: 0, appointments: 0,
    });
    const [loading, setLoading] = useState(false);
    const [businessInfo, setBusinessInfo] = useState(null);
    const [copied, setCopied] = useState(false);

    const canManagePerms = ['Admin', 'Manager'].includes(user?.role);

    useEffect(() => {
        authFetch(`${API_BASE}/settings/stats`)
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(err => console.error("Failed to load settings stats:", err));

        if (canManagePerms) {
            authFetch(`${API_BASE}/settings/business-info`)
                .then(r => r.json())
                .then(data => setBusinessInfo(data))
                .catch(err => console.error("Failed to load business info:", err));
        }
    }, []);

    const totalRecords =
        stats.customers + stats.invoices + stats.payments +
        stats.employees + stats.clockIns + stats.appointments;

    const copyCode = () => {
        if (!businessInfo?.businessCode) return;
        navigator.clipboard.writeText(businessInfo.businessCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const exportData = async () => {
        try {
            const res = await authFetch(`${API_BASE}/settings/export`);
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url  = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href     = url;
            link.download = `bizmate-data-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert("Failed to export data");
        }
    };

    const handleAIImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/ai-import`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAuthToken()}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                let msg = `Done: ${data.message}`;
                if (data.unmatchedCustomers?.length > 0) {
                    msg += `\n\nThe following invoices were imported but could not be matched to a customer (you can assign them manually):\n`;
                    msg += data.unmatchedCustomers
                        .map(u => `  • Invoice ${u.invoice_number} — "${u.customer_name}"`)
                        .join("\n");
                }
                alert(msg);
            } else {
                alert(`Error: ${data.error || "Import failed"}`);
            }
        } catch (err) {
            console.error("Import error:", err);
            alert("Import request failed");
        } finally {
            setLoading(false);
            event.target.value = "";
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-500 mt-2">Manage your data, backups, and role permissions</p>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-1">
                <button
                    onClick={() => setActiveTab("data")}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                        activeTab === "data"
                            ? "border-b-2 border-indigo-600 text-indigo-600"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Data Management
                </button>
                <button
                    onClick={() => setActiveTab("appearance")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                        activeTab === "appearance"
                            ? "border-b-2 border-indigo-600 text-indigo-600"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Sun className="w-4 h-4"/>
                    Appearance
                </button>
                {canManagePerms && (
                    <button
                        onClick={() => setActiveTab("permissions")}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                            activeTab === "permissions"
                                ? "border-b-2 border-indigo-600 text-indigo-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Shield className="w-4 h-4"/>
                        Permissions
                    </button>
                )}
            </div>

            {/* ── Data Tab ────────────────────────────────────────────────────── */}
            {activeTab === "data" && (
                <div className="max-w-4xl space-y-6">
                    {canManagePerms && businessInfo && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5"/>
                                    Business Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-500 mb-3">
                                    Share this code with employees or customers so they can join your workspace.
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-1">Business Name</div>
                                        <div className="font-medium">{businessInfo.name}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-1">Business Code</div>
                                        <div className="flex items-center gap-2">
                                            <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md font-mono text-sm font-semibold tracking-widest">
                                                {businessInfo.businessCode}
                                            </code>
                                            <button
                                                onClick={copyCode}
                                                className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                title="Copy code"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    ["Customers",    stats.customers],
                                    ["Invoices",     stats.invoices],
                                    ["Payments",     stats.payments],
                                    ["Employees",    stats.employees],
                                    ["Clock-ins",    stats.clockIns],
                                    ["Appointments", stats.appointments],
                                ].map(([label, value]) => (
                                    <div key={label} className="p-4 bg-gray-100 rounded-lg text-center">
                                        <div className="text-2xl font-bold">{value}</div>
                                        <div className="text-sm text-gray-500">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
                        <CardContent>
                            <Button
                                onClick={exportData}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={totalRecords === 0}
                            >
                                <Download className="w-4 h-4 mr-2"/>
                                Export All Data
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>AI Import</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <label
                                    htmlFor="ai-import"
                                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                                        loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                                    }`}
                                >
                                    <Upload className="w-4 h-4"/>
                                    {loading ? "Importing..." : "Import with AI"}
                                </label>
                                <input
                                    id="ai-import"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleAIImport}
                                    disabled={loading}
                                    className="hidden"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {user?.role === 'Admin' && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5"/>
                                    Danger Zone
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600 mb-4">
                                    Permanently delete all database records. This action cannot be undone.
                                </p>
                                <Button
                                    onClick={async () => {
                                        if (!window.confirm("Are you sure you want to delete all records?")) return;
                                        try {
                                            const res = await authFetch(`${API_BASE}/settings/reset`, { method: "DELETE" });
                                            const data = await res.json();
                                            if (res.ok) {
                                                alert("All data has been cleared");
                                                window.location.reload();
                                            } else {
                                                alert("Error: " + data.error);
                                            }
                                        } catch (err) {
                                            console.error("Reset error:", err);
                                            alert("Failed to reset data");
                                        }
                                    }}
                                    variant="destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    Reset All Data
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Appearance Tab ──────────────────────────────────────────────── */}
            {activeTab === "appearance" && (
                <div className="max-w-lg">
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4">
                                Choose how BizMate looks on your device. System follows your OS preference.
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: "light",  label: "Light",  Icon: Sun },
                                    { value: "dark",   label: "Dark",   Icon: Moon },
                                    { value: "system", label: "System", Icon: Monitor },
                                ].map(({ value, label, Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setTheme(value)}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                            theme === value
                                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400"
                                        }`}
                                    >
                                        <Icon className="w-6 h-6"/>
                                        <span className="text-sm font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Permissions Tab ─────────────────────────────────────────────── */}
            {activeTab === "permissions" && canManagePerms && (
                <div className="max-w-5xl">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold">Role Permissions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Control which tabs and features each role can access. Changes take effect immediately.
                        </p>
                    </div>
                    <PermissionsMatrix/>
                </div>
            )}
        </div>
    );
}
