"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { leaseSchema, type LeaseFormData } from "@/lib/validation";
import { LeaseDocumentUpload } from "@/components/LeaseDocumentUpload";

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

type LeaseFormType = LeaseFormData;

export function LeaseForm({ properties, initial, onSubmit, onCancel, loading }: LeaseFormProps) {
  const [leaseDocumentStorageId, setLeaseDocumentStorageId] = useState<string>("");
  
  const {
    register,
    handleSubmit,
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
  
  if (!properties || properties.length === 0) {
    return <div className="text-center text-muted-foreground">No properties available. Please add a property first.</div>;
  }

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
    
    // Reset document upload state
    setLeaseDocumentStorageId("");
  }

  return (
    <div className="dark:bg-gradient-to-br dark:from-gray-900/50 dark:to-gray-800/30 dark:border dark:border-gray-700/50 dark:rounded-lg dark:p-6">
      <form
        className="space-y-6"
        onSubmit={handleSubmit((data) => {
          // Include the document storage ID in the submission
          onSubmit({
            ...data,
            leaseDocumentUrl: leaseDocumentStorageId || data.leaseDocumentUrl,
          });
        })}
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
      
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Property *</label>
          <select
            className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
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
          {errors.propertyId && <span className="text-sm text-destructive">{errors.propertyId.message}</span>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Tenant Name *</label>
          <Input
            placeholder="e.g., John Smith"
            {...register("tenantName")}
            required
          />
          {errors.tenantName && <span className="text-sm text-destructive">{errors.tenantName.message}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Tenant Email (optional)</label>
            <Input
              type="email"
              placeholder="tenant@email.com"
              {...register("tenantEmail")}
            />
            {errors.tenantEmail && <span className="text-sm text-destructive">{errors.tenantEmail.message}</span>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Tenant Phone (optional)</label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              {...register("tenantPhone")}
            />
            {errors.tenantPhone && <span className="text-sm text-destructive">{errors.tenantPhone.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Start Date *</label>
            <Input
              type="date"
              {...register("startDate")}
              required
            />
            {errors.startDate && <span className="text-sm text-destructive">{errors.startDate.message}</span>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">End Date *</label>
            <Input
              type="date"
              {...register("endDate")}
              required
            />
            {errors.endDate && <span className="text-sm text-destructive">{errors.endDate.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Monthly Rent ($) *</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...register("rent", { valueAsNumber: true })}
              required
            />
            {errors.rent && <span className="text-sm text-destructive">{errors.rent.message}</span>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Security Deposit ($)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...register("securityDeposit", { valueAsNumber: true })}
            />
            {errors.securityDeposit && <span className="text-sm text-destructive">{errors.securityDeposit.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Status *</label>
            <select
              className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
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
            {errors.status && <span className="text-sm text-destructive">{errors.status.message}</span>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground dark:text-gray-200">Payment Day (1-31)</label>
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="1"
              {...register("paymentDay", { valueAsNumber: true })}
            />
            {errors.paymentDay && <span className="text-sm text-destructive">{errors.paymentDay.message}</span>}
            <p className="text-xs text-muted-foreground mt-1">Day of month rent is due</p>
          </div>
        </div>

        <LeaseDocumentUpload
          propertyId={watch("propertyId")}
          onUploadComplete={(storageId) => {
            setLeaseDocumentStorageId(storageId);
          }}
          onUploadError={(error) => {
            console.error("Document upload error:", error);
          }}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground dark:text-gray-200">Notes (optional)</label>
          <textarea
            className="w-full px-3 py-2 rounded-md border transition-all outline-none min-h-[80px] bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary resize-y"
            placeholder="Additional lease notes or terms"
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
            {loading || isSubmitting ? "Saving..." : "Save Lease"}
          </Button>
        </div>
      </form>
    </div>
  );
}