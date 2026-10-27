import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Customer, Invoice, Appointment } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import CustomerList from "../components/customers/CustomerList";
import CustomerModal from "../components/customers/CustomerModal";

export default function Customers() {
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const queryClient = useQueryClient();

    // Customers
    const {
        data: customers = [],
        isLoading: loadingCustomers,
        isError: customersError,
        error: customersErrObj,
    } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const result = await Customer.list();
            return Array.isArray(result) ? result : [];
        },
    });

    // Invoices
    const { data: invoices = [] } = useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const result = await Invoice.list();
            return Array.isArray(result) ? result : [];
        },
    });

    // Appointments
    const { data: appointments = [] } = useQuery({
        queryKey: ["appointments"],
        queryFn: async () => {
            const result = await Appointment.list();
            return Array.isArray(result) ? result : [];
        },
    });

    // Create
    const createCustomer = useMutation({
        mutationFn: (data) => Customer.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(["customers"]);
            setShowModal(false);
            setEditingCustomer(null);
        },
    });

    // Update
    const updateCustomer = useMutation({
        mutationFn: ({ id, data }) => Customer.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["customers"]);
            setShowModal(false);
            setEditingCustomer(null);
        },
    });

    // Delete
    const deleteCustomer = useMutation({
        mutationFn: (id) => Customer.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["customers"]);
        },
    });

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this customer")) {
            deleteCustomer.mutate(id);
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
        if (selectedIds.size === customers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(customers.map(c => c.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} customer(s)? This cannot be undone.`)) return;
        await Promise.all([...selectedIds].map(id => Customer.delete(id)));
        setSelectedIds(new Set());
        queryClient.invalidateQueries(["customers"]);
    };

    if (loadingCustomers) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500 text-lg">
                Loading customers...
            </div>
        );
    }

    if (customersError) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500 text-lg">
                Failed to load customers: {customersErrObj.message}
            </div>
        );
    }

    const allSelected = customers.length > 0 && selectedIds.size === customers.length;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500 mt-2">Manage your client information</p>
                </div>
                <div className="flex items-center gap-3">
                    {customers.length > 0 && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleToggleAll}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            Select All
                        </label>
                    )}
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
                            setEditingCustomer(null);
                            setShowModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                    </Button>
                </div>
            </div>

            <CustomerList
                customers={Array.isArray(customers) ? customers : []}
                invoices={Array.isArray(invoices) ? invoices : []}
                appointments={Array.isArray(appointments) ? appointments : []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
            />

            {showModal && (
                <CustomerModal
                    customer={editingCustomer}
                    onClose={() => {
                        setShowModal(false);
                        setEditingCustomer(null);
                    }}
                    onSave={(data) => {
                        if (editingCustomer) {
                            updateCustomer.mutate({ id: editingCustomer.id, data });
                        } else {
                            createCustomer.mutate(data);
                        }
                    }}
                />
            )}
        </div>
    );
}
