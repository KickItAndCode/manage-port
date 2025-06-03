"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/../convex/_generated/dataModel";
import { DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UtilityBillFormProps {
  propertyId: Id<"properties">;
  propertyName: string;
  initial?: {
    _id?: Id<"utilityBills">;
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    notes?: string;
  };
  onSubmit: (data: {
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    notes?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const UTILITY_TYPES = [
  "Electric",
  "Water",
  "Gas",
  "Sewer",
  "Trash",
  "Internet",
  "Cable",
  "HOA",
  "Other",
];

const COMMON_PROVIDERS: Record<string, string[]> = {
  Electric: ["Local Electric Co", "City Power", "Regional Energy"],
  Water: ["City Water", "Municipal Water", "County Water District"],
  Gas: ["Natural Gas Co", "City Gas", "Regional Gas"],
  Sewer: ["City Sewer", "Municipal Sewer"],
  Trash: ["Waste Management", "City Sanitation", "Local Waste"],
  Internet: ["Comcast", "AT&T", "Spectrum", "Verizon"],
  Cable: ["Comcast", "DirecTV", "Dish Network"],
  HOA: ["HOA Management", "Property Management Co"],
};

export function UtilityBillForm({
  propertyName,
  initial,
  onSubmit,
  onCancel,
  loading,
}: UtilityBillFormProps) {
  const [utilityType, setUtilityType] = useState(initial?.utilityType || "");
  const [provider, setProvider] = useState(initial?.provider || "");
  const [billMonth, setBillMonth] = useState(initial?.billMonth || "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount?.toString() || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [billDate, setBillDate] = useState(initial?.billDate || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set default dates if not editing
  useState(() => {
    if (!initial) {
      const today = new Date();
      const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
      setBillMonth(currentMonth);
      setBillDate(today.toISOString().split('T')[0]);
      
      // Default due date to 15th of next month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
      setDueDate(nextMonth.toISOString().split('T')[0]);
    }
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!utilityType) {
      newErrors.utilityType = "Utility type is required";
    }

    if (!provider.trim()) {
      newErrors.provider = "Provider is required";
    }

    if (!billMonth) {
      newErrors.billMonth = "Bill month is required";
    }

    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      newErrors.totalAmount = "Total amount must be greater than 0";
    }

    if (!dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    if (!billDate) {
      newErrors.billDate = "Bill date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      utilityType,
      provider: provider.trim(),
      billMonth,
      totalAmount: Number(totalAmount),
      dueDate,
      billDate,
      notes: notes.trim() || undefined,
    });
  };

  const suggestedProviders = utilityType ? COMMON_PROVIDERS[utilityType] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Property Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <Label className="text-sm text-muted-foreground">Property</Label>
        <p className="font-medium">{propertyName}</p>
      </div>

      {/* Utility Type */}
      <div>
        <Label htmlFor="utilityType">Utility Type *</Label>
        <select
          id="utilityType"
          value={utilityType}
          onChange={(e) => {
            setUtilityType(e.target.value);
            // Reset provider when type changes
            if (!initial) setProvider("");
          }}
          className="w-full h-10 px-3 rounded-md border bg-background"
          disabled={loading}
        >
          <option value="">Select utility type</option>
          {UTILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {errors.utilityType && (
          <p className="text-sm text-red-500 mt-1">{errors.utilityType}</p>
        )}
      </div>

      {/* Provider */}
      <div>
        <Label htmlFor="provider">Provider *</Label>
        <div className="space-y-2">
          <Input
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g., City Electric Company"
            disabled={loading}
            className={errors.provider ? "border-red-500" : ""}
          />
          {suggestedProviders.length > 0 && !provider && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Quick select:</span>
              {suggestedProviders.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProvider(p)}
                  className="text-xs h-7"
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </div>
        {errors.provider && (
          <p className="text-sm text-red-500 mt-1">{errors.provider}</p>
        )}
      </div>

      {/* Bill Month */}
      <div>
        <Label htmlFor="billMonth">Bill Month *</Label>
        <Input
          id="billMonth"
          type="month"
          value={billMonth}
          onChange={(e) => setBillMonth(e.target.value)}
          disabled={loading}
          className={errors.billMonth ? "border-red-500" : ""}
        />
        {errors.billMonth && (
          <p className="text-sm text-red-500 mt-1">{errors.billMonth}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="totalAmount">Total Amount *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="totalAmount"
            type="number"
            step="0.01"
            min="0"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="0.00"
            className={`pl-9 ${errors.totalAmount ? "border-red-500" : ""}`}
            disabled={loading}
          />
        </div>
        {errors.totalAmount && (
          <p className="text-sm text-red-500 mt-1">{errors.totalAmount}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="billDate">Bill Date *</Label>
          <Input
            id="billDate"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            disabled={loading}
            className={errors.billDate ? "border-red-500" : ""}
          />
          {errors.billDate && (
            <p className="text-sm text-red-500 mt-1">{errors.billDate}</p>
          )}
        </div>

        <div>
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={loading}
            className={errors.dueDate ? "border-red-500" : ""}
          />
          {errors.dueDate && (
            <p className="text-sm text-red-500 mt-1">{errors.dueDate}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information..."
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          After saving, tenant charges will be automatically calculated based on 
          the utility responsibility percentages defined in their leases.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial ? "Update Bill" : "Add Bill"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}