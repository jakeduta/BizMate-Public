import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Employee } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import EmployeeList from "../components/employees/EmployeeList";
import EmployeeModal from "../components/employees/EmployeeModal";

export default function Employees() {
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const queryClient = useQueryClient();

    const {
        data: employees = [],
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const result = await Employee.list();
            return Array.isArray(result) ? result : [];
        },
    });

    const createEmployee = useMutation({
        mutationFn: async (data) => Employee.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(["employees"]);
            setShowModal(false);
            setEditingEmployee(null);
        },
    });

    const updateEmployee = useMutation({
        mutationFn: async ({ id, data }) => Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["employees"]);
            setShowModal(false);
            setEditingEmployee(null);
        },
    });

    const deleteEmployee = useMutation({
        mutationFn: async (id) => Employee.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["employees"]);
        },
    });

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this employee?")) {
            deleteEmployee.mutate(id);
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
        if (selectedIds.size === employees.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(employees.map(e => e.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} employee(s)? This cannot be undone.`)) return;
        await Promise.all([...selectedIds].map(id => Employee.delete(id)));
        setSelectedIds(new Set());
        queryClient.invalidateQueries(["employees"]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-500">
                Loading employees...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500">
                Failed to load employees: {error.message}
            </div>
        );
    }

    const allSelected = employees.length > 0 && selectedIds.size === employees.length;

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
                    <p className="text-gray-500 mt-2">Manage your team members</p>
                </div>
                <div className="flex items-center gap-3">
                    {employees.length > 0 && (
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
                            setEditingEmployee(null);
                            setShowModal(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Employee
                    </Button>
                </div>
            </div>

            <EmployeeList
                employees={Array.isArray(employees) ? employees : []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
            />

            {showModal && (
                <EmployeeModal
                    employee={editingEmployee}
                    onClose={() => {
                        setShowModal(false);
                        setEditingEmployee(null);
                    }}
                    onSave={(data) => {
                        if (editingEmployee) {
                            updateEmployee.mutate({ id: editingEmployee.id, data });
                        } else {
                            createEmployee.mutate(data);
                        }
                    }}
                />
            )}
        </div>
    );
}
