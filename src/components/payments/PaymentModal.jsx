import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Payment } from "@/api/dbClient";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";

export default function PaymentModal({ invoices = [], onClose }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const [formData, setFormData] = useState({
        invoice_id: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        reference: "",
        notes: "",
    });

    // Unpaid invoices only
    const unpaidInvoices = invoices.filter(
        (inv) => (inv.total || 0) > (inv.paid_amount || 0)
    );

    const selectedInvoice = invoices.find((inv) => inv.id === formData.invoice_id);
    const maxAmount = selectedInvoice
        ? (selectedInvoice.total || 0) - (selectedInvoice.paid_amount || 0)
        : 0;

    // Format invoice label
    const formatLabel = (invoice) => {
        if (!invoice) return "";
        const balance = invoice.total - invoice.paid_amount;
        return `#${invoice.invoice_number}  Balance: $${balance.toFixed(2)}`;
    };

    // Create payment mutation
    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                invoice_id: formData.invoice_id,
                amount: Number(formData.amount),
                date: formData.date,
                payment_method: formData.payment_method,
                reference: formData.reference || null,
                notes: formData.notes || null,
            };
            return await Payment.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["payments"]);
            queryClient.invalidateQueries(["invoices"]);
            alert("Payment recorded successfully.");
            onClose();
        },
        onError: (err) => {
            console.error("Payment error:", err);
            alert("Failed to record payment: " + (err.response?.data?.error || err.message));
        },
    });

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.invoice_id || !formData.amount) {
            alert("Please select an invoice and enter an amount.");
            return;
        }
        if (Number(formData.amount) > maxAmount) {
            alert("Payment amount cannot exceed remaining balance.");
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Searchable Invoice Selector */}
                    <div>
                        <Label>Invoice</Label>

                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between"
                                >
                                    {formData.invoice_id
                                        ? formatLabel(
                                            invoices.find((i) => i.id === formData.invoice_id)
                                        )
                                        : "Select invoice"}
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-80 p-0">
                                <Command>
                                    <CommandInput placeholder="Search invoices..." />

                                    <CommandList className="max-h-60 overflow-y-auto">
                                        <CommandEmpty>No invoices found.</CommandEmpty>

                                        {/* Unpaid */}
                                        <CommandGroup heading="Unpaid">
                                            {unpaidInvoices
                                                .filter((inv) => inv.status === "sent")
                                                .sort((a, b) =>
                                                    a.invoice_number.localeCompare(b.invoice_number)
                                                )
                                                .map((invoice) => {
                                                    const balance =
                                                        invoice.total - invoice.paid_amount;

                                                    return (
                                                        <CommandItem
                                                            key={invoice.id}
                                                            value={invoice.id}
                                                            onSelect={() => {
                                                                setFormData({
                                                                    ...formData,
                                                                    invoice_id: invoice.id,
                                                                    amount: balance.toFixed(2),
                                                                });
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">
                                                                    #{invoice.invoice_number}
                                                                </span>
                                                                <span className="text-gray-500 text-sm">
                                                                    Balance: ${balance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                        </CommandGroup>

                                        {/* Overdue */}
                                        <CommandGroup heading="Overdue">
                                            {unpaidInvoices
                                                .filter((inv) => inv.status === "overdue")
                                                .sort((a, b) =>
                                                    a.invoice_number.localeCompare(b.invoice_number)
                                                )
                                                .map((invoice) => {
                                                    const balance =
                                                        invoice.total - invoice.paid_amount;

                                                    return (
                                                        <CommandItem
                                                            key={invoice.id}
                                                            value={invoice.id}
                                                            onSelect={() => {
                                                                setFormData({
                                                                    ...formData,
                                                                    invoice_id: invoice.id,
                                                                    amount: balance.toFixed(2),
                                                                });
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-red-600">
                                                                    #{invoice.invoice_number}
                                                                </span>
                                                                <span className="text-red-500 text-sm">
                                                                    Balance: ${balance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                        </CommandGroup>

                                        {/* Partially Paid */}
                                        <CommandGroup heading="Partially Paid">
                                            {unpaidInvoices
                                                .filter(
                                                    (inv) =>
                                                        inv.paid_amount > 0 &&
                                                        inv.paid_amount < inv.total &&
                                                        inv.status !== "paid"
                                                )
                                                .sort((a, b) =>
                                                    a.invoice_number.localeCompare(b.invoice_number)
                                                )
                                                .map((invoice) => {
                                                    const balance =
                                                        invoice.total - invoice.paid_amount;

                                                    return (
                                                        <CommandItem
                                                            key={invoice.id}
                                                            value={invoice.id}
                                                            onSelect={() => {
                                                                setFormData({
                                                                    ...formData,
                                                                    invoice_id: invoice.id,
                                                                    amount: balance.toFixed(2),
                                                                });
                                                                setOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-yellow-600">
                                                                    #{invoice.invoice_number}
                                                                </span>
                                                                <span className="text-yellow-600 text-sm">
                                                                    Balance: ${balance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Amount */}
                    <div>
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            min="0.01"
                            max={maxAmount}
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => handleChange("amount", e.target.value)}
                            required
                        />
                        {maxAmount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Remaining balance: ${maxAmount.toFixed(2)}
                            </p>
                        )}
                    </div>

                    {/* Payment date */}
                    <div>
                        <Label>Payment Date</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange("date", e.target.value)}
                            required
                        />
                    </div>

                    {/* Payment method */}
                    <div>
                        <Label>Payment Method</Label>
                        <select
                            className="w-full border rounded p-2"
                            value={formData.payment_method}
                            onChange={(e) =>
                                handleChange("payment_method", e.target.value)
                            }
                        >
                            <option value="cash">Cash</option>
                            <option value="check">Check</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Reference */}
                    <div>
                        <Label>Reference Number</Label>
                        <Input
                            value={formData.reference}
                            onChange={(e) =>
                                handleChange("reference", e.target.value)
                            }
                            placeholder="Check number or transaction ID"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={mutation.isLoading}
                        >
                            {mutation.isLoading ? "Saving..." : "Record Payment"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
