"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LeaseFormProps {
  properties: { _id: string; name: string }[];
  initial?: {
    propertyId: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone: string;
    startDate: string;
    endDate: string;
    rent: number;
    status: string;
    leaseDocumentUrl: string;
  };
  onSubmit: (data: {
    propertyId: string;
    tenantName: string;
    tenantEmail: string;
    tenantPhone: string;
    startDate: string;
    endDate: string;
    rent: number;
    status: string;
    leaseDocumentUrl: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const leaseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantName: z.string().min(2, "Tenant name is required"),
  tenantEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  tenantPhone: z.string().regex(/^\+?[0-9\-() ]*$/, "Invalid phone").optional().or(z.literal("")),
  startDate: z.string().min(4, "Start date is required"),
  endDate: z.string().min(4, "End date is required"),
  rent: z.coerce.number().min(0, "Rent is required"),
  status: z.enum(["active", "expired"]),
  leaseDocumentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type LeaseFormType = z.infer<typeof leaseSchema>;

export function LeaseForm({ properties, initial, onSubmit, onCancel, loading }: LeaseFormProps) {
  if (!properties || properties.length === 0) {
    return <div className="text-center text-muted-foreground">No properties available. Please add a property first.</div>;
  }
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<LeaseFormType>({
    resolver: zodResolver(leaseSchema),
    defaultValues: initial as LeaseFormType || {},
  });

  // Dummy data generator with randomization
  function fillWithDummyData() {
    const tenants = ["John Doe", "Jane Smith", "Alice Johnson", "Bob Lee", "Maria Garcia", "David Kim"];
    const emails = ["john@example.com", "jane@example.com", "alice@example.com", "bob@example.com", "maria@example.com", "david@example.com"];
    const phones = ["+1234567890", "+1987654321", "+1123456789", "", "", ""];
    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function randomDate(start: Date, end: Date) {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString().split("T")[0];
    }
    const start = randomDate(new Date(2022, 0, 1), new Date());
    const end = randomDate(new Date(start), new Date(2026, 11, 31));
    reset({
      propertyId: properties[randomInt(0, properties.length - 1)]?._id || "",
      tenantName: tenants[randomInt(0, tenants.length - 1)],
      tenantEmail: emails[randomInt(0, emails.length - 1)],
      tenantPhone: phones[randomInt(0, phones.length - 1)],
      startDate: start,
      endDate: end,
      rent: randomInt(900, 7500) * 10,
      status: Math.random() > 0.5 ? "active" as const : "expired" as const,
      leaseDocumentUrl: "https://example.com/lease.pdf",
    });
  }

  return (
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-md"
      onSubmit={handleSubmit(onSubmit as any)}
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
        <label className="block text-zinc-200 mb-1">Tenant Name</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          {...register("tenantName")}
          required
        />
        {errors.tenantName && <span className="text-red-400 text-sm">{errors.tenantName.message}</span>}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Tenant Email (optional)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="email"
            {...register("tenantEmail")}
          />
          {errors.tenantEmail && <span className="text-red-400 text-sm">{errors.tenantEmail.message}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Tenant Phone (optional)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="tel"
            {...register("tenantPhone")}
          />
          {errors.tenantPhone && <span className="text-red-400 text-sm">{errors.tenantPhone.message}</span>}
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Start Date</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="date"
            {...register("startDate")}
            required
          />
          {errors.startDate && <span className="text-red-400 text-sm">{errors.startDate.message}</span>}
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">End Date</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="date"
            {...register("endDate")}
            required
          />
          {errors.endDate && <span className="text-red-400 text-sm">{errors.endDate.message}</span>}
        </div>
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Monthly Rent ($)</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="number"
          min={0}
          {...register("rent", { valueAsNumber: true })}
          required
        />
        {errors.rent && <span className="text-red-400 text-sm">{errors.rent.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Status</label>
        <select
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
          {...register("status")}
          required
        >
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
        {errors.status && <span className="text-red-400 text-sm">{errors.status.message}</span>}
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Lease Document (optional)</label>
        <input
          type="file"
          className="block w-full text-zinc-100 bg-zinc-800 border-zinc-700 rounded-lg"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Placeholder: just use a fake URL for now
              setValue("leaseDocumentUrl", `https://example.com/${file.name}`);
            }
          }}
        />
        {errors.leaseDocumentUrl && <span className="text-red-400 text-sm">{errors.leaseDocumentUrl.message}</span>}
        {/* Show uploaded file link if present */}
        {typeof (watch && watch("leaseDocumentUrl")) === "string" && (watch && watch("leaseDocumentUrl")) && (
          <a href={watch("leaseDocumentUrl") as string} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline mt-1 block">View Uploaded Document</a>
        )}
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