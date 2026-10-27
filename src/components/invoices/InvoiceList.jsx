import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function InvoiceList({
    invoices = [],
    customers = [],
    onEdit,
    onDelete,
    selectedIds = new Set(),
    onToggleSelect,
    onToggleAll,
}) {
    const getCustomerName = (customerId) => {
        const customer = customers.find((c) => c.id === customerId);
        return customer?.name || "Unknown";
    };

    const safeFormatDate = (dateStr) => {
        try {
            if (!dateStr) return "—";
            return format(new Date(dateStr), "MMM dd, yyyy");
        } catch {
            return "—";
        }
    };

    const safeNumber = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const allSelected = invoices.length > 0 && selectedIds.size === invoices.length;

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b dark:bg-gray-800">
                    <tr>
                        {onToggleSelect && (
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleAll}
                                    className="w-4 h-4 accent-indigo-600"
                                />
                            </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Invoice #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                        </th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                    {Array.isArray(invoices) && invoices.length > 0 ? (
                        invoices.map((invoice) => {
                            const total = safeNumber(invoice.total);
                            const paid = safeNumber(invoice.paid_amount);
                            const balance = total - paid;
                            const isSelected = selectedIds.has(invoice.id);

                            let items = [];
                            try {
                                if (typeof invoice.items === "string") {
                                    items = JSON.parse(invoice.items);
                                } else if (Array.isArray(invoice.items)) {
                                    items = invoice.items;
                                }
                            } catch {
                                items = [];
                            }

                            return (
                                <tr
                                    key={invoice.id || Math.random()}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
                                >
                                    {onToggleSelect && (
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleSelect(invoice.id)}
                                                className="w-4 h-4 accent-indigo-600"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        #{invoice.invoice_number || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {getCustomerName(invoice.customer_id)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {safeFormatDate(invoice.date)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        ${formatter.format(total)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        ${formatter.format(paid)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        ${formatter.format(balance)}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                invoice.status === "paid"
                                                    ? "bg-green-100 text-green-800"
                                                    : invoice.status === "overdue"
                                                        ? "bg-red-100 text-red-800"
                                                        : invoice.status === "sent"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {invoice.status || "draft"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit && onEdit(invoice)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete && onDelete(invoice.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={onToggleSelect ? 9 : 8} className="text-center py-12 text-gray-500">
                                No invoices yet. Create your first invoice to get started.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
