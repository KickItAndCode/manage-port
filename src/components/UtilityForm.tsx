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
    setValue,
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
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-md"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Button
        type="button"
        variant="outline"
        className="mb-2"
        onClick={fillWithDummyData}
      >
        Fill with Dummy Data
      </Button>
      <div>
        <label className="block text-zinc-200 mb-1">Property</label>
        <select
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
          {...register("propertyId")}
          required
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        {errors.propertyId && <span className="text-red-400 text-sm">{errors.propertyId.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Utility Name</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          placeholder="e.g., Electricity, Water, Gas"
          {...register("name")}
          required
        />
        {errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Provider</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          placeholder="e.g., Con Edison, National Grid"
          {...register("provider")}
          required
        />
        {errors.provider && <span className="text-red-400 text-sm">{errors.provider.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Monthly Cost ($)</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...register("cost", { valueAsNumber: true })}
          required
        />
        {errors.cost && <span className="text-red-400 text-sm">{errors.cost.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Billing Cycle (Optional)</label>
        <select
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
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
      <div>
        <label className="block text-zinc-200 mb-1">Start Date (Optional)</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="date"
          {...register("startDate")}
        />
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">End Date (Optional)</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="date"
          {...register("endDate")}
        />
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Notes (Optional)</label>
        <textarea
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2 min-h-[80px]"
          placeholder="Additional notes about this utility"
          {...register("notes")}
        />
      </div>
      <div className="flex gap-2 justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading || isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}