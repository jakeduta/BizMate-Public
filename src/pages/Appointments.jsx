import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Appointment, Customer } from "@/api/dbClient"; // Connects to local backend API
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AppointmentCalendar from "../components/appointments/AppointmentCalendar";
import AppointmentModal from "../components/appointments/AppointmentModal";

export default function Appointments() {
    // === STATE MANAGEMENT ===
    const [showModal, setShowModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const queryClient = useQueryClient();

    // === FETCH APPOINTMENTS ===
    const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
        queryKey: ["appointments"],
        queryFn: () => Appointment.list(),
    });

    // === FETCH CUSTOMERS ===
    const { data: customers = [], isLoading: loadingCustomers } = useQuery({
        queryKey: ["customers"],
        queryFn: () => Customer.list(),
    });

    // === MUTATIONS ===
    const createAppointment = useMutation({
        mutationFn: (data) => Appointment.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(["appointments"]);
            setShowModal(false);
            setEditingAppointment(null);
        },
    });

    const updateAppointment = useMutation({
        mutationFn: ({ id, data }) => Appointment.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(["appointments"]);
            setShowModal(false);
            setEditingAppointment(null);
        },
    });

    const deleteAppointment = useMutation({
        mutationFn: (id) => Appointment.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["appointments"]);
        },
    });

    // === HANDLERS ===
    const handleEdit = (appointment) => {
        setEditingAppointment(appointment);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this appointment?")) {
            deleteAppointment.mutate(id);
        }
    };

    // === RENDER ===
    if (loadingAppointments || loadingCustomers) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-gray-500 text-lg">Loading data...</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* ==== HEADER ==== */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-gray-500 mt-2">
                        Schedule and manage customer appointments
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingAppointment(null);
                        setShowModal(true);
                    }}
                    className="bg-pink-600 hover:bg-pink-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Appointment
                </Button>
            </div>

            {/* ==== APPOINTMENT TABLE / CALENDAR ==== */}
            <AppointmentCalendar
                appointments={appointments}
                customers={customers}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {/* ==== MODAL ==== */}
            {showModal && (
                <AppointmentModal
                    appointment={editingAppointment}
                    customers={customers}
                    onClose={() => {
                        setShowModal(false);
                        setEditingAppointment(null);
                    }}
                    onSave={(data) => {
                        if (editingAppointment) {
                            updateAppointment.mutate({ id: editingAppointment.id, data });
                        } else {
                            createAppointment.mutate(data);
                        }
                    }}
                />
            )}
        </div>
    );
}
