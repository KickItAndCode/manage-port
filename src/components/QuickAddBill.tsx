"use client";
import { useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { formatErrorForToast } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Plus, Loader2, Check } from "lucide-react";

const UTILITY_TYPES = [
  "Electric", "Water", "Gas", "Sewer", "Trash", "Internet", "Cable", "HOA", "Other"
];

interface QuickAddBillProps {
  /** Pre-selected property from filters */
  defaultPropertyId?: Id<"properties">;
  /** Called after successful submission so parent can refresh */
  onSuccess?: () => void;
}

export function QuickAddBill({ defaultPropertyId, onSuccess }: QuickAddBillProps) {
  const { user } = useUser();
  const addBill = useMutation(api.utilityBills.addUtilityBill);
  const { isAuthenticated } = useConvexAuth();
  const propertiesResult = useQuery(
    api.properties.getProperties,
    isAuthenticated ? {} : "skip"
  );
  const properties = propertiesResult && "properties" in propertiesResult
    ? propertiesResult.properties
    : [];

  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId || "");
  const [utilityType, setUtilityType] = useState("");
  const [amount, setAmount] = useState("");
  const [billMonth, setBillMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const canSubmit = propertyId && utilityType && amount && parseFloat(amount) > 0 && billMonth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setSubmitting(true);
    try {
      const billDate = `${billMonth}-01`;
      // Due date: 15th of the following month
      const monthDate = new Date(billMonth + "-01");
      monthDate.setMonth(monthDate.getMonth() + 1);
      const dueDate = `${monthDate.toISOString().slice(0, 7)}-15`;

      await addBill({ 
        propertyId: propertyId as Id<"properties">,
        utilityType,
        provider: utilityType, // Default provider to utility type for quick add
        totalAmount: parseFloat(amount),
        billMonth,
        billDate,
        dueDate });

      toast.success(`${utilityType} bill added — $${parseFloat(amount).toFixed(2)}`);

      // Reset form (keep property and month for rapid entry)
      setUtilityType("");
      setAmount("");
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(formatErrorForToast(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="quick-add-bill-form"
      className="bg-muted/30 border border-dashed rounded-lg p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Quick Add Bill</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        {/* Property */}
        <SelectNative
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="text-sm col-span-2 sm:col-span-1"
          data-testid="quick-add-property"
        >
          <option value="">Property...</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </SelectNative>

        {/* Utility Type */}
        <SelectNative
          value={utilityType}
          onChange={(e) => setUtilityType(e.target.value)}
          className="text-sm"
          data-testid="quick-add-type"
        >
          <option value="">Type...</option>
          {UTILITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </SelectNative>

        {/* Amount */}
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-sm"
          data-testid="quick-add-amount"
        />

        {/* Month */}
        <Input
          type="month"
          value={billMonth}
          onChange={(e) => setBillMonth(e.target.value)}
          className="text-sm"
          data-testid="quick-add-month"
        />

        {/* Submit */}
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          size="sm"
          className="col-span-2 sm:col-span-1 h-9"
          data-testid="quick-add-submit"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justAdded ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Added
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
