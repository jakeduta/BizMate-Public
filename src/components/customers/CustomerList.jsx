import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Mail, Phone, Building2, FileText, Calendar } from "lucide-react";

export default function CustomerList({
    customers = [],
    invoices = [],
    appointments = [],
    onEdit,
    onDelete,
    selectedIds = new Set(),
    onToggleSelect,
}) {

    const formatPhone = (phone) => {
        if (!phone) return "";
        const cleaned = phone.toString().replace(/\D/g, "");
        if (cleaned.length === 10) {
            const p1 = cleaned.slice(0, 3);
            const p2 = cleaned.slice(3, 6);
            const p3 = cleaned.slice(6);
            return `(${p1}) ${p2}-${p3}`;
        }
        if (cleaned.length === 11 && cleaned.startsWith("1")) {
            const p1 = cleaned.slice(1, 4);
            const p2 = cleaned.slice(4, 7);
            const p3 = cleaned.slice(7);
            return `+1 (${p1}) ${p2}-${p3}`;
        }
        return phone;
    };

    const formatMoney = (value) => {
        const num = Number(value) || 0;
        return num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getCustomerStats = (customerId) => {
        const safeInvoices = Array.isArray(invoices) ? invoices : [];
        const safeAppointments = Array.isArray(appointments) ? appointments : [];

        const customerInvoices = safeInvoices.filter(
            (inv) => inv.customer_id === customerId
        );

        const customerAppointments = safeAppointments.filter(
            (apt) => apt.customer_id === customerId
        );

        const totalSpent = customerInvoices.reduce(
            (sum, inv) => sum + (Number(inv.total) || 0),
            0
        );

        return {
            invoiceCount: customerInvoices.length,
            appointmentCount: customerAppointments.length,
            totalSpent,
        };
    };

    if (!Array.isArray(customers) || customers.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No customers yet. Add your first customer to get started.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => {
                const stats = getCustomerStats(customer.id);
                const isSelected = selectedIds.has(customer.id);

                return (
                    <Card
                        key={customer.id}
                        className={`p-6 transition-colors ${isSelected ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {onToggleSelect && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleSelect(customer.id)}
                                        className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-bold text-lg">
                                        {customer.name?.charAt(0)?.toUpperCase() || "?"}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{customer.name || "Unnamed"}</h3>
                                    {customer.company && (
                                        <p className="text-sm text-gray-500 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {customer.company}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            {customer.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="w-4 h-4" />
                                    {customer.email}
                                </div>
                            )}

                            {customer.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    {formatPhone(customer.phone)}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                    <FileText className="w-3 h-3" />
                                </div>
                                <div className="font-bold text-gray-900">{stats.invoiceCount}</div>
                                <div className="text-xs text-gray-500">Invoices</div>
                            </div>

                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                    <Calendar className="w-3 h-3" />
                                </div>
                                <div className="font-bold text-gray-900">{stats.appointmentCount}</div>
                                <div className="text-xs text-gray-500">Appointments</div>
                            </div>

                            <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Total</div>
                                <div className="font-bold text-green-600">
                                    ${formatMoney(stats.totalSpent)}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit && onEdit(customer)}
                                className="flex-1"
                            >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete && onDelete(customer.id)}
                            >
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
