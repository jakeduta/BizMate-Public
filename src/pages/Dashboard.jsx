import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
    FileText,
    DollarSign,
    AlertCircle,
    Users,
    Calendar,
    Clock,
    TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Invoice, Payment, Employee, ClockIn, Appointment } from "@/api/dbClient";
import { format } from "date-fns";
import PayrollModal from "@/components/clockins/PayrollModal";

export default function Dashboard() {
    const [showPayrollModal, setShowPayrollModal] = useState(false);

    // Fetch data using React Query
    const { data: invoices = [] } = useQuery({
        queryKey: ["invoices"],
        queryFn: () => Invoice.list(),
    });

    const { data: payments = [] } = useQuery({
        queryKey: ["payments"],
        queryFn: () => Payment.list(),
    });

    const { data: employees = [] } = useQuery({
        queryKey: ["employees"],
        queryFn: () => Employee.list(),
    });

    const { data: clockIns = [] } = useQuery({
        queryKey: ["clockIns"],
        queryFn: () => ClockIn.list(),
    });

    const { data: appointments = [] } = useQuery({
        queryKey: ["appointments"],
        queryFn: () => Appointment.list(),
    });

    // ============================
    // Business logic
    // ============================
    const totalInvoices = invoices.length;
    const totalPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const outstandingBalance = invoices
        .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled")
        .reduce((sum, inv) => {
            const total = Number(inv.total) || 0;
            const paid = Number(inv.paid_amount) || 0;
            return sum + Math.max(total - paid, 0);
        }, 0);

    const activeEmployees = employees.filter((e) => e.active ?? true).length;
    const currentlyClocked = clockIns.filter(
        (c) => c.clock_in_time && !c.clock_out_time
    ).length;

    const today = new Date().toISOString().split("T")[0];
    const upcomingAppointments = appointments.filter((a) => a.date >= today);

    const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const stats = [
        {
            title: "Total Invoices",
            value: totalInvoices,
            icon: FileText,
            color: "text-blue-600",
            bg: "bg-blue-50",
            link: "Invoices",
        },
        {
            title: "Total Payments",
            value: `$${formatter.format(totalPayments)}`,
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50",
            link: "Payments",
        },
        {
            title: "Outstanding",
            value: `$${formatter.format(outstandingBalance)}`,
            icon: AlertCircle,
            color: "text-orange-600",
            bg: "bg-orange-50",
            link: "Invoices",
        },
        {
            title: "Active Employees",
            value: activeEmployees,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50",
            link: "Employees",
        },
        {
            title: "Clocked In",
            value: currentlyClocked,
            icon: Clock,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            link: "ClockIns",
        },
        {
            title: "Upcoming Appointments",
            value: upcomingAppointments.length,
            icon: Calendar,
            color: "text-pink-600",
            bg: "bg-pink-50",
            link: "Appointments",
        },
    ];

    // ============================
    // Render
    // ============================
    return (
        <div className="p-8 overflow-hidden">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-2">
                        Welcome back! Here is your business overview.
                    </p>
                </div>

                {/* Payroll button */}
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 shadow-sm"
                    onClick={() => setShowPayrollModal(true)}
                >
                    <DollarSign className="w-4 h-4" />
                    Open Payroll
                </button>
            </div>

            {/* Statistic cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stats.map((stat) => (
                    <Link key={stat.title} to={createPageUrl(stat.link)}>
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-full ${stat.bg}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent invoices + upcoming appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Invoices */}
                <Card className="flex flex-col h-[400px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Recent Invoices
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2">
                        {recentInvoices.length > 0 ? (
                            <div className="space-y-3">
                                {recentInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                Invoice #{invoice.invoice_number}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(invoice.date), "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">
                                                ${Number(invoice.total || 0).toFixed(2)}
                                            </p>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                    invoice.status === "paid"
                                                        ? "bg-green-100 text-green-800"
                                                        : invoice.status === "overdue"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                }`}
                                            >
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No invoices yet</p>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Appointments */}
                <Card className="flex flex-col h-[400px]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-pink-600" />
                            Upcoming Appointments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2">
                        {upcomingAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingAppointments.slice(0, 10).map((apt) => (
                                    <div
                                        key={apt.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {apt.title || "Appointment"}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(apt.date), "MMM dd, yyyy")} at{" "}
                                                {apt.start_time || "TBD"}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                apt.status === "confirmed"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-blue-100 text-blue-800"
                                            }`}
                                        >
                                            {apt.status || "pending"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                No upcoming appointments
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {showPayrollModal && (
                <PayrollModal
                    employees={employees}
                    clockIns={clockIns}
                    onClose={() => setShowPayrollModal(false)}
                />
            )}
        </div>
    );
}
