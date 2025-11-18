"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { FormField } from "@/components/ui/form-field";
import { FormContainer } from "@/components/ui/form-container";
import { FormGrid } from "@/components/ui/form-grid";
import { FormActions } from "@/components/ui/form-actions";
import { Textarea } from "@/components/ui/textarea";
import { leaseSchema, multiUnitLeaseSchema, type LeaseFormData } from "@/lib/validation";
import { LeaseDocumentUpload } from "@/components/LeaseDocumentUpload";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { useLeaseStatus } from "@/hooks/use-lease-status";
import { getStatusDescription } from "@/lib/lease-status";

export interface LeaseFormProps {
  properties: { _id: string; name: string; address?: string }[];
  userId: string;
  initial?: {
    propertyId: string;
    unitId?: string;
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    startDate: string;
    endDate: string;
    rent: number;
    securityDeposit?: number;
    status?: string; // Optional now since it's computed
    notes?: string;
    leaseDocumentUrl?: string;
  };
  onSubmit: (data: {
    propertyId: string;
    unitId?: string;
    tenantName: string;
    tenantEmail?: string;
    tenantPhone?: string;
    startDate: string;
    endDate: string;
    rent: number;
    securityDeposit?: number;
    status?: string; // Optional now since it's computed
    notes?: string;
    leaseDocumentUrl?: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

type LeaseFormType = LeaseFormData;

export function LeaseForm({ properties, userId, initial, onSubmit, onCancel, loading }: LeaseFormProps) {
  const [leaseDocumentData, setLeaseDocumentData] = useState<{
    storageId: string;
    name: string;
    size: number;
    mimeType: string;
  } | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initial?.propertyId || "");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initial?.unitId || "");
  
  // Query units for selected property
  const units = useQuery(
    api.units.getUnitsByProperty,
    selectedPropertyId && userId
      ? { propertyId: selectedPropertyId as Id<"properties">, userId }
      : "skip"
  );

  // Query selected property details to determine if unit selection is required
  const selectedProperty = useQuery(
    api.properties.getProperty,
    selectedPropertyId && userId
      ? { id: selectedPropertyId as Id<"properties">, userId }
      : "skip"
  );

  // Determine if unit selection is required based on property type and available units
  const isMultiUnit = selectedProperty?.propertyType === "multi-family" || (units && units.length > 1);
  const requiresUnitSelection = isMultiUnit && units && units.length > 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm<LeaseFormType>({
    resolver: zodResolver(requiresUnitSelection ? multiUnitLeaseSchema : leaseSchema),
    defaultValues: initial as LeaseFormType || {},
  });

  // Update selected property when form value changes
  const watchedPropertyId = watch("propertyId");
  useEffect(() => {
    if (watchedPropertyId !== selectedPropertyId) {
      setSelectedPropertyId(watchedPropertyId);
      setSelectedUnitId(""); // Reset unit selection when property changes
    }
  }, [watchedPropertyId]);
  
  if (!properties || properties.length === 0) {
    return <div className="text-center text-muted-foreground">No properties available. Please add a property first.</div>;
  }

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const { status: computedStatus, daysUntilExpiry } = useLeaseStatus(startDate || new Date().toISOString(), endDate || new Date().toISOString());

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
      // Status is now computed based on dates
      notes: `Standard ${randomInt(6, 12)}-month lease agreement`,
      leaseDocumentUrl: `https://example.com/lease-${Date.now()}.pdf`,
    });
    
    // Reset document upload state
    setLeaseDocumentData(null);
  }

  return (
    <FormContainer variant="elevated">
      <form
        className="space-y-6"
        onSubmit={handleSubmit((data) => {
          // Include the document storage ID and unit ID in the submission
          // Omit status since it's now computed from dates
          const { status, ...dataWithoutStatus } = data;
          onSubmit({
            ...dataWithoutStatus,
            unitId: selectedUnitId || undefined,
            leaseDocumentUrl: leaseDocumentData?.storageId || data.leaseDocumentUrl,
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
      
        <FormField 
          label="Property" 
          required 
          error={errors.propertyId?.message}
        >
          <SelectNative {...register("propertyId")} required>
            <option value="">Select property</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} {p.address ? `- ${p.address}` : ''}
              </option>
            ))}
          </SelectNative>
        </FormField>

        {/* Unit Selection - Show if property has units */}
        {units && units.length > 0 && (
          <FormField
            label="Unit"
            required={requiresUnitSelection}
            error={errors.unitId?.message}
            description={
              requiresUnitSelection 
                ? "Unit selection is required for multi-unit properties. Units marked as \"occupied\" already have active leases."
                : "Select a specific unit for this lease. Units marked as \"occupied\" already have active leases."
            }
          >
            <SelectNative
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setValue("unitId" as any, e.target.value);
                if (e.target.value && errors.unitId) {
                  clearErrors("unitId");
                }
              }}
              required={requiresUnitSelection}
              className={errors.unitId ? "border-destructive" : ""}
            >
              <option value="">
                {requiresUnitSelection ? "Select unit (required)" : "Select unit (optional)"}
              </option>
              {units.map((unit) => (
                <option key={unit._id} value={unit._id} disabled={unit.status === "occupied"}>
                  {unit.unitIdentifier} - {unit.status}
                  {unit.bedrooms && ` (${unit.bedrooms}BR)`}
                </option>
              ))}
            </SelectNative>
            
            {requiresUnitSelection && !selectedUnitId && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ This property requires unit assignment for proper utility billing and lease management.
                </span>
              </div>
            )}
          </FormField>
        )}

        <FormField
          label="Tenant Name"
          required
          error={errors.tenantName?.message}
        >
          <Input
            placeholder="e.g., John Smith"
            {...register("tenantName")}
            required
          />
        </FormField>

        <FormGrid cols={2}>
          <FormField
            label="Tenant Email"
            error={errors.tenantEmail?.message}
          >
            <Input
              type="email"
              placeholder="tenant@email.com"
              {...register("tenantEmail")}
            />
          </FormField>
          
          <FormField
            label="Tenant Phone"
            error={errors.tenantPhone?.message}
          >
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              {...register("tenantPhone")}
            />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField
            label="Start Date"
            required
            error={errors.startDate?.message}
          >
            <Input
              type="date"
              {...register("startDate")}
              required
            />
          </FormField>
          
          <FormField
            label="End Date"
            required
            error={errors.endDate?.message}
          >
            <Input
              type="date"
              {...register("endDate")}
              required
            />
          </FormField>
        </FormGrid>

        <FormGrid cols={2}>
          <FormField
            label="Monthly Rent ($)"
            required
            error={errors.rent?.message}
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...register("rent", { valueAsNumber: true })}
              required
            />
          </FormField>
          
          <FormField
            label="Security Deposit ($)"
            error={errors.securityDeposit?.message}
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              {...register("securityDeposit", { valueAsNumber: true })}
            />
          </FormField>
        </FormGrid>

        {/* Computed Status Display - Read Only */}
        {startDate && endDate && (
          <FormField
            label="Computed Status"
            description="Status is automatically determined based on lease dates"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {computedStatus === "active" && <Badge variant="default">Active Lease</Badge>}
                {computedStatus === "pending" && <Badge variant="secondary">Pending Lease</Badge>}
                {computedStatus === "expired" && <Badge variant="destructive">Expired Lease</Badge>}
                <span className="text-sm text-muted-foreground">
                  {getStatusDescription(computedStatus, daysUntilExpiry)}
                </span>
              </div>
              {computedStatus === "active" && daysUntilExpiry !== null && daysUntilExpiry <= 60 && daysUntilExpiry >= 0 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ This lease expires in {daysUntilExpiry} days. Consider renewal discussions with the tenant.
                  </span>
                </div>
              )}
            </div>
          </FormField>
        )}

        <LeaseDocumentUpload
          propertyId={watch("propertyId")}
          onUploadComplete={(fileData) => {
            setLeaseDocumentData(fileData.storageId ? fileData : null);
          }}
          onUploadError={(error) => {
            console.error("Document upload error:", error);
          }}
        />

        <FormField
          label="Notes"
          error={errors.notes?.message}
        >
          <Textarea
            placeholder="Additional lease notes or terms"
            rows={3}
            {...register("notes")}
          />
        </FormField>

        <FormActions className="pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading || isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading || isSubmitting}>
            {loading || isSubmitting ? "Saving..." : "Save Lease"}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );
}