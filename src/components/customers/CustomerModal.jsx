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

export default function CustomerModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const extraFields = useExtraFields('customers');

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

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
          <DialogTitle>{customer ? "Edit Customer" : "Add Customer"}</DialogTitle>
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
            <Label>Company / Occupation</Label>
            <Input
              value={formData.company}
              onChange={(e) => set('company', e.target.value)}
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
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {customer ? "Update" : "Add"} Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
