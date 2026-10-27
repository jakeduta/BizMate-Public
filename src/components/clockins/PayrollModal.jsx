import React, { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DollarSign, Clock, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

// Helper: compute date range for the selected period
function computeDateRange(timePeriod, customStart, customEnd) {
    const now = new Date();

    switch (timePeriod) {
        case "weekly": {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return { start: weekAgo, end: now };
        }
        case "biweekly": {
            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            return { start: twoWeeksAgo, end: now };
        }
        case "monthly": {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return { start: monthAgo, end: now };
        }
        case "annually": {
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: now,
            };
        }
        case "custom": {
            return {
                start: customStart ? new Date(customStart) : new Date(0),
                end: customEnd ? new Date(customEnd) : now,
            };
        }
        default:
            return { start: new Date(0), end: now };
    }
}

// Helper: week key for overtime grouping (ISO week style)
function getWeekKey(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 1 - 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
}

// PDF: summary payroll
function generateSummaryPdf(payrollData, periodText, dateRange) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo placeholder top right
    doc.rect(pageWidth - 50, 10, 40, 20);
    doc.setFontSize(8);
    doc.text("Company Logo", pageWidth - 30, 22, { align: "center" });

    doc.setFontSize(16);
    doc.text("Payroll Summary", 14, 20);

    const startText = dateRange.start
        ? format(dateRange.start, "MMM dd, yyyy")
        : "...";
    const endText = dateRange.end ? format(dateRange.end, "MMM dd, yyyy") : "...";

    doc.setFontSize(10);
    doc.text(`Period: ${periodText}`, 14, 28);
    doc.text(`Dates: ${startText} to ${endText}`, 14, 34);

    let y = 46;
    doc.setFontSize(11);
    doc.text("Employees", 14, y);
    y += 6;

    doc.setFontSize(9);
    payrollData.forEach((data) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        const nameLine = `${data.employee.name} (${data.employee.role || "Role"})`;
        const hoursLine = `Reg: ${data.regularHours} hrs  OT: ${data.overtimeHours} hrs  Total: ${data.totalHours} hrs`;
        const payLine = `Regular Pay: $${data.regularPay}  OT Pay: $${data.overtimePay}  Total Wages: $${data.totalWages}`;

        doc.text(nameLine, 14, y);
        y += 5;
        doc.text(hoursLine, 14, y);
        y += 5;
        doc.text(payLine, 14, y);
        y += 7;
    });

    doc.save("payroll-summary.pdf");
}

// PDF: detailed per employee
function generateEmployeePdf(data, periodText, dateRange) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo placeholder top right
    doc.rect(pageWidth - 50, 10, 40, 20);
    doc.setFontSize(8);
    doc.text("Company Logo", pageWidth - 30, 22, { align: "center" });

    doc.setFontSize(16);
    doc.text(`Payroll Details`, 14, 20);

    const startText = dateRange.start
        ? format(dateRange.start, "MMM dd, yyyy")
        : "...";
    const endText = dateRange.end ? format(dateRange.end, "MMM dd, yyyy") : "...";

    doc.setFontSize(10);
    doc.text(`Employee: ${data.employee.name}`, 14, 30);
    if (data.employee.role) {
        doc.text(`Role: ${data.employee.role}`, 14, 36);
    }
    doc.text(`Period: ${periodText}`, 14, 42);
    doc.text(`Dates: ${startText} to ${endText}`, 14, 48);

    doc.text(
        `Regular Hours: ${data.regularHours}   OT Hours: ${data.overtimeHours}`,
        14,
        56
    );
    doc.text(
        `Regular Pay: $${data.regularPay}   OT Pay: $${data.overtimePay}`,
        14,
        62
    );
    doc.text(`Total Wages: $${data.totalWages}`, 14, 68);

    let y = 80;
    doc.setFontSize(11);
    doc.text("Sessions", 14, y);
    y += 6;

    doc.setFontSize(9);
    if (Array.isArray(data.clockIns) && data.clockIns.length > 0) {
        data.clockIns.forEach((ci) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const inTime = ci.clock_in_time
                ? format(new Date(ci.clock_in_time), "MMM dd, yyyy HH:mm")
                : "-";
            const outTime = ci.clock_out_time
                ? format(new Date(ci.clock_out_time), "MMM dd, yyyy HH:mm")
                : "-";
            const hrs =
                ci.hours_worked !== undefined && ci.hours_worked !== null
                    ? Number(ci.hours_worked).toFixed(2)
                    : "0.00";

            doc.text(`In: ${inTime}`, 14, y);
            y += 4;
            doc.text(`Out: ${outTime}`, 14, y);
            y += 4;
            doc.text(`Hours: ${hrs}`, 14, y);
            y += 6;
        });
    } else {
        doc.text("No sessions in this period.", 14, y);
    }

    const safeName = data.employee.name?.replace(/\s+/g, "_") || "employee";
    doc.save(`payroll-${safeName}.pdf`);
}

