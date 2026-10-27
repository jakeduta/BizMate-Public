import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function PaymentList({
    payments = [],
    invoices = [],
    onDelete,
    selectedIds = new Set(),
    onToggleSelect,
    onToggleAll,
}) {
    const getInvoiceNumber = (invoiceId) => {
        const invoice = invoices?.find((inv) => inv?.id === invoiceId);
        return invoice?.invoice_number || "Unknown";
    };

    const safeFormatDate = (dateStr) => {
        if (!dateStr) return "-";
        const parsed = new Date(dateStr);
        return isNaN(parsed) ? "-" : format(parsed, "MMM dd, yyyy");
    };

    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const allSelected = payments.length > 0 && selectedIds.size === payments.length;

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
                            Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Reference
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                        </th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                    {(payments || []).map((payment) => {
                        const isSelected = selectedIds.has(payment?.id);
                        return (
                            <tr
                                key={payment?.id || Math.random()}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
                            >
                                {onToggleSelect && (
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => payment?.id && onToggleSelect(payment.id)}
                                            className="w-4 h-4 accent-indigo-600"
                                        />
                                    </td>
                                )}
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {safeFormatDate(payment?.date)}
                                </td>

                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    #{getInvoiceNumber(payment?.invoice_id)}
                                </td>

                                <td className="px-6 py-4 text-sm font-bold text-green-600">
                                    {payment?.amount != null
                                        ? `$${formatter.format(Number(payment.amount))}`
                                        : "-"}
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-900">
                                    <span className="capitalize">
                                        {payment?.payment_method
                                            ? payment.payment_method.replace(/_/g, " ")
                                            : "-"}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {payment?.reference || "-"}
                                </td>

                                <td className="px-6 py-4 text-right text-sm">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => payment?.id && onDelete(payment)}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>

                {(payments || []).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No payments recorded yet. Record your first payment to get started.
                    </div>
                )}
            </div>
        </Card>
    );
}
