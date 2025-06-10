"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { FormField } from "@/components/ui/form-field";
import { FormContainer } from "@/components/ui/form-container";

export interface PropertyFormProps {
  initial?: {
    name: string;
    address: string;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    purchaseDate: string;
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
    purchaseDate: string;
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
  purchaseDate: z.string().min(4, "Purchase date required"),
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
      purchaseDate: randomDate(new Date(2015, 0, 1), new Date()),
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
    <FormContainer variant="elevated">
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
      <FormField
        label="Property Name"
        required
        error={errors.name?.message}
      >
        <Input
          {...register("name")}
          placeholder="Enter property name"
        />
      </FormField>
      <FormField
        label="Address"
        required
        error={errors.address?.message}
      >
        <Input
          {...register("address")}
          placeholder="Enter property address"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Property Type"
          required
          error={errors.type?.message}
        >
          <SelectNative {...register("type")}>
            <option value="">Select property type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectNative>
        </FormField>
        
        <FormField
          label="Status"
          required
          error={errors.status?.message}
        >
          <SelectNative {...register("status")}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </SelectNative>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Bedrooms"
          required
          error={errors.bedrooms?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("bedrooms", { valueAsNumber: true })}
            placeholder="0"
          />
        </FormField>
        
        <FormField
          label="Bathrooms"
          required
          error={errors.bathrooms?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("bathrooms", { valueAsNumber: true })}
            placeholder="0"
          />
        </FormField>
      </div>
      <FormField
        label="Square Feet"
        required
        error={errors.squareFeet?.message}
      >
        <Input
          type="number"
          min={0}
          {...register("squareFeet", { valueAsNumber: true })}
          placeholder="0"
        />
      </FormField>
      <FormField
        label="Purchase Date"
        required
        error={errors.purchaseDate?.message}
      >
        <Input
          type="date"
          {...register("purchaseDate")}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Monthly Mortgage ($)"
          error={errors.monthlyMortgage?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("monthlyMortgage", { valueAsNumber: true })}
            placeholder="Optional"
          />
        </FormField>
        
        <FormField
          label="Monthly CapEx Reserve ($)"
          description="Auto-calculated as 10% of mortgage"
          error={errors.monthlyCapEx?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("monthlyCapEx", { valueAsNumber: true })}
            placeholder="Auto-calculated (10% of mortgage)"
          />
        </FormField>
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
    </FormContainer>
  );
} 