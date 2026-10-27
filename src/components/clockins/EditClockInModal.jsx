import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";

function toLocalInput(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditClockInModal({ record, employeeName, onSave, onClose }) {
    const [clockIn, setClockIn]   = useState("");
    const [clockOut, setClockOut] = useState("");
    const [error, setError]       = useState("");

    useEffect(() => {
        if (record) {
            setClockIn(toLocalInput(record.clock_in_time));
            setClockOut(toLocalInput(record.clock_out_time));
        }
    }, [record]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        if (!clockIn) { setError("Clock-in time is required."); return; }
        if (clockOut && new Date(clockOut) <= new Date(clockIn)) {
            setError("Clock-out must be after clock-in.");
            return;
        }

        onSave(record.id, {
            clock_in_time:  new Date(clockIn).toISOString(),
            clock_out_time: clockOut ? new Date(clockOut).toISOString() : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Timesheet Entry</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{employeeName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Clock In</label>
                        <input
                            type="datetime-local"
                            value={clockIn}
                            onChange={e => setClockIn(e.target.value)}
                            required
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Clock Out</label>
                        <input
                            type="datetime-local"
                            value={clockOut}
                            onChange={e => setClockOut(e.target.value)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
                        />
                        <p className="text-xs text-gray-400">Leave blank if the employee is still clocked in.</p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
