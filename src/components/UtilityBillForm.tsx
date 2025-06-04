"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/../convex/_generated/dataModel";
import { DollarSign, AlertCircle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface UtilityBillFormProps {
  propertyId: Id<"properties">;
  propertyName: string;
  defaultMonth?: string;
  initial?: {
    _id?: Id<"utilityBills">;
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    billingPeriod?: string;
    notes?: string;
  };
  onSubmit: (data: {
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    billingPeriod?: string;
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

const BILLING_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-monthly", label: "Bi-Monthly (Every 2 months)" },
  { value: "quarterly", label: "Quarterly (Every 3 months)" },
  { value: "semi-annual", label: "Semi-Annual (Every 6 months)" },
  { value: "annual", label: "Annual (Yearly)" },
];

export function UtilityBillForm({
  propertyName,
  defaultMonth,
  initial,
  onSubmit,
  onCancel,
  loading,
}: UtilityBillFormProps) {
  const [utilityType, setUtilityType] = useState(initial?.utilityType || "");
  const [provider, setProvider] = useState(initial?.provider || "");
  const [billMonth, setBillMonth] = useState(initial?.billMonth || defaultMonth || "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount?.toString() || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [billDate, setBillDate] = useState(initial?.billDate || "");
  const [billingPeriod, setBillingPeriod] = useState(initial?.billingPeriod || "monthly");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advancedMode, setAdvancedMode] = useState(!!initial);

  // Set default dates if not editing
  useState(() => {
    if (!initial) {
      const today = new Date();
      
      // Use defaultMonth if provided, otherwise current month
      const targetMonth = defaultMonth || today.toISOString().slice(0, 7);
      setBillMonth(targetMonth);
      
      // Set bill date to beginning of the month (simplified default)
      const [year, month] = targetMonth.split('-');
      const firstOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      setBillDate(firstOfMonth.toISOString().split('T')[0]);
      
      // Default due date to 15th of next month
      const nextMonth = new Date(parseInt(year), parseInt(month), 15);
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
      billingPeriod,
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

      {/* Bill Month and Advanced Mode Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="billMonth">Bill Month *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-xs h-7 px-2"
          >
            <Settings className="w-3 h-3 mr-1" />
            {advancedMode ? "Simple" : "Advanced"}
          </Button>
        </div>
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

      {/* Billing Period */}
      <div>
        <Label htmlFor="billingPeriod">Billing Period</Label>
        <select
          id="billingPeriod"
          value={billingPeriod}
          onChange={(e) => setBillingPeriod(e.target.value)}
          className="w-full h-10 px-3 rounded-md border bg-background"
          disabled={loading}
        >
          {BILLING_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          How often this utility bill is issued
        </p>
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

      {/* Dates - Only show in advanced mode */}
      {advancedMode && (
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
      )}

      {!advancedMode && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">Default Settings:</p>
          <ul className="space-y-1">
            <li>• Bill Date: 1st of {billMonth ? new Date(billMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'selected month'}</li>
            <li>• Due Date: 15th of following month</li>
          </ul>
          <p className="text-xs mt-2">Use "Advanced" mode to customize these dates</p>
        </div>
      )}

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