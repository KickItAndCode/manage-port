"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { UTILITY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { 
  Percent,
  Users,
  AlertTriangle,
  CheckCircle,
  Save,
  Edit,
  Home
} from "lucide-react";

interface PropertyUtilityAllocationProps {
  propertyId: Id<"properties">;
  userId: string;
}

interface LeaseAllocation {
  leaseId: Id<"leases">;
  tenantName: string;
  unitIdentifier?: string;
  percentage: number;
}

export function PropertyUtilityAllocation({ 
  propertyId, 
  userId 
}: PropertyUtilityAllocationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [allocations, setAllocations] = useState<LeaseAllocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Get active leases for the property
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get units for property to resolve unit identifiers
  const units = useQuery(api.units.getUnitsByProperty, {
    propertyId,
    userId,
  });

  // Get existing utility settings
  const utilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, {
    propertyId,
    userId,
  });

  // Get property information to check for utility defaults
  const property = useQuery(api.properties.getProperty, {
    id: propertyId,
    userId,
  });

  const saveUtilitySettings = useMutation(api.leaseUtilitySettings.setPropertyUtilityAllocations);

  // Initialize allocations when data loads
  useEffect(() => {
    if (leases && utilitySettings && units) {
      const activeLeases = leases.filter(l => l.status === "active");
      
      if (activeLeases.length > 0) {
        const newAllocations = activeLeases.map(lease => {
          // Get any existing setting for this lease to determine current percentage
          // Use the first available utility type rather than assuming "Electric" exists
          const allSettingsForLease = utilitySettings.filter(s => s.leaseId === lease._id);
          const referenceSetting = allSettingsForLease.length > 0 ? allSettingsForLease[0] : null;
          
          // Get unit identifier from units data
          let unitIdentifier: string | undefined;
          if (lease.unitId) {
            const unit = units.find(u => u._id === lease.unitId);
            if (unit) {
              unitIdentifier = unit.displayName || unit.unitIdentifier;
            }
          }
          
          const percentage = referenceSetting?.responsibilityPercentage || 0;
          return {
            leaseId: lease._id,
            tenantName: lease.tenantName,
            unitIdentifier,
            percentage,
          };
        });
        setAllocations(newAllocations);
        
        // Initialize input values
        const newInputValues: Record<string, string> = {};
        newAllocations.forEach(allocation => {
          newInputValues[allocation.leaseId] = allocation.percentage.toString();
        });
        setInputValues(newInputValues);
      }
    }
  }, [leases, utilitySettings, units]);

  const activeLeases = leases?.filter(l => l.status === "active") || [];

  const totalAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const ownerPercentage = Math.max(0, 100 - totalAllocated);
  const isComplete = totalAllocated === 100;
  const isOverAllocated = totalAllocated > 100;

  const handleInputChange = (leaseId: Id<"leases">, value: string) => {
    // Update input display value immediately
    setInputValues(prev => ({
      ...prev,
      [leaseId]: value
    }));
    
    // Convert to number and update allocations
    const numValue = value === '' ? 0 : parseInt(value, 10);
    const percentage = isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
    
    setAllocations(prev =>
      prev.map(allocation =>
        allocation.leaseId === leaseId
          ? { ...allocation, percentage }
          : allocation
      )
    );
  };

  const handleEqualSplit = () => {
    if (allocations.length === 0) return;
    const equalPercentage = Math.floor(100 / allocations.length);
    const remainder = 100 - (equalPercentage * allocations.length);

    const newAllocations = allocations.map((allocation, index) => {
      const newPercentage = equalPercentage + (index === 0 ? remainder : 0);
      return {
        ...allocation,
        percentage: newPercentage,
      };
    });

    setAllocations(newAllocations);

    // Update input values too
    const newInputValues: Record<string, string> = {};
    newAllocations.forEach((allocation) => {
      newInputValues[allocation.leaseId] = allocation.percentage.toString();
    });
    setInputValues(newInputValues);
  };

  const handleSave = async () => {
    if (isOverAllocated) {
      toast.error(`Total allocation is ${totalAllocated}%`, {
        description: "Please adjust the percentages to not exceed 100%.",
      });
      return;
    }

    setSaving(true);
    try {
      // Use atomic mutation to save all allocations at once
      const result = await saveUtilitySettings({
        propertyId,
        allocations: allocations.map(allocation => ({
          leaseId: allocation.leaseId,
          percentage: allocation.percentage,
        })),
        userId,
      });
      
      if (!isComplete) {
        toast.success("Utility responsibilities saved!", {
          description: `Total allocation is ${totalAllocated}%. Owner will cover the remaining ${ownerPercentage}%.`,
        });
      } else {
        toast.success("Utility responsibilities saved successfully!", {
          description: "All utilities are fully allocated to tenants.",
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save utility settings:", error);
      toast.error("Failed to save utility settings", {
        description: "Please try again or contact support if the issue persists.",
      });
    } finally {
      setSaving(false);
    }
  };


  if (!leases || !utilitySettings || !units) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeLeases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Utility Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No active leases found. Add leases to configure utility responsibilities.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 w-full">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Utility Responsibilities
          </CardTitle>
          
          {/* Status and Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
            {!isEditing && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs sm:text-sm transition-colors w-fit",
                  isComplete 
                    ? "text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20" 
                    : "text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-950/20"
                )}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {isComplete ? "Complete" : "Configured"}
              </Badge>
            )}
            
            <div className="flex gap-2 w-full sm:w-auto justify-end flex-shrink-0 max-w-full overflow-hidden">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="transition-all hover:scale-105 active:scale-95 text-xs px-3 flex-shrink-0"
                  >
                    <Edit className="w-4 h-4 mr-1 sm:mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="transition-all hover:scale-105 active:scale-95 flex-1 sm:flex-none min-w-[70px] text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isOverAllocated || saving}
                    className={cn(
                      "transition-all hover:scale-105 active:scale-95 flex-1 sm:flex-none min-w-[70px] text-xs",
                      isOverAllocated 
                        ? "bg-red-500 hover:bg-red-600" 
                        : "bg-primary hover:bg-primary/90"
                    )}
                    title={isOverAllocated ? `Total allocation is ${totalAllocated}%, cannot exceed 100%` : !isComplete ? `Total allocation is ${totalAllocated}%` : ''}
                  >
                    <Save className="w-4 h-4 mr-1 sm:mr-2" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {isEditing && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Allocation</span>
                <span className={cn(
                  "font-bold",
                  totalAllocated > 100 ? "text-red-600" :
                  totalAllocated === 100 ? "text-green-600" : "text-blue-600"
                )}>
                  {totalAllocated}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    totalAllocated > 100 ? "bg-red-500" :
                    totalAllocated === 100 ? "bg-green-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(totalAllocated, 100)}%` }}
                />
              </div>
              {totalAllocated !== 100 && (
                <p className={cn(
                  "text-xs",
                  totalAllocated > 100 ? "text-red-600" : "text-blue-600"
                )}>
                  {totalAllocated > 100 
                    ? `Over-allocated by ${totalAllocated - 100}%`
                    : `Owner covers remaining ${100 - totalAllocated}%`
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Universal allocation notice */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Percent className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm">
            Applies to all utility types
          </AlertDescription>
        </Alert>


        {/* Progress Bar */}
        {isOverAllocated && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Total allocation exceeds 100%. Please adjust the percentages.
            </AlertDescription>
          </Alert>
        )}

        {/* Tenant Allocations */}
        <div className="space-y-3">
          {allocations.map((allocation, index) => (
            <div 
              key={allocation.leaseId}
              className={cn(
                "group relative transition-all duration-200 rounded-lg border overflow-hidden",
                isEditing 
                  ? "p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:shadow-md border-gray-200 dark:border-gray-700" 
                  : "p-3 bg-card hover:bg-muted/50 border-gray-200 dark:border-gray-700"
              )}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "rounded-lg flex-shrink-0 transition-colors",
                    isEditing ? "p-2 sm:p-3 bg-primary/10" : "p-2 bg-muted"
                  )}>
                    <Users className={cn(
                      "w-4 h-4",
                      isEditing ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{allocation.tenantName}</div>
                    {allocation.unitIdentifier && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {allocation.unitIdentifier}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 flex-shrink-0 w-full sm:w-auto">
                  {isEditing ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={inputValues[allocation.leaseId] || '0'}
                        onChange={(e) => 
                          handleInputChange(allocation.leaseId, e.target.value)
                        }
                        onBlur={(e) => {
                          const value = e.target.value;
                          const numValue = parseInt(value, 10);
                          if (isNaN(numValue) || value === '') {
                            handleInputChange(allocation.leaseId, '0');
                          }
                        }}
                        className="w-16 sm:w-20 text-right text-sm focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground font-medium">%</span>
                    </div>
                  ) : (
                    <div className="text-lg sm:text-xl font-bold text-primary">
                      {allocation.percentage}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Owner Responsibility */}
          {ownerPercentage > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800 overflow-hidden transition-all duration-200 hover:shadow-md">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 sm:p-3 rounded-lg bg-blue-200 dark:bg-blue-800 flex-shrink-0">
                  <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="font-semibold text-blue-700 dark:text-blue-300 text-sm sm:text-base truncate">
                  Owner Responsibility
                </div>
              </div>
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 flex-shrink-0 text-right sm:text-left">
                {ownerPercentage}%
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {isEditing && (
          <div className="bg-gradient-to-r from-muted/20 to-muted/40 rounded-lg p-4 border border-border/50">
            <div className="space-y-4">
              {/* Main Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEqualSplit}
                  className="transition-all hover:scale-105 active:scale-95 text-xs font-medium"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Equal Split</span>
                  <span className="sm:hidden">Equal</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAllocations(prev => 
                      prev.map(a => ({ ...a, percentage: 0 }))
                    );
                    const clearedInputs: Record<string, string> = {};
                    allocations.forEach(allocation => {
                      clearedInputs[allocation.leaseId] = '0';
                    });
                    setInputValues(clearedInputs);
                  }}
                  className="transition-all hover:scale-105 active:scale-95 text-xs font-medium"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Clear All</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>
              
              {/* Quick Preset Buttons - Only show for single tenant */}
              {allocations.length === 1 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground text-center font-medium">
                    Quick Presets for Single Tenant
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((percent) => (
                      <Button
                        key={percent}
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newAllocations = allocations.map(a => ({ ...a, percentage: percent }));
                          setAllocations(newAllocations);
                          setInputValues({ [allocations[0].leaseId]: percent.toString() });
                        }}
                        className="text-xs font-semibold h-8 transition-all hover:scale-105 active:scale-95 bg-primary/10 hover:bg-primary/20 border-primary/20"
                        title={`Set tenant to ${percent}%, owner pays ${100 - percent}%`}
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Multi-tenant helper */}
              {allocations.length > 1 && (
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">
                    Use <span className="font-semibold">Equal Split</span> for {allocations.length} tenants or adjust percentages manually
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              Allocation Summary
            </h4>
            <div className="text-right sm:text-center">
              <div className="text-xl font-bold text-green-600">{totalAllocated}%</div>
              <div className="text-xs text-muted-foreground">to tenants</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex justify-between sm:block sm:text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="sm:hidden text-muted-foreground">Active Tenants</div>
              <div className="font-semibold text-base">{activeLeases.length}</div>
              <div className="hidden sm:block text-muted-foreground">Active Tenants</div>
            </div>
            <div className="flex justify-between sm:block sm:text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="sm:hidden text-muted-foreground">Utilities</div>
              <div className="font-semibold text-base">{UTILITY_TYPES.length}</div>
              <div className="hidden sm:block text-muted-foreground">Utilities</div>
            </div>
            <div className="flex justify-between sm:block sm:text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="sm:hidden text-muted-foreground">Owner Share</div>
              <div className="font-semibold text-base text-blue-600">{ownerPercentage}%</div>
              <div className="hidden sm:block text-muted-foreground">Owner Share</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}