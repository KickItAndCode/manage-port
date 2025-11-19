"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UTILITY_TYPES } from "@/lib/constants";
import { 
  Percent,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  Save,
  Calculator,
  Info,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash,
  Home
} from "lucide-react";

interface UtilityResponsibilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultPropertyId?: Id<"properties">;
}

interface PropertyAllocation {
  propertyId: Id<"properties">;
  propertyName: string;
  propertyAddress: string;
  leases: Array<{
    leaseId: Id<"leases">;
    tenantName: string;
    unitIdentifier?: string;
    percentage: number;
  }>;
  totalAllocated: number;
  isComplete: boolean;
  hasActiveLeases: boolean;
}

const UTILITY_CONFIG = [
  { type: "Electric", icon: Zap, color: "text-yellow-600" },
  { type: "Water", icon: Droplets, color: "text-blue-600" },
  { type: "Gas", icon: Flame, color: "text-orange-600" },
  { type: "Sewer", icon: Droplets, color: "text-green-600" },
  { type: "Trash", icon: Trash, color: "text-gray-600" },
  { type: "Internet", icon: Wifi, color: "text-purple-600" },
  { type: "Cable", icon: Wifi, color: "text-purple-600" },
] as const;

const PRESET_TEMPLATES = [
  { name: "Equal Split", description: "Split equally among all tenants", getValue: (count: number) => Math.floor(100 / count) },
  { name: "60/40", description: "60% first tenant, 40% second", getValue: (count: number, index: number) => index === 0 ? 60 : 40, maxTenants: 2 },
  { name: "Tenant Pays All", description: "First tenant covers 100%", getValue: (count: number, index: number) => index === 0 ? 100 : 0 },
  { name: "Owner Pays All", description: "Owner covers 100%", getValue: () => 0 },
];

