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

export default function EmployeeModal({ employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    hourly_rate: "",
    email: "",
    phone: "",
    active: true,
  });

  const extraFields = useExtraFields('employees');

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      hourly_rate: parseFloat(formData.hourly_rate),
    });
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
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Role</Label>
            <Input
              value={formData.role}
              onChange={(e) => set('role', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Hourly Rate</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => set('hourly_rate', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active Status</Label>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => set('active', checked)}
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
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              {employee ? "Update" : "Add"} Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
