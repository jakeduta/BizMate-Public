import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Clock, LogIn, LogOut } from "lucide-react";

export default function ClockInPanel({
                                         employees = [],
                                         clockIns = [],
                                         onClockIn,
                                         onClockOut,
                                         onEmployeePayroll, // ✅ new optional prop
                                     }) {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const activeClockIn = clockIns.find(
        (c) => c.employee_id === selectedEmployee && !c.clock_out_time
    );

    const currentlyClockedIn = clockIns.filter((c) => !c.clock_out_time);

    const getCoords = () =>
        new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                ()    => resolve(null),
                { timeout: 5000 }
            );
        });

    const handleAction = async () => {
        try {
            if (!selectedEmployee) {
                alert("Please select an employee.");
                return;
            }

            if (activeClockIn) {
                await onClockOut(activeClockIn);
                setSelectedEmployee("");
            } else {
                const coords = await getCoords();
                await onClockIn(selectedEmployee, coords);
            }
        } catch (error) {
            console.error("Clock action failed:", error);
            alert("Failed to clock in or out.");
        }
    };

    const getElapsedTime = (clockInTime) => {
        const elapsed = (currentTime - new Date(clockInTime)) / 1000;
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = Math.floor(elapsed % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    return (
        <>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Clock In or Out
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center mb-6">
                        <div className="text-4xl font-bold text-gray-900">
                            {currentTime.toLocaleTimeString()}
                        </div>
                        <div className="text-gray-500">
                            {currentTime.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Select
                            value={selectedEmployee}
                            onValueChange={setSelectedEmployee}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((emp) => {
                                    const isClockedIn = clockIns.some(
                                        (c) => c.employee_id === emp.id && !c.clock_out_time
                                    );
                                    return (
                                        <SelectItem
                                            key={emp.id}
                                            value={emp.id}
                                            disabled={false}
                                        >
                                            {emp.name} {isClockedIn && "(Currently clocked in)"}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>

                        {activeClockIn && (
                            <div className="p-4 bg-indigo-50 rounded-lg">
                                <div className="text-sm text-indigo-600 mb-1">
                                    Time elapsed
                                </div>
                                <div className="text-2xl font-bold text-indigo-900">
                                    {getElapsedTime(activeClockIn.clock_in_time)}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleAction}
                            className={`w-full ${
                                activeClockIn
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-green-600 hover:bg-green-700"
                            }`}
                            size="lg"
                        >
                            {activeClockIn ? (
                                <>
                                    <LogOut className="w-5 h-5 mr-2" />
                                    Clock Out
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5 mr-2" />
                                    Clock In
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Currently Clocked In</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentlyClockedIn.length > 0 ? (
                        <div className="space-y-3">
                            {currentlyClockedIn.map((record) => {
                                const employee = employees.find(
                                    (e) => e.id === record.employee_id
                                );
                                return (
                                    <div
                                        key={record.id}
                                        className="p-3 bg-green-50 rounded-lg flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <div className="font-medium text-green-900">
                                                {employee?.name}
                                            </div>
                                            <div className="text-sm text-green-600">
                                                {getElapsedTime(record.clock_in_time)}
                                            </div>
                                        </div>

                                        {onEmployeePayroll && employee?.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    onEmployeePayroll(employee.id)
                                                }
                                            >
                                                View payroll
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No one is clocked in</p>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