export function UtilityResponsibilityModal({
  open,
  onOpenChange,
  userId,
  defaultPropertyId
}: UtilityResponsibilityModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<Id<"properties"> | null>(null);
  const [allocations, setAllocations] = useState<Record<string, PropertyAllocation>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get all properties with units
  const propertiesResult = useQuery(api.properties.getProperties, { userId, limit: 1000 }); // Get all properties
  // Extract properties array from paginated result
  const properties = propertiesResult?.properties || (Array.isArray(propertiesResult) ? propertiesResult : []);
  
  // Get all active leases
  const allLeases = useQuery(api.leases.getLeases, { userId });
  
  // Get existing utility settings
  const utilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, 
    selectedPropertyId ? { propertyId: selectedPropertyId, userId } : "skip"
  );

  const saveUtilitySettings = useMutation(api.leaseUtilitySettings.setPropertyUtilityAllocations);

  // Filter properties that have leases (for selection screen)
  const propertiesWithLeases = properties?.filter(property => {
    const propertyLeases = allLeases?.filter(
      lease => lease.propertyId === property._id
    );
    return propertyLeases && propertyLeases.length > 0;
  }) || [];

  // Filter properties that have active leases (for configuration)
  const propertiesWithActiveLeases = properties?.filter(property => {
    const propertyLeases = allLeases?.filter(
      lease => lease.propertyId === property._id && lease.status === "active"
    );
    return propertyLeases && propertyLeases.length > 0;
  }) || [];

  // Initialize allocations when data loads
  useEffect(() => {
    if (!properties || !allLeases || propertiesWithActiveLeases.length === 0) return;

    const newAllocations: Record<string, PropertyAllocation> = {};

    propertiesWithActiveLeases.forEach(property => {
      if (!property || !property._id) return;
      
      const propertyLeases = allLeases.filter(
        lease => lease.propertyId === property._id && lease.status === "active"
      );

      if (!propertyLeases || propertyLeases.length === 0) return;

      const leaseAllocations = propertyLeases.map(lease => {
        // Get any existing setting for this lease to determine current percentage
        const allSettingsForLease = utilitySettings?.filter(s => s.leaseId === lease._id) || [];
        const existingSetting = allSettingsForLease.length > 0 ? allSettingsForLease[0] : null;

        return {
          leaseId: lease._id,
          tenantName: lease.tenantName,
          unitIdentifier: lease.unitId,
          percentage: existingSetting?.responsibilityPercentage || 0,
        };
      });

      const totalAllocated = leaseAllocations.reduce((sum, l) => sum + l.percentage, 0);

      newAllocations[property._id] = {
        propertyId: property._id,
        propertyName: property.name,
        propertyAddress: property.address,
        leases: leaseAllocations,
        totalAllocated,
        isComplete: totalAllocated === 100,
        hasActiveLeases: propertyLeases.length > 0,
      };
    });

    setAllocations(newAllocations);
  }, [properties, allLeases, utilitySettings]);

  // Initialize selectedPropertyId with first available property
  useEffect(() => {
    if (!selectedPropertyId && propertiesWithActiveLeases.length > 0) {
      setSelectedPropertyId(propertiesWithActiveLeases[0]._id);
    }
  }, [propertiesWithActiveLeases, selectedPropertyId]);

  const handlePercentageChange = (propertyId: Id<"properties">, leaseId: Id<"leases">, value: string) => {
    const numValue = parseInt(value) || 0;
    const percentage = Math.max(0, Math.min(100, numValue));

    setAllocations(prev => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        leases: prev[propertyId].leases.map(lease =>
          lease.leaseId === leaseId ? { ...lease, percentage } : lease
        ),
        totalAllocated: prev[propertyId].leases.reduce((sum, l) => 
          l.leaseId === leaseId ? sum + percentage : sum + l.percentage, 0
        ),
        isComplete: prev[propertyId].leases.reduce((sum, l) => 
          l.leaseId === leaseId ? sum + percentage : sum + l.percentage, 0
        ) === 100,
      }
    }));
    setHasChanges(true);
  };

  const applyTemplate = (propertyId: Id<"properties">, template: typeof PRESET_TEMPLATES[0]) => {
    const allocation = allocations[propertyId];
    if (!allocation) return;

    if (template.maxTenants && allocation.leases.length > template.maxTenants) {
      toast.error(`This template only works with up to ${template.maxTenants} tenants`);
      return;
    }

    const updatedLeases = allocation.leases.map((lease, index) => ({
      ...lease,
      percentage: template.getValue(allocation.leases.length, index),
    }));

    const totalAllocated = updatedLeases.reduce((sum, l) => sum + l.percentage, 0);

    setAllocations(prev => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        leases: updatedLeases,
        totalAllocated,
        isComplete: totalAllocated === 100,
      }
    }));
    setHasChanges(true);
  };

  // Loading state component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {/* Property selection skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Property info card skeleton */}
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-4 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Templates skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>

      {/* Progress skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>

      {/* Tenant allocations skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Info alert skeleton */}
      <div className="p-4 border rounded-lg">
        <div className="flex gap-3">
          <Skeleton className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );

  // Check if all required data is loaded
  const isLoading = !properties || !allLeases || (selectedPropertyId && !utilitySettings);

  const handleSave = async () => {
    setSaving(true);
    try {
      const propertyAllocation = selectedPropertyId ? allocations[selectedPropertyId] : null;
      
      if (!propertyAllocation) {
        toast.error("Please select a property");
        return;
      }

      if (propertyAllocation.totalAllocated > 100) {
        toast.error(`Total allocation is ${propertyAllocation.totalAllocated}%, which exceeds 100%`);
        return;
      }

      // Use atomic mutation to save all allocations at once
      const result = await saveUtilitySettings({
        propertyId: selectedPropertyId!,
        allocations: propertyAllocation.leases.map(lease => ({
          leaseId: lease.leaseId,
          percentage: lease.percentage,
        })),
        userId,
      });

      const ownerPercentage = 100 - propertyAllocation.totalAllocated;
      if (ownerPercentage > 0) {
        toast.success("Utility responsibilities saved!", {
          description: `Owner will cover ${ownerPercentage}% of all utilities.`,
        });
      } else {
        toast.success("Utility responsibilities saved successfully!", {
          description: "All utilities are fully allocated to tenants.",
        });
      }

      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save utility settings:", error);
      toast.error("Failed to save utility settings", {
        description: "Please try again or contact support if the issue persists.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(openState) => {
      if (!openState) {
        setHasChanges(false);
      }
      onOpenChange(openState);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Manage Utility Responsibilities
          </DialogTitle>
          <DialogDescription>
            Configure how utility bills are split between tenants for each property
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : propertiesWithLeases.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No properties with leases found. Add leases to your properties to configure utility responsibilities.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="property-select">Property</Label>
                  <select
                    id="property-select"
                    value={selectedPropertyId || ""}
                    onChange={(e) => setSelectedPropertyId(e.target.value as Id<"properties">)}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                  >
                    <option value="">Select a property</option>
                    {propertiesWithActiveLeases.map(property => {
                      const activeLeases = allLeases?.filter(
                        lease => lease.propertyId === property._id && lease.status === "active"
                      ) || [];
                      return (
                        <option key={property._id} value={property._id}>
                          {property.name} ({activeLeases.length} active lease{activeLeases.length !== 1 ? 's' : ''})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              {selectedPropertyId && (() => {
                const allocation = allocations[selectedPropertyId];
                const property = properties?.find(p => p._id === selectedPropertyId);
                if (!allocation || !property) return null;

                const ownerPercentage = 100 - allocation.totalAllocated;

                return (
                  <div className="space-y-4">
                    {/* Property Info */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{property.name}</h3>
                          <p className="text-sm text-muted-foreground">{property.address}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {allocation.leases.length} Active Lease{allocation.leases.length !== 1 ? 's' : ''}
                            </Badge>
                            {allocation.isComplete ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {allocation.totalAllocated}% Allocated
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Applies to all utilities:</p>
                          <div className="flex gap-1 mt-1">
                            {UTILITY_CONFIG.map(({ type, icon: Icon, color }) => (
                              <Icon key={type} className={`w-4 h-4 ${color}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Templates */}
                    <div className="flex flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground w-full">Quick Templates:</p>
                      {PRESET_TEMPLATES.map(template => (
                        <Button
                          key={template.name}
                          variant="outline"
                          size="sm"
                          onClick={() => applyTemplate(selectedPropertyId, template)}
                          disabled={!!template.maxTenants && allocation.leases.length > template.maxTenants}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Tenant Allocation</span>
                        <span className={
                          allocation.totalAllocated > 100 ? 'text-red-600' :
                          allocation.totalAllocated < 100 ? 'text-orange-600' : 'text-green-600'
                        }>
                          {allocation.totalAllocated}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(allocation.totalAllocated, 100)} 
                        className={`h-3 ${
                          allocation.totalAllocated > 100 ? '[&>div]:bg-red-500' :
                          allocation.totalAllocated < 100 ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'
                        }`}
                      />
                    </div>

                    {/* Tenant Allocations */}
                    <div className="space-y-3">
                      {allocation.leases.map(lease => (
                        <div key={lease.leaseId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{lease.tenantName}</p>
                              {lease.unitIdentifier && (
                                <p className="text-sm text-muted-foreground">Unit {lease.unitIdentifier}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={lease.percentage}
                              onChange={(e) => handlePercentageChange(selectedPropertyId, lease.leaseId, e.target.value)}
                              className="w-20 text-right"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      ))}

                      {/* Owner Responsibility */}
                      {ownerPercentage > 0 && (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 text-blue-600" />
                            <p className="font-medium text-blue-700 dark:text-blue-300">Owner Responsibility</p>
                          </div>
                          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                            {ownerPercentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These percentages will apply to all utility types for this property. 
                        {ownerPercentage > 0 && ` The owner will be responsible for ${ownerPercentage}% of all utility bills.`}
                      </AlertDescription>
                    </Alert>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t mt-4 px-1">
          <Button variant="outline" onClick={() => {
            setSelectedPropertyId(null);
            setHasChanges(false);
            onOpenChange(false);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!selectedPropertyId || saving || !hasChanges}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}