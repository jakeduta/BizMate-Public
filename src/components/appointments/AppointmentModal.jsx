import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExtraFields } from "@/hooks/useExtraFields";

export default function AppointmentModal({ appointment, customers, onClose, onSave }) {
  const [formData, setFormData] = useState({
    customer_id: "",
    title: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    status: "scheduled",
    notes: "",
  });

  const extraFields = useExtraFields('appointments');

  useEffect(() => {
    if (appointment) {
      setFormData(appointment);
    }
  }, [appointment]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderExtraField = (field) => {
    const value = formData[field.field_name] ?? '';
    switch (field.field_type) {
      case 'textarea':
        return <Textarea value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} rows={2} />;
      case 'boolean':
        return (
          <Switch
            checked={!!value}
            onCheckedChange={val => set(field.field_name, val)}
          />
        );
      case 'number':
        return <Input type="number" value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} />;
      case 'date':
        return <Input type="date" value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} />;
      case 'email':
        return <Input type="email" value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} />;
      case 'phone':
        return <Input type="tel" value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} />;
      case 'select': {
        const options = field.options ? JSON.parse(field.options) : [];
        return (
          <Select value={value} onValueChange={val => set(field.field_name, val)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      default:
        return <Input value={value} onChange={e => set(field.field_name, e.target.value)} required={field.required} />;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => set('customer_id', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => set('title', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => set('start_time', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => set('end_time', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => set('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
            />
          </div>

          {extraFields.length > 0 && (
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Additional Fields</p>
              {extraFields.map(field => (
                <div key={field.id} className={field.field_type === 'boolean' ? 'flex items-center justify-between' : ''}>
                  <Label>{field.field_label}{field.required ? ' *' : ''}</Label>
                  {renderExtraField(field)}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
              {appointment ? "Update" : "Create"} Appointment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
