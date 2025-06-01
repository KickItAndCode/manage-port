"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface LeaseFormProps {
  properties: { _id: string; name: string; address?: string }[];
  initial?: {
    propertyId: string;
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    startDate: string;
    endDate: string;
    rent: number;
    securityDeposit?: number;
    status: string;
    paymentDay?: number;
    notes?: string;
    leaseDocumentUrl?: string;
  };
  onSubmit: (data: {
    propertyId: string;
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    startDate: string;
    endDate: string;
    rent: number;
    securityDeposit?: number;
    status: string;
    paymentDay?: number;
    notes?: string;
    leaseDocumentUrl?: string;
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
  rent: z.coerce.number().min(0, "Rent must be positive"),
  securityDeposit: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "expired", "pending"]),
  paymentDay: z.coerce.number().min(1).max(31).optional(),
  notes: z.string().optional(),
  leaseDocumentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
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
    defaultValues: initial as LeaseFormType || {
      status: "pending",
      paymentDay: 1,
    },
  });

  const status = watch("status");

  // Dummy data generator with randomization
  function fillWithDummyData() {
    const firstNames = ["John", "Jane", "Michael", "Sarah", "Robert", "Emma", "David", "Lisa"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
    const domains = ["gmail.com", "yahoo.com", "outlook.com", "email.com"];
    
    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    const firstName = firstNames[randomInt(0, firstNames.length - 1)];
    const lastName = lastNames[randomInt(0, lastNames.length - 1)];
    const domain = domains[randomInt(0, domains.length - 1)];
    
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() + randomInt(0, 1), randomInt(1, 28));
    const endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate() - 1);
    
    const rent = randomInt(10, 30) * 100; // $1000-$3000
    
    reset({
      propertyId: properties[randomInt(0, properties.length - 1)]?._id || "",
      tenantName: `${firstName} ${lastName}`,
      tenantEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      tenantPhone: `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      rent: rent,
      securityDeposit: rent * randomInt(1, 2), // 1-2 months rent
      status: startDate <= today ? "active" : "pending",
      paymentDay: randomInt(1, 5), // 1st-5th of month
      notes: `Standard ${randomInt(6, 12)}-month lease agreement`,
      leaseDocumentUrl: `https://example.com/lease-${Date.now()}.pdf`,
    });
  }

  return (
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
      onSubmit={handleSubmit(onSubmit as any)}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Lease Information</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fillWithDummyData}
        >
          Fill with Dummy Data
        </Button>
      </div>
      
      <div>
        <label className="block text-zinc-200 mb-1">Property *</label>
        <select
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
          {...register("propertyId")}
          required
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} {p.address ? `- ${p.address}` : ''}
            </option>
          ))}
        </select>
        {errors.propertyId && <span className="text-red-400 text-sm">{errors.propertyId.message}</span>}
      </div>

      <div>
        <label className="block text-zinc-200 mb-1">Tenant Name *</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          placeholder="e.g., John Smith"
          {...register("tenantName")}
          required
        />
        {errors.tenantName && <span className="text-red-400 text-sm">{errors.tenantName.message}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-200 mb-1">Tenant Email (optional)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="email"
            placeholder="tenant@email.com"
            {...register("tenantEmail")}
          />
          {errors.tenantEmail && <span className="text-red-400 text-sm">{errors.tenantEmail.message}</span>}
        </div>
        <div>
          <label className="block text-zinc-200 mb-1">Tenant Phone (optional)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="tel"
            placeholder="(555) 123-4567"
            {...register("tenantPhone")}
          />
          {errors.tenantPhone && <span className="text-red-400 text-sm">{errors.tenantPhone.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-200 mb-1">Start Date *</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="date"
            {...register("startDate")}
            required
          />
          {errors.startDate && <span className="text-red-400 text-sm">{errors.startDate.message}</span>}
        </div>
        <div>
          <label className="block text-zinc-200 mb-1">End Date *</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="date"
            {...register("endDate")}
            required
          />
          {errors.endDate && <span className="text-red-400 text-sm">{errors.endDate.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-200 mb-1">Monthly Rent ($) *</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register("rent", { valueAsNumber: true })}
            required
          />
          {errors.rent && <span className="text-red-400 text-sm">{errors.rent.message}</span>}
        </div>
        <div>
          <label className="block text-zinc-200 mb-1">Security Deposit ($)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register("securityDeposit", { valueAsNumber: true })}
          />
          {errors.securityDeposit && <span className="text-red-400 text-sm">{errors.securityDeposit.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-200 mb-1">Status *</label>
          <select
            className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
            {...register("status")}
            required
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <div className="mt-1">
            {status === "active" && <Badge variant="default">Active Lease</Badge>}
            {status === "pending" && <Badge variant="secondary">Pending Lease</Badge>}
            {status === "expired" && <Badge variant="destructive">Expired Lease</Badge>}
          </div>
          {errors.status && <span className="text-red-400 text-sm">{errors.status.message}</span>}
        </div>
        <div>
          <label className="block text-zinc-200 mb-1">Payment Day (1-31)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={1}
            max={31}
            placeholder="1"
            {...register("paymentDay", { valueAsNumber: true })}
          />
          {errors.paymentDay && <span className="text-red-400 text-sm">{errors.paymentDay.message}</span>}
          <p className="text-xs text-muted-foreground mt-1">Day of month rent is due</p>
        </div>
      </div>

      <div>
        <label className="block text-zinc-200 mb-1">Lease Document URL (optional)</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="url"
          placeholder="https://example.com/lease.pdf"
          {...register("leaseDocumentUrl")}
        />
        {errors.leaseDocumentUrl && <span className="text-red-400 text-sm">{errors.leaseDocumentUrl.message}</span>}
        {watch("leaseDocumentUrl") && (
          <a href={watch("leaseDocumentUrl") as string} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline mt-1 block">
            View Document
          </a>
        )}
      </div>

      <div>
        <label className="block text-zinc-200 mb-1">Notes (optional)</label>
        <textarea
          className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2 min-h-[80px]"
          placeholder="Additional lease notes or terms"
          {...register("notes")}
        />
      </div>

      <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-zinc-700">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading || isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || isSubmitting}>
          {loading || isSubmitting ? "Saving..." : "Save Lease"}
        </Button>
      </div>
    </form>
  );
}