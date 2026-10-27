import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

export default function EmployeeList({
    employees = [],
    onEdit,
    onDelete,
    selectedIds = new Set(),
    onToggleSelect,
}) {
    if (!Array.isArray(employees) || employees.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No employees yet. Add your first team member to get started.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => {
                const nameInitial = employee?.name
                    ? employee.name.charAt(0).toUpperCase()
                    : "?";
                const isSelected = selectedIds.has(employee.id);

                return (
                    <Card
                        key={employee.id || Math.random()}
                        className={`p-6 transition-colors ${isSelected ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/20" : ""}`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {onToggleSelect && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleSelect(employee.id)}
                                        className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-purple-600 font-bold text-lg">
                                        {nameInitial}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">
                                        {employee.name || "Unnamed"}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {employee.role || "No role"}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    employee.active
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                            >
                                {employee.active ? "Active" : "Inactive"}
                            </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Hourly Rate:</span>
                                <span className="font-medium text-gray-900">
                                    ${Number(employee.hourly_rate || 0).toFixed(2)}/hr
                                </span>
                            </div>

                            {employee.email && (
                                <div className="text-sm text-gray-600">{employee.email}</div>
                            )}
                            {employee.phone && (
                                <div className="text-sm text-gray-600">{employee.phone}</div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit && onEdit(employee)}
                                className="flex-1"
                            >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete && onDelete(employee.id)}
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