// Breakdown modal for one employee
function EmployeeBreakdownModal({ data, onClose, periodText, dateRange }) {
    if (!data) return null;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between gap-2">
            <span>
              Employee Payroll - {data.employee.name}
                {data.employee.role ? ` (${data.employee.role})` : ""}
            </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateEmployeePdf(data, periodText, dateRange)}
                            className="flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Export PDF
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="text-sm text-gray-700">
                        <p>
                            Period:{" "}
                            <span className="font-medium">
                {periodText} (
                                {dateRange.start
                                    ? format(dateRange.start, "MMM dd, yyyy")
                                    : "..."}{" "}
                                to{" "}
                                {dateRange.end
                                    ? format(dateRange.end, "MMM dd, yyyy")
                                    : "..."}
                                )
              </span>
                        </p>
                        <p>
                            Regular Hours:{" "}
                            <span className="font-medium">{data.regularHours}</span>{" "}
                            OT Hours:{" "}
                            <span className="font-medium">{data.overtimeHours}</span>
                        </p>
                        <p>
                            Regular Pay:{" "}
                            <span className="font-medium">${data.regularPay}</span> OT
                            Pay:{" "}
                            <span className="font-medium">${data.overtimePay}</span> Total
                            Wages:{" "}
                            <span className="font-semibold">${data.totalWages}</span>
                        </p>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Clock In
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Clock Out
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    Hours
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {Array.isArray(data.clockIns) && data.clockIns.length > 0 ? (
                                data.clockIns.map((ci) => (
                                    <tr key={ci.id || `${ci.employee_id}-${ci.clock_in_time}`}>
                                        <td className="px-4 py-2 text-sm">
                                            {ci.clock_in_time
                                                ? format(
                                                    new Date(ci.clock_in_time),
                                                    "MMM dd, yyyy HH:mm"
                                                )
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                            {ci.clock_out_time
                                                ? format(
                                                    new Date(ci.clock_out_time),
                                                    "MMM dd, yyyy HH:mm"
                                                )
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-medium">
                                            {ci.hours_worked !== undefined &&
                                            ci.hours_worked !== null
                                                ? Number(ci.hours_worked).toFixed(2)
                                                : "0.00"}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-4 py-4 text-center text-sm text-gray-500"
                                    >
                                        No sessions in this period.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function PayrollModal({
                                         employees,
                                         clockIns,
                                         onClose,
                                         selectedEmployeeId, // optional, for opening from ClockInHistory
                                     }) {
    const [timePeriod, setTimePeriod] = useState("weekly");
    const [customStart, setCustomStart] = useState(null);
    const [customEnd, setCustomEnd] = useState(null);
    const [breakdownData, setBreakdownData] = useState(null);

    const periodLabels = {
        weekly: "Last 7 Days",
        biweekly: "Last 14 Days",
        monthly: "Last 30 Days",
        annually: "This Year",
        custom: "Custom Range",
    };

    const dateRange = useMemo(
        () => computeDateRange(timePeriod, customStart, customEnd),
        [timePeriod, customStart, customEnd]
    );

    const visibleEmployees = useMemo(
        () =>
            selectedEmployeeId
                ? (employees || []).filter((e) => e.id === selectedEmployeeId)
                : employees || [],
        [employees, selectedEmployeeId]
    );

    const visibleClockIns = useMemo(
        () =>
            selectedEmployeeId
                ? (clockIns || []).filter(
                    (ci) => ci.employee_id === selectedEmployeeId
                )
                : clockIns || [],
        [clockIns, selectedEmployeeId]
    );

    const payrollData = useMemo(() => {
        const filteredClockIns = visibleClockIns.filter(
            (ci) =>
                ci &&
                ci.clock_out_time &&
                new Date(ci.clock_in_time) >= dateRange.start &&
                new Date(ci.clock_in_time) <= dateRange.end
        );

        return visibleEmployees.map((employee) => {
            const employeeClockIns = filteredClockIns.filter(
                (ci) => ci.employee_id === employee.id
            );

            // Group by week for overtime calculation
            const weekMap = {};
            employeeClockIns.forEach((ci) => {
                const key = getWeekKey(ci.clock_in_time);
                if (!key) return;
                const hrs = ci.hours_worked || 0;
                weekMap[key] = (weekMap[key] || 0) + hrs;
            });

            let regularHours = 0;
            let overtimeHours = 0;
            Object.values(weekMap).forEach((weekTotal) => {
                const reg = Math.min(weekTotal, 40);
                const ot = Math.max(weekTotal - 40, 0);
                regularHours += reg;
                overtimeHours += ot;
            });

            const totalHours = regularHours + overtimeHours;
            const rate = employee.hourly_rate || 0;
            const regularPay = regularHours * rate;
            const overtimePay = overtimeHours * rate * 1.5;
            const totalWages = regularPay + overtimePay;

            return {
                employee,
                regularHours: regularHours.toFixed(2),
                overtimeHours: overtimeHours.toFixed(2),
                totalHours: totalHours.toFixed(2),
                regularPay: regularPay.toFixed(2),
                overtimePay: overtimePay.toFixed(2),
                totalWages: totalWages.toFixed(2),
                sessions: employeeClockIns.length,
                clockIns: employeeClockIns,
            };
        });
    }, [visibleEmployees, visibleClockIns, dateRange]);

    const totals = useMemo(() => {
        return payrollData.reduce(
            (acc, data) => ({
                hours: acc.hours + parseFloat(data.totalHours),
                wages: acc.wages + parseFloat(data.totalWages),
                regularHours: acc.regularHours + parseFloat(data.regularHours),
                overtimeHours: acc.overtimeHours + parseFloat(data.overtimeHours),
            }),
            { hours: 0, wages: 0, regularHours: 0, overtimeHours: 0 }
        );
    }, [payrollData]);

    const periodText = periodLabels[timePeriod];

    const handleExportSummaryPdf = () => {
        if (!payrollData || payrollData.length === 0) return;
        generateSummaryPdf(payrollData, periodText, dateRange);
    };

    const handleOpenBreakdown = (row) => {
        setBreakdownData(row);
    };

    const handleCloseBreakdown = () => {
        setBreakdownData(null);
    };

    return (
        <>
            <Dialog open onOpenChange={onClose}>
                <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                        <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Payroll Calculator
                  {selectedEmployeeId && visibleEmployees[0]
                      ? ` - ${visibleEmployees[0].name}`
                      : ""}
              </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleExportSummaryPdf}
                                    className="flex items-center gap-2"
                                    disabled={payrollData.length === 0}
                                >
                                    <FileText className="w-4 h-4" />
                                    Export Summary PDF
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Time Period Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time Period
                            </label>
                            <Select value={timePeriod} onValueChange={setTimePeriod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weekly">Weekly (Last 7 Days)</SelectItem>
                                    <SelectItem value="biweekly">
                                        Biweekly (Last 14 Days)
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                        Monthly (Last 30 Days)
                                    </SelectItem>
                                    <SelectItem value="annually">Annually (This Year)</SelectItem>
                                    <SelectItem value="custom">Custom Pay Period</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Custom range inputs */}
                        {timePeriod === "custom" && (
                            <div className="flex gap-4 mt-2">
                                <div className="flex flex-col">
                                    <label className="text-sm mb-1 text-gray-700">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        className="border rounded p-2"
                                        value={customStart || ""}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-sm mb-1 text-gray-700">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        className="border rounded p-2"
                                        value={customEnd || ""}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 bg-blue-50 border-blue-200">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-8 h-8 text-blue-600" />
                                    <div>
                                        <p className="text-sm text-blue-600">Total Hours</p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {totals.hours.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            Regular: {totals.regularHours.toFixed(2)} hrs, OT:{" "}
                                            {totals.overtimeHours.toFixed(2)} hrs
                                        </p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4 bg-green-50 border-green-200">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-8 h-8 text-green-600" />
                                    <div>
                                        <p className="text-sm text-green-600">Total Wages</p>
                                        <p className="text-2xl font-bold text-green-900">
                                            ${totals.wages.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">
                                            Period: {periodText}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Payroll Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Rate/Hour
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Sessions
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Regular Hours
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        OT Hours
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Total Wages
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {payrollData.map((data) => (
                                    <tr
                                        key={data.employee.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleOpenBreakdown(data)}
                                    >
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {data.employee.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {data.employee.role}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                                            ${data.employee.hourly_rate?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-600">
                                            {data.sessions}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                                            {data.regularHours}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                                            {data.overtimeHours}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                                            ${data.totalWages}
                                        </td>
                                    </tr>
                                ))}
                                {payrollData.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-6 text-center text-sm text-gray-500"
                                        >
                                            No payroll data for this period.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2">
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-4 text-sm font-bold text-gray-900 text-right"
                                    >
                                        TOTALS ({periodText}):
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                                        {totals.regularHours.toFixed(2)} hrs
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                                        {totals.overtimeHours.toFixed(2)} hrs
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">
                                        ${totals.wages.toFixed(2)}
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Close Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={onClose} variant="outline">
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Per employee breakdown modal */}
            {breakdownData && (
                <EmployeeBreakdownModal
                    data={breakdownData}
                    onClose={handleCloseBreakdown}
                    periodText={periodText}
                    dateRange={dateRange}
                />
            )}
        </>
    );
}
