import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

export default function ClockInHistory({
                                           clockIns = [],
                                           employees = [],
                                           onDelete,
                                           onEdit,
                                           onEmployeePayroll
                                       }) {
    const getEmployeeName = (employeeId) => {
        const e = employees.find((x) => x.id === employeeId);
        return e?.name || "Unknown";
    };

    const completedClockIns = clockIns.filter(
        (c) => c && c.clock_out_time
    );

    const safeFormat = (dateStr) => {
        const d = new Date(dateStr);
        return isNaN(d) ? "-" : format(d, "MMM dd, yyyy HH:mm");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Clock-in History</CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">

                    {completedClockIns.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">

                            <td
                                className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer underline"
                                onClick={() =>
                                    onEmployeePayroll &&
                                    onEmployeePayroll(record.employee_id)
                                }
                            >
                                {getEmployeeName(record.employee_id)}
                            </td>

                            <td className="px-6 py-4 text-sm">{safeFormat(record.clock_in_time)}</td>
                            <td className="px-6 py-4 text-sm">{safeFormat(record.clock_out_time)}</td>
                            <td className="px-6 py-4 text-sm font-medium">
                                {Number(record.hours_worked).toFixed(2)}
                            </td>

                            <td className="px-6 py-4 text-sm">
                                {record.clock_in_lat != null && record.clock_in_lng != null ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${record.clock_in_lat},${record.clock_in_lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        {Number(record.clock_in_lat).toFixed(5)}, {Number(record.clock_in_lng).toFixed(5)}
                                    </a>
                                ) : (
                                    <span className="text-gray-400">—</span>
                                )}
                            </td>

                            <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onEdit && onEdit(record)}
                                >
                                    <Pencil className="w-4 h-4 text-indigo-600" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDelete(record.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                            </td>

                        </tr>
                    ))}

                    </tbody>
                </table>

                {completedClockIns.length === 0 && (
                    <p className="text-center py-8 text-gray-500">
                        No records yet
                    </p>
                )}
            </div>
        </Card>
    );
}
