"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface UtilityFormProps {
  properties: { _id: string; name: string }[];
  initial?: {
    propertyId: string;
    name: string;
    provider: string;
    cost: number;
    billingCycle?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  };
  onSubmit: (data: {
    propertyId: string;
    name: string;
    provider: string;
    cost: number;
    billingCycle?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const utilitySchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  name: z.string().min(2, "Utility name is required"),
  provider: z.string().min(2, "Provider is required"),
  cost: z.coerce.number().min(0, "Cost is required"),
  billingCycle: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});
type UtilityFormType = z.infer<typeof utilitySchema>;

export function UtilityForm({ properties, initial, onSubmit, onCancel, loading }: UtilityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UtilityFormType>({
    resolver: zodResolver(utilitySchema),
    defaultValues: initial || {},
  });

  // Dummy data generator with randomization
  function fillWithDummyData() {
    const names = ["Electricity", "Water", "Gas", "Internet", "Trash", "Sewer"];
    const providers = ["UtilityCo", "AquaPure", "GasWorks", "FiberNet", "WasteAway", "CleanFlow"];
    const billingCycles = ["Monthly", "Quarterly", "Annually"];
    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    const today = new Date();
    const startDate = new Date(today.getFullYear() - randomInt(0, 2), randomInt(0, 11), randomInt(1, 28));
    
    reset({
      propertyId: properties[randomInt(0, properties.length - 1)]?._id || "",
      name: names[randomInt(0, names.length - 1)],
      provider: providers[randomInt(0, providers.length - 1)],
      cost: randomInt(20, 300),
      billingCycle: billingCycles[randomInt(0, billingCycles.length - 1)],
      startDate: startDate.toISOString().split('T')[0],
      notes: `Service account for ${names[randomInt(0, names.length - 1)].toLowerCase()}`,
    });
  }

  return (
    <div className="dark:bg-gradient-to-br dark:from-gray-900/50 dark:to-gray-800/30 dark:border dark:border-gray-700/50 dark:rounded-lg dark:p-6">
      <form
        className="space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fillWithDummyData}
      >
        Fill with Dummy Data
      </Button>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Property</label>
        <select
          className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
          {...register("propertyId")}
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        {errors.propertyId && <span className="text-sm text-destructive">{errors.propertyId.message}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Utility Name</label>
        <Input
          placeholder="e.g., Electricity, Water, Gas"
          {...register("name")}
        />
        {errors.name && <span className="text-sm text-destructive">{errors.name.message}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Provider</label>
        <Input
          placeholder="e.g., Con Edison, National Grid"
          {...register("provider")}
        />
        {errors.provider && <span className="text-sm text-destructive">{errors.provider.message}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Monthly Cost ($)</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...register("cost", { valueAsNumber: true })}
        />
        {errors.cost && <span className="text-sm text-destructive">{errors.cost.message}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Billing Cycle (Optional)</label>
        <select
          className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
          {...register("billingCycle")}
        >
          <option value="">Select billing cycle</option>
          <option value="Monthly">Monthly</option>
          <option value="Bi-Monthly">Bi-Monthly</option>
          <option value="Quarterly">Quarterly</option>
          <option value="Semi-Annually">Semi-Annually</option>
          <option value="Annually">Annually</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Start Date (Optional)</label>
        <Input
          type="date"
          {...register("startDate")}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">End Date (Optional)</label>
        <Input
          type="date"
          {...register("endDate")}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Notes (Optional)</label>
        <textarea
          className="w-full px-3 py-2 rounded-md border transition-all outline-none min-h-[80px] bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary resize-y"
          placeholder="Additional notes about this utility"
          {...register("notes")}
        />
      </div>
      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading || isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
      </form>
    </div>
  );
}