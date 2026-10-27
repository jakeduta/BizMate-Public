import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Payment as PaymentAPI, Invoice } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import PaymentList from "../components/payments/PaymentList";
import PaymentModal from "../components/payments/PaymentModal";

export default function Payments() {
    const [showModal, setShowModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const queryClient = useQueryClient();

    const { data: payments = [], isLoading: loadingPayments } = useQuery({
        queryKey: ["payments"],
        queryFn: () => PaymentAPI.list(),
    });

    const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ["invoices"],
        queryFn: () => Invoice.list(),
    });

    const createPayment = useMutation({
        mutationFn: async (data) => {
            await PaymentAPI.create({
                ...data,
                created_by: "system",
                date: data.date || new Date().toISOString().split("T")[0],
            });

            const invoice = invoices.find((i) => i.id === data.invoice_id);
            if (invoice) {
                const newPaid = (invoice.paid_amount || 0) + parseFloat(data.amount);
                const newStatus = newPaid >= invoice.total ? "paid" : "sent";

                await Invoice.update(invoice.id, {
                    paid_amount: newPaid,
                    status: newStatus,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["payments"]);
            queryClient.invalidateQueries(["invoices"]);
            setShowModal(false);
        },
    });

    const deletePayment = useMutation({
        mutationFn: async (payment) => {
            await PaymentAPI.delete(payment.id);

            const invoice = invoices.find((i) => i.id === payment.invoice_id);
            if (invoice) {
                const newPaid = Math.max(0, (invoice.paid_amount || 0) - payment.amount);
                const newStatus =
                    newPaid === 0 ? "sent" : newPaid >= invoice.total ? "paid" : "partial";

                await Invoice.update(invoice.id, {
                    paid_amount: newPaid,
                    status: newStatus,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["payments"]);
            queryClient.invalidateQueries(["invoices"]);
        },
    });

    const handleDelete = (payment) => {
        if (window.confirm("Are you sure you want to delete this payment?")) {
            deletePayment.mutate(payment);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleToggleAll = () => {
        if (selectedIds.size === payments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(payments.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} payment(s)? Invoice balances will be recalculated. This cannot be undone.`)) return;

        const selected = payments.filter(p => selectedIds.has(p.id));

        // Delete all selected payments
        await Promise.all(selected.map(p => PaymentAPI.delete(p.id)));

        // Group total deductions by invoice_id
        const deductions = {};
        for (const p of selected) {
            deductions[p.invoice_id] = (deductions[p.invoice_id] || 0) + parseFloat(p.amount || 0);
        }

        // Recalculate each affected invoice
        await Promise.all(
            Object.entries(deductions).map(([invoiceId, deducted]) => {
                const invoice = invoices.find(i => i.id === invoiceId);
                if (!invoice) return Promise.resolve();
                const newPaid = Math.max(0, (invoice.paid_amount || 0) - deducted);
                const newStatus = newPaid === 0 ? "sent" : newPaid >= invoice.total ? "paid" : "partial";
                return Invoice.update(invoiceId, { paid_amount: newPaid, status: newStatus });
            })
        );

        setSelectedIds(new Set());
        queryClient.invalidateQueries(["payments"]);
        queryClient.invalidateQueries(["invoices"]);
    };

    if (loadingPayments || loadingInvoices) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500 text-lg">Loading payments...</p>
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                    <Button
                        onClick={() => setShowModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Payment
                    </Button>
                </div>
                <p className="text-gray-500">
                    No payments recorded yet. Add a payment to track invoices.
                </p>

                {showModal && (
                    <PaymentModal
                        invoices={invoices}
                        onClose={() => setShowModal(false)}
                        onSave={(data) => createPayment.mutate(data)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 mt-2">
                        Record and manage payments linked to invoices
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Selected ({selectedIds.size})
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Payment
                    </Button>
                </div>
            </div>

            <PaymentList
                payments={payments}
                invoices={invoices}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
            />

            {showModal && (
                <PaymentModal
                    invoices={invoices}
                    onClose={() => setShowModal(false)}
                    onSave={(data) => createPayment.mutate(data)}
                />
            )}
        </div>
    );
}
