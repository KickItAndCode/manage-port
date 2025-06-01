"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
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
});
type PropertyFormType = z.infer<typeof propertySchema>;

export function PropertyForm({ initial, onSubmit, onCancel, loading }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PropertyFormType>({
    resolver: zodResolver(propertySchema),
    defaultValues: initial || {},
  });

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
    const types = ["Single Family", "Apartment", "Condo", "Townhouse", "Multi-Family", "Duplex", "Other"];
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
    "Apartment",
    "Condo",
    "Single Family",
    "Townhouse",
    "Multi-Family",
    "Duplex",
    "Other",
  ];
  const statusOptions = ["Available", "Occupied", "Maintenance", "Under Contract"];

  return (
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-xl"
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
        <label className="block text-zinc-200 mb-1">Property Name</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          {...register("name")}
          required
        />
        {errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Address</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          {...register("address")}
          required
        />
        {errors.address && <span className="text-red-400 text-sm">{errors.address.message}</span>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Property Type</label>
          <select
            className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
            {...register("type")}
            required
          >
            <option value="">Select property type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.type && <span className="text-red-400 text-sm">{errors.type.message}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Status</label>
          <select
            className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
            {...register("status")}
            required
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.status && <span className="text-red-400 text-sm">{errors.status.message}</span>}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Bedrooms</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            {...register("bedrooms", { valueAsNumber: true })}
            required
          />
          {errors.bedrooms && <span className="text-red-400 text-sm">{errors.bedrooms.message}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Bathrooms</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            {...register("bathrooms", { valueAsNumber: true })}
            required
          />
          {errors.bathrooms && <span className="text-red-400 text-sm">{errors.bathrooms.message}</span>}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Square Feet</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            {...register("squareFeet", { valueAsNumber: true })}
            required
          />
          {errors.squareFeet && <span className="text-red-400 text-sm">{errors.squareFeet.message}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Monthly Rent ($)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            {...register("monthlyRent", { valueAsNumber: true })}
            required
          />
          {errors.monthlyRent && <span className="text-red-400 text-sm">{errors.monthlyRent.message}</span>}
        </div>
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Purchase Date</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="date"
          {...register("purchaseDate")}
          required
        />
        {errors.purchaseDate && <span className="text-red-400 text-sm">{errors.purchaseDate.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Property Image URL</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="url"
          {...register("imageUrl")}
          placeholder="https://..."
        />
        {errors.imageUrl && <span className="text-red-400 text-sm">{errors.imageUrl.message}</span>}
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