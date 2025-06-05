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
import { 
  Percent,
  Users,
  Home,
  AlertTriangle,
  CheckCircle,
  Save,
  Edit
} from "lucide-react";

interface UniversalUtilityAllocationProps {
  propertyId: Id<"properties">;
  userId: string;
}

interface LeaseAllocation {
  leaseId: Id<"leases">;
  tenantName: string;
  unitIdentifier?: string;
  percentage: number;
}

export function UniversalUtilityAllocation({ 
  propertyId, 
  userId 
}: UniversalUtilityAllocationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [allocations, setAllocations] = useState<LeaseAllocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Get active leases for the property
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get existing utility settings
  const utilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, {
    propertyId,
    userId,
  });

  const saveUtilitySettings = useMutation(api.leaseUtilitySettings.setPropertyUtilityAllocations);

  // Initialize allocations when data loads
  useEffect(() => {
    if (leases && utilitySettings) {
      const activeLeases = leases.filter(l => l.status === "active");
      
      if (activeLeases.length > 0) {
        const newAllocations = activeLeases.map(lease => {
          // Get any existing setting for this lease to determine current percentage
          // Use the first available utility type rather than assuming "Electric" exists
          const allSettingsForLease = utilitySettings.filter(s => s.leaseId === lease._id);
          const referenceSetting = allSettingsForLease.length > 0 ? allSettingsForLease[0] : null;
          
          const percentage = referenceSetting?.responsibilityPercentage || 0;
          return {
            leaseId: lease._id,
            tenantName: lease.tenantName,
            unitIdentifier: lease.unitId ? `Unit ${lease.unitId}` : undefined,
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
  }, [leases, utilitySettings]);

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

  if (!leases || !utilitySettings) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Utility Responsibilities
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                {isComplete ? "Complete" : "Configured"}
              </Badge>
            )}
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isOverAllocated || saving}
                  title={isOverAllocated ? `Total allocation is ${totalAllocated}%, cannot exceed 100%` : !isComplete ? `Total allocation is ${totalAllocated}%` : ''}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Universal allocation notice */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Percent className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            These percentages apply to all utility types (Electric, Water, Gas, Sewer, Trash, Internet, Cable)
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
          {allocations.map((allocation) => (
            <div 
              key={allocation.leaseId}
              className="flex items-center justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{allocation.tenantName}</div>
                  {allocation.unitIdentifier && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {allocation.unitIdentifier}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
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
                        // Ensure valid number on blur
                        const value = e.target.value;
                        const numValue = parseInt(value, 10);
                        if (isNaN(numValue) || value === '') {
                          handleInputChange(allocation.leaseId, '0');
                        }
                      }}
                      className="w-20 text-right"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-semibold">
                    {allocation.percentage}%
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Owner Responsibility */}
          {ownerPercentage > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Home className="w-4 h-4 text-blue-600" />
                </div>
                <div className="font-medium text-blue-700 dark:text-blue-300">
                  Owner Responsibility
                </div>
              </div>
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {ownerPercentage}%
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {isEditing && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEqualSplit}
            >
              Equal Split
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAllocations(prev => 
                  prev.map(a => ({ ...a, percentage: 0 }))
                );
                // Also clear input values
                const clearedInputs: Record<string, string> = {};
                allocations.forEach(allocation => {
                  clearedInputs[allocation.leaseId] = '0';
                });
                setInputValues(clearedInputs);
              }}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Allocation Summary
            </h4>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{totalAllocated}%</div>
              <div className="text-xs text-muted-foreground">to tenants</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="font-semibold text-lg">{activeLeases.length}</div>
              <div className="text-muted-foreground">Active Tenants</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="font-semibold text-lg">{UTILITY_TYPES.length}</div>
              <div className="text-muted-foreground">Utilities</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-black/20 rounded">
              <div className="font-semibold text-lg text-blue-600">{ownerPercentage}%</div>
              <div className="text-muted-foreground">Owner Share</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}