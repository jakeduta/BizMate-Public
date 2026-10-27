import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceModal({ invoice, customers, services = [], onClose, onSave }) {
    const [nextInvoicePreview, setNextInvoicePreview] = useState("");

    const [formData, setFormData] = useState({
        customer_id: "",
        invoice_number: "",
        date: new Date().toISOString().split("T")[0],
        due_date: "",
        items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
        subtotal: 0,
        tax_rate_a: 0,
        tax_rate_b: 0,
        tax_exempt: false,
        tax: 0,
        total: 0,
        paid_amount: 0,
        status: "draft",
        notes: "",
        autoIncrement: true,
    });

    const safeParseItems = (value) => {
        if (!value) return [{ description: "", quantity: 1, rate: 0, amount: 0 }];
        if (Array.isArray(value)) return value;
        try {
            return JSON.parse(value);
        } catch {
            return [{ description: "", quantity: 1, rate: 0, amount: 0 }];
        }
    };

    const recalcTotals = (items, taxRateA, taxRateB, taxExempt) => {
        const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);

        const combinedRate = taxExempt
            ? 0
            : (Number(taxRateA) || 0) + (Number(taxRateB) || 0);

        const taxAmount = subtotal * (combinedRate / 100);
        const total = subtotal + taxAmount;

        return { subtotal, taxAmount, total, combinedRate };
    };

    const generatePreviewNumber = (customerId) => {
        if (!customerId) {
            setNextInvoicePreview("");
            return;
        }

        const customer = customers.find((c) => c.id === customerId);
        const lastNumber = customer?.last_invoice_number;

        let nextNumber = 1;

        if (lastNumber && !isNaN(Number(lastNumber))) {
            nextNumber = Number(lastNumber) + 1;
        }

        const formatted = String(nextNumber).padStart(5, "0");
        setNextInvoicePreview(`INV-${formatted}`);
    };

    useEffect(() => {
        if (invoice) {
            const items = safeParseItems(invoice.items);
            const taxRateA = invoice.tax_rate_a ?? 0;
            const taxRateB = invoice.tax_rate_b ?? 0;
            const taxExempt = Boolean(invoice.tax_exempt);

            const { subtotal, taxAmount, total } = recalcTotals(
                items,
                taxRateA,
                taxRateB,
                taxExempt
            );

            setFormData((prev) => ({
                ...prev,
                ...invoice,
                date: invoice.date ? invoice.date.split("T")[0] : prev.date,
                due_date: invoice.due_date ? invoice.due_date.split("T")[0] : prev.due_date,
                items,
                subtotal,
                tax_rate_a: taxRateA,
                tax_rate_b: taxRateB,
                tax_exempt: taxExempt,
                tax: taxAmount,
                total,
                paid_amount: invoice.paid_amount ?? 0,
                autoIncrement: false,
            }));

            setNextInvoicePreview("");
        }
    }, [invoice]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "quantity" || field === "rate") {
            newItems[index].amount =
                (parseFloat(newItems[index].quantity) || 0) *
                (parseFloat(newItems[index].rate) || 0);
        }

        const { subtotal, taxAmount, total } = recalcTotals(
            newItems,
            formData.tax_rate_a,
            formData.tax_rate_b,
            formData.tax_exempt
        );

        setFormData({
            ...formData,
            items: newItems,
            subtotal,
            tax: taxAmount,
            total,
        });
    };

    const handleServiceSelect = (index, serviceId) => {
        const newItems = [...formData.items];
        if (serviceId === "__custom__") {
            newItems[index] = { ...newItems[index], service_id: null };
        } else {
            const service = services.find((s) => s.id === serviceId);
            if (service) {
                newItems[index] = {
                    ...newItems[index],
                    service_id: service.id,
                    description: service.name,
                    rate: parseFloat(service.price) || 0,
                    amount:
                        (parseFloat(newItems[index].quantity) || 1) *
                        (parseFloat(service.price) || 0),
                };
            }
        }

        const { subtotal, taxAmount, total } = recalcTotals(
            newItems,
            formData.tax_rate_a,
            formData.tax_rate_b,
            formData.tax_exempt
        );

        setFormData({ ...formData, items: newItems, subtotal, tax: taxAmount, total });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: "", quantity: 1, rate: 0, amount: 0 }],
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);

        const { subtotal, taxAmount, total } = recalcTotals(
            newItems,
            formData.tax_rate_a,
            formData.tax_rate_b,
            formData.tax_exempt
        );

        setFormData({
            ...formData,
            items: newItems,
            subtotal,
            tax: taxAmount,
            total,
        });
    };

    const handleTaxRateChange = (field, value) => {
        const updated = {
            ...formData,
            [field]: parseFloat(value) || 0,
        };

        const { subtotal, taxAmount, total } = recalcTotals(
            updated.items,
            updated.tax_rate_a,
            updated.tax_rate_b,
            updated.tax_exempt
        );

        setFormData({
            ...updated,
            subtotal,
            tax: taxAmount,
            total,
        });
    };

    const handleTaxExemptToggle = (checked) => {
        const taxExempt = checked;

        const { subtotal, taxAmount, total } = recalcTotals(
            formData.items,
            formData.tax_rate_a,
            formData.tax_rate_b,
            taxExempt
        );

        setFormData({
            ...formData,
            tax_exempt: taxExempt,
            subtotal,
            tax: taxAmount,
            total,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.customer_id) {
            alert("Please select a customer.");
            return;
        }

        const dataToSave = {
            ...formData,
            items: JSON.stringify(formData.items),
            tax_rate_a: formData.tax_rate_a,
            tax_rate_b: formData.tax_rate_b,
            tax_exempt: formData.tax_exempt,
            tax: formData.tax,
            total: formData.total,
            autoIncrement: formData.autoIncrement,
            invoice_number:
                formData.autoIncrement && nextInvoicePreview
                    ? nextInvoicePreview
                    : formData.invoice_number,
        };

        try {
            await onSave(dataToSave);
        } catch (err) {
            console.error(err);
            alert("Failed to save invoice. Check console for details.");
        }
    };

    const combinedRate =
        (formData.tax_exempt
                ? 0
                : (Number(formData.tax_rate_a) || 0) +
                (Number(formData.tax_rate_b) || 0)
        ).toFixed(3);

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{invoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* CUSTOMER AND NUMBER */}
                    <div className="grid grid-cols-2 gap-4">

                        <div>
                            <Label>Customer</Label>
                            <Select
                                value={formData.customer_id}
                                onValueChange={(v) => {
                                    setFormData({ ...formData, customer_id: v });
                                    if (formData.autoIncrement) generatePreviewNumber(v);
                                }}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Invoice Number</Label>
                            <Input
                                value={formData.invoice_number}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        invoice_number: e.target.value.toUpperCase()
                                    })
                                }
                                placeholder="Auto generated"
                                className="uppercase"
                                disabled={formData.autoIncrement}
                            />

                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="checkbox"
                                    id="auto_increment"
                                    checked={formData.autoIncrement}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setFormData({ ...formData, autoIncrement: checked });

                                        if (checked && formData.customer_id) {
                                            generatePreviewNumber(formData.customer_id);
                                        } else {
                                            setNextInvoicePreview("");
                                        }
                                    }}
                                />
                                <Label htmlFor="auto_increment" className="text-sm">
                                    Click to auto increment invoice number
                                </Label>
                            </div>

                            {formData.autoIncrement && nextInvoicePreview && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Next number:
                                    <span className="font-semibold ml-1">
                                        {nextInvoicePreview}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* DATE FIELDS */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) =>
                                    setFormData({ ...formData, date: e.target.value })
                                }
                                required
                            />
                        </div>

                        <div>
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) =>
                                    setFormData({ ...formData, due_date: e.target.value })
                                }
                            />
                        </div>
                    </div>

                    {/* ITEMS */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <Label>Items</Label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={addItem}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    {services.length > 0 && (
                                        <th className="px-3 py-2 text-left text-xs font-medium w-40">
                                            Service
                                        </th>
                                    )}
                                    <th className="px-3 py-2 text-left text-xs font-medium">
                                        Description
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium w-24">
                                        Qty
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium w-32">
                                        Rate
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium w-32">
                                        Amount
                                    </th>
                                    <th className="w-10"></th>
                                </tr>
                                </thead>

                                <tbody className="divide-y">
                                {formData.items.map((item, index) => (
                                    <tr key={index}>
                                        {services.length > 0 && (
                                            <td className="px-3 py-2">
                                                <Select
                                                    value={item.service_id || "__custom__"}
                                                    onValueChange={(v) =>
                                                        handleServiceSelect(index, v)
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Custom" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__custom__">
                                                            Custom
                                                        </SelectItem>
                                                        {services.map((s) => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                {s.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        )}
                                        <td className="px-3 py-2">
                                            <Input
                                                value={item.description}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "description",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </td>

                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "quantity",
                                                        parseFloat(e.target.value)
                                                    )
                                                }
                                            />
                                        </td>

                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.rate}
                                                onChange={(e) =>
                                                    handleItemChange(
                                                        index,
                                                        "rate",
                                                        parseFloat(e.target.value)
                                                    )
                                                }
                                            />
                                        </td>

                                        <td className="px-3 py-2 text-right">
                                            ${item.amount?.toFixed(2)}
                                        </td>

                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ACCORDION TAX SECTION */}
                    <Accordion type="single" collapsible className="w-full border rounded-lg p-2 bg-white shadow-sm">
                        <AccordionItem value="tax">
                            <AccordionTrigger className="text-left py-3 px-3 rounded-md bg-gray-100 border border-gray-300 font-medium hover:bg-gray-200">
                                Tax Settings
                            </AccordionTrigger>
                            <AccordionContent>

                                <div className="space-y-3 mt-3">

                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Tax Exempt</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="tax_exempt"
                                                type="checkbox"
                                                checked={formData.tax_exempt}
                                                onChange={(e) =>
                                                    handleTaxExemptToggle(e.target.checked)
                                                }
                                            />
                                            <Label htmlFor="tax_exempt" className="text-sm">
                                                Do not apply tax
                                            </Label>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Tax Rate A (%):</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={formData.tax_rate_a}
                                            onChange={(e) =>
                                                handleTaxRateChange("tax_rate_a", e.target.value)
                                            }
                                            className="w-24 text-right"
                                            disabled={formData.tax_exempt}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Tax Rate B (%):</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={formData.tax_rate_b}
                                            onChange={(e) =>
                                                handleTaxRateChange("tax_rate_b", e.target.value)
                                            }
                                            className="w-24 text-right"
                                            disabled={formData.tax_exempt}
                                        />
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Combined Rate:</span>
                                        <span className="font-medium">
                                            {combinedRate}%
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Tax Amount:</span>
                                        <span className="font-medium">
                                            ${Number(formData.tax || 0).toFixed(2)}
                                        </span>
                                    </div>

                                </div>

                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* TOTAL */}
                    <div className="flex justify-end">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-bold">Total:</span>
                                <span className="font-bold text-lg">
                                    ${Number(formData.total || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* STATUS */}
                    <div>
                        <Label>Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(v) =>
                                setFormData({ ...formData, status: v })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* NOTES */}
                    <div>
                        <Label>Notes</Label>
                        <Textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Optional notes"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            {invoice ? "Update" : "Create"} Invoice
                        </Button>
                    </div>

                </form>
            </DialogContent>
        </Dialog>
    );
}
