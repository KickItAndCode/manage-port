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
    purchasePrice?: number;
    currentValue?: number;
    cashInvested?: number;
    tracksUtilities?: boolean;
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
    purchasePrice?: number;
    currentValue?: number;
    cashInvested?: number;
    tracksUtilities?: boolean;
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
  purchasePrice: z.coerce.number().min(0).optional(),
  currentValue: z.coerce.number().min(0).optional(),
  cashInvested: z.coerce.number().min(0).optional(),
  tracksUtilities: z.boolean().optional(),
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
        data-testid="property-form"
      >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fillWithDummyData}
        data-testid="fill-dummy-data-button"
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
          data-testid="property-name-input"
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
          data-testid="property-address-input"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Property Type"
          required
          error={errors.type?.message}
        >
          <SelectNative {...register("type")} data-testid="property-type-select">
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
          <SelectNative {...register("status")} data-testid="property-status-select">
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
            data-testid="property-bedrooms-input"
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
            data-testid="property-bathrooms-input"
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
          data-testid="property-square-feet-input"
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
          data-testid="property-purchase-date-input"
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
            data-testid="property-monthly-mortgage-input"
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
            data-testid="property-monthly-capex-input"
          />
        </FormField>
      </div>

      {/*
        What the property cost and is worth. Without these the app can show
        money moving each month but never whether the property is a good one.
        All optional — an owner who does not track valuations is not blocked.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Purchase Price ($)"
          error={errors.purchasePrice?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("purchasePrice", { valueAsNumber: true })}
            placeholder="Optional"
            data-testid="property-purchase-price-input"
          />
        </FormField>

        <FormField
          label="Current Value ($)"
          description="Used for equity and cap rate"
          error={errors.currentValue?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("currentValue", { valueAsNumber: true })}
            placeholder="Optional"
            data-testid="property-current-value-input"
          />
        </FormField>
      </div>

      {/*
        Where the tenant is billed directly by the utility company, no bill ever
        reaches the owner and the entire splitting surface is noise on this
        property. Defaults to on, and undefined counts as on, so nothing
        created before this changes behaviour.
      */}
      <FormField
        label="I receive the utility bills for this property"
        description="Turn off when tenants are billed directly by the utility company"
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={initial?.tracksUtilities !== false}
            {...register("tracksUtilities")}
            className="h-4 w-4 rounded border-input"
            data-testid="property-tracks-utilities-input"
          />
          <span className="text-muted-foreground">
            Bills for this property are mine to record and split
          </span>
        </label>
      </FormField>

      <FormField
        label="Cash Invested ($)"
        description="Deposit, closing costs and rehab — needed for cash-on-cash return"
        error={errors.cashInvested?.message}
      >
        <Input
          type="number"
          min={0}
          {...register("cashInvested", { valueAsNumber: true })}
          placeholder="Optional"
          data-testid="property-cash-invested-input"
        />
      </FormField>
      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={loading || isSubmitting}
            data-testid="cancel-property-button"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={loading || isSubmitting}
          data-testid="save-property-button"
        >
          {loading || isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
      </form>
    </FormContainer>
  );
} 