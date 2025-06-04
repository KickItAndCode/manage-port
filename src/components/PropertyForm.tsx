"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PropertyFormProps {
  initial?: {
    name: string;
    address: string;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    monthlyRent: number;
    purchaseDate: string;
    imageUrl?: string;
    monthlyMortgage?: number;
    monthlyCapEx?: number;
  };
  onSubmit: (data: {
    name: string;
    address: string;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    monthlyRent: number;
    purchaseDate: string;
    imageUrl?: string;
    monthlyMortgage?: number;
    monthlyCapEx?: number;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const propertySchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(5, "Address is required"),
  type: z.string().min(2, "Type is required"),
  status: z.string().min(2, "Status is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms required"),
  bathrooms: z.coerce.number().min(0, "Bathrooms required"),
  squareFeet: z.coerce.number().min(0, "Square feet required"),
  monthlyRent: z.coerce.number().min(0, "Monthly rent required"),
  purchaseDate: z.string().min(4, "Purchase date required"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  monthlyMortgage: z.coerce.number().min(0).optional(),
  monthlyCapEx: z.coerce.number().min(0).optional(),
});
type PropertyFormType = z.infer<typeof propertySchema>;

export function PropertyForm({ initial, onSubmit, onCancel, loading }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PropertyFormType>({
    resolver: zodResolver(propertySchema),
    defaultValues: initial || {},
  });

  // Watch mortgage value to auto-calculate CapEx
  const monthlyMortgage = watch("monthlyMortgage");
  
  // Auto-calculate CapEx when mortgage changes
  useEffect(() => {
    if (monthlyMortgage && monthlyMortgage > 0) {
      setValue("monthlyCapEx", Math.round(monthlyMortgage * 0.1));
    }
  }, [monthlyMortgage, setValue]);

  // Dummy data generator with randomization
  function fillWithDummyData() {
    const names = ["Sunset Villa", "Oakwood Apartments", "Riverside Cottage", "Downtown Loft", "Mountain View Townhouse", "Garden Terrace"];
    const addresses = [
      "1234 Oceanview Dr, Malibu, CA 90265",
      "5678 Maple St, Denver, CO 80220",
      "9101 Riverside Rd, Austin, TX 78701",
      "222 Main St, San Francisco, CA 94105",
      "789 Hilltop Ave, Seattle, WA 98101",
      "456 Garden Ln, Portland, OR 97209"
    ];
    const types = ["Single Family", "Duplex", "Apartment", "Condo", "Townhouse", "Other"];
    const statuses = ["Available", "Occupied", "Maintenance", "Under Contract"];
    const images = [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80"
    ];
    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function randomDate(start: Date, end: Date) {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString().split("T")[0];
    }
    reset({
      name: names[randomInt(0, names.length - 1)],
      address: addresses[randomInt(0, addresses.length - 1)],
      type: types[randomInt(0, types.length - 1)],
      status: statuses[randomInt(0, statuses.length - 1)],
      bedrooms: randomInt(1, 6),
      bathrooms: randomInt(1, 4),
      squareFeet: randomInt(600, 4000),
      monthlyRent: randomInt(900, 7500) * 10,
      purchaseDate: randomDate(new Date(2015, 0, 1), new Date()),
      imageUrl: images[randomInt(0, images.length - 1)],
    });
  }

  const propertyTypes = [
    "Single Family",
    "Duplex", 
    "Apartment",
    "Condo",
    "Townhouse",
    "Other",
  ];
  const statusOptions = ["Available", "Occupied", "Maintenance", "Under Contract"];

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
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Property Name</label>
        <Input
          {...register("name")}
          placeholder="Enter property name"
        />
        {errors.name && <span className="text-sm text-destructive">{errors.name.message}</span>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Address</label>
        <Input
          {...register("address")}
          placeholder="Enter property address"
        />
        {errors.address && <span className="text-sm text-destructive">{errors.address.message}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Property Type</label>
          <select
            className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
            {...register("type")}
          >
            <option value="">Select property type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.type && <span className="text-sm text-destructive">{errors.type.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Status</label>
          <select
            className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
            {...register("status")}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.status && <span className="text-sm text-destructive">{errors.status.message}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Bedrooms</label>
          <Input
            type="number"
            min={0}
            {...register("bedrooms", { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.bedrooms && <span className="text-sm text-destructive">{errors.bedrooms.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Bathrooms</label>
          <Input
            type="number"
            min={0}
            {...register("bathrooms", { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.bathrooms && <span className="text-sm text-destructive">{errors.bathrooms.message}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Square Feet</label>
          <Input
            type="number"
            min={0}
            {...register("squareFeet", { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.squareFeet && <span className="text-sm text-destructive">{errors.squareFeet.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Monthly Rent ($)</label>
          <Input
            type="number"
            min={0}
            {...register("monthlyRent", { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.monthlyRent && <span className="text-sm text-destructive">{errors.monthlyRent.message}</span>}
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Purchase Date</label>
        <Input
          type="date"
          {...register("purchaseDate")}
        />
        {errors.purchaseDate && <span className="text-sm text-destructive">{errors.purchaseDate.message}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Monthly Mortgage ($)</label>
          <Input
            type="number"
            min={0}
            {...register("monthlyMortgage", { valueAsNumber: true })}
            placeholder="Optional"
          />
          {errors.monthlyMortgage && <span className="text-sm text-destructive">{errors.monthlyMortgage.message}</span>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Monthly CapEx Reserve ($)</label>
          <Input
            type="number"
            min={0}
            {...register("monthlyCapEx", { valueAsNumber: true })}
            placeholder="Auto-calculated (10% of mortgage)"
          />
          <p className="text-xs text-muted-foreground mt-1">Auto-calculated as 10% of mortgage</p>
          {errors.monthlyCapEx && <span className="text-sm text-destructive">{errors.monthlyCapEx.message}</span>}
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground dark:text-gray-200">Property Image URL</label>
        <Input
          type="url"
          {...register("imageUrl")}
          placeholder="https://..."
        />
        {errors.imageUrl && <span className="text-sm text-destructive">{errors.imageUrl.message}</span>}
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