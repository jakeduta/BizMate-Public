import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Invoice, Customer, Service } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import InvoiceList from "../components/invoices/InvoiceList";
import InvoiceModal from "../components/invoices/InvoiceModal";

export default function Invoices() {
    const [showModal, setShowModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const queryClient = useQueryClient();

    const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
        queryKey: ["invoices"],
        queryFn: () => Invoice.list(),
    });

    const { data: customers = [], isLoading: loadingCustomers } = useQuery({
        queryKey: ["customers"],
        queryFn: () => Customer.list(),
    });

    const { data: services = [] } = useQuery({
        queryKey: ["services"],
        queryFn: () => Service.list(),
    });

    const createInvoice = useMutation({
        mutationFn: async (data) => {
            return Invoice.create({
                ...data,
                created_by: "system",
                status: data.status || "draft",
                date: data.date || new Date().toISOString().split("T")[0],
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            setShowModal(false);
            setEditingInvoice(null);
        },
    });

    const updateInvoice = useMutation({
        mutationFn: async ({ id, data }) =>
            Invoice.update(id, {
                ...data,
                updated_date: new Date().toISOString(),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
            setShowModal(false);
            setEditingInvoice(null);
        },
    });

    const deleteInvoice = useMutation({
        mutationFn: async (id) => Invoice.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["invoices"]);
        },
    });

    const handleEdit = (invoice) => {
        setEditingInvoice(invoice);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
            deleteInvoice.mutate(id);
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
        if (selectedIds.size === invoices.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(invoices.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} invoice(s)? This cannot be undone.`)) return;
        await Promise.all([...selectedIds].map(id => Invoice.delete(id)));
        setSelectedIds(new Set());
        queryClient.invalidateQueries(["invoices"]);
    };

    if (loadingInvoices || loadingCustomers) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500 text-lg">Loading invoices...</p>
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                    <Button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Invoice
                    </Button>
                </div>
                <p className="text-gray-500">No invoices yet. Create your first invoice below!</p>

                {showModal && (
                    <InvoiceModal
                        invoice={editingInvoice}
                        customers={customers}
                        services={services}
                        onClose={() => {
                            setShowModal(false);
                            setEditingInvoice(null);
                        }}
                        onSave={(data) => createInvoice.mutate(data)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 mt-2">
                        Manage your invoices, due dates, and payment tracking
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
                        onClick={() => {
                            setEditingInvoice(null);
                            setShowModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Invoice
                    </Button>
                </div>
            </div>

            <InvoiceList
                invoices={invoices}
                customers={customers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleAll={handleToggleAll}
            />

            {showModal && (
                <InvoiceModal
                    invoice={editingInvoice}
                    customers={customers}
                    services={services}
                    onClose={() => {
                        setShowModal(false);
                        setEditingInvoice(null);
                    }}
                    onSave={(data) => {
                        if (editingInvoice) {
                            updateInvoice.mutate({ id: editingInvoice.id, data });
                        } else {
                            createInvoice.mutate(data);
                        }
                    }}
                />
            )}
        </div>
    );
}
