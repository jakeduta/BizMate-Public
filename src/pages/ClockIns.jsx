import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClockIn, Employee } from "@/api/dbClient";
import ClockInPanel from "../components/clockins/ClockInPanel";
import ClockInHistory from "../components/clockins/ClockInHistory";
import PayrollModal from "@/components/clockins/PayrollModal";
import EditClockInModal from "@/components/clockins/EditClockInModal";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("ClockIns render crash:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: "40px",
                    color: "red",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap"
                }}>
                    <h2>Clock-ins crashed:</h2>
                    <p>{this.state.error?.toString()}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function ClockIns() {

    const queryClient = useQueryClient();

    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);

    const openPayrollForEmployee = (employeeId) => {
        setSelectedEmployeeId(employeeId);
        setShowPayrollModal(true);
    };

    const {
        data: employeesData,
        isLoading: loadingEmployees,
        error: employeesError
    } = useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const res = await Employee.list();
            return Array.isArray(res) ? res : [];
        }
    });

    const {
        data: clockInsData,
        isLoading: loadingClockIns,
        error: clockInsError
    } = useQuery({
        queryKey: ["clockins"],
        queryFn: async () => {
            const res = await ClockIn.list();
            return Array.isArray(res) ? res : [];
        }
    });

    const employees = employeesData || [];
    const clockIns = clockInsData || [];

    const clockInMutation = useMutation({
        mutationFn: async ({ employeeId, coords }) => {
            return await ClockIn.clockIn(employeeId, coords);
        },
        onSuccess: () => queryClient.invalidateQueries(["clockins"])
    });

    const clockOutMutation = useMutation({
        mutationFn: async (record) => {
            return await ClockIn.clockOut(record.id);
        },
        onSuccess: () => queryClient.invalidateQueries(["clockins"])
    });

    const editMutation = useMutation({
        mutationFn: async ({ id, data }) => ClockIn.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["clockins"]);
            setEditingRecord(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await ClockIn.delete(id);
        },
        onSuccess: () => queryClient.invalidateQueries(["clockins"])
    });

    const handleDelete = (id) => {
        if (window.confirm("Delete this clock-in record?")) {
            deleteMutation.mutate(id);
        }
    };

    if (loadingEmployees || loadingClockIns) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500 text-lg">Loading clock-in data</p>
            </div>
        );
    }

    if (employeesError || clockInsError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-red-500 text-lg">
                    Failed to load clock-in data
                </p>
            </div>
        );
    }

    const activeEmployees = employees.filter((e) => e?.active !== false);

    return (
        <ErrorBoundary>
            <div className="p-8">

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Clock-ins</h1>
                    <p className="text-gray-500 mt-2">
                        Track employee work hours smoothly
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ClockInPanel
                        employees={activeEmployees}
                        clockIns={clockIns}
                        onClockIn={(employeeId, coords) => clockInMutation.mutate({ employeeId, coords })}
                        onClockOut={(record) => clockOutMutation.mutate(record)}

                        onEmployeePayroll={(employeeId) => {
                            openPayrollForEmployee(employeeId);
                        }}
                    />
                </div>

                <ClockInHistory
                    clockIns={clockIns}
                    employees={employees}
                    onDelete={handleDelete}
                    onEdit={(record) => setEditingRecord(record)}
                    onEmployeePayroll={(employeeId) => {
                        openPayrollForEmployee(employeeId);
                    }}
                />

                {editingRecord && (
                    <EditClockInModal
                        record={editingRecord}
                        employeeName={employees.find(e => e.id === editingRecord.employee_id)?.name || "Unknown"}
                        onSave={(id, data) => editMutation.mutate({ id, data })}
                        onClose={() => setEditingRecord(null)}
                    />
                )}

                {showPayrollModal && (
                    <PayrollModal
                        employees={employees}
                        clockIns={clockIns}
                        selectedEmployeeId={selectedEmployeeId}
                        onClose={() => setShowPayrollModal(false)}
                    />
                )}

            </div>
        </ErrorBoundary>
    );
}
