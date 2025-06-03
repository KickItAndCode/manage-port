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

const COMMON_UTILITIES = [
  "Electric", "Water", "Gas", "Sewer", "Trash", "Internet", "Cable"
];

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

  const saveUtilitySettings = useMutation(api.leaseUtilitySettings.setUtilityResponsibilities);

  // Initialize allocations when data loads
  useEffect(() => {
    if (leases && utilitySettings) {
      const activeLeases = leases.filter(l => l.status === "active");
      
      if (activeLeases.length > 0) {
        const newAllocations = activeLeases.map(lease => {
          // Check if this lease has any utility settings (use Electric as reference)
          const existingSetting = utilitySettings.find(
            s => s.leaseId === lease._id && s.utilityType === "Electric"
          );

          const percentage = existingSetting?.responsibilityPercentage || 0;
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

    setAllocations(prev =>
      prev.map((allocation, index) => {
        const newPercentage = equalPercentage + (index === 0 ? remainder : 0);
        return {
          ...allocation,
          percentage: newPercentage,
        };
      })
    );

    // Update input values too
    const newInputValues: Record<string, string> = {};
    allocations.forEach((allocation, index) => {
      const newPercentage = equalPercentage + (index === 0 ? remainder : 0);
      newInputValues[allocation.leaseId] = newPercentage.toString();
    });
    setInputValues(newInputValues);
  };

  const handleSave = async () => {
    if (!isComplete) {
      alert("Percentages must add up to exactly 100%");
      return;
    }

    setSaving(true);
    try {
      // Save the same percentage for all utility types for each lease
      for (const allocation of allocations) {
        for (const utilityType of COMMON_UTILITIES) {
          await saveUtilitySettings({
            leaseId: allocation.leaseId,
            utilityType,
            responsibilityPercentage: allocation.percentage,
            userId,
          });
        }
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save utility settings:", error);
      alert("Failed to save utility settings");
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
            {!isComplete && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Incomplete
              </Badge>
            )}
            {isComplete && !isEditing && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
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
                  disabled={!isComplete || saving}
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
        <Alert className={isComplete ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : ""}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isComplete 
              ? "Universal allocation applies to all utilities (Electric, Water, Gas, Sewer, Trash, Internet, Cable)"
              : "Set universal allocation percentages that will apply to all utility types"
            }
          </AlertDescription>
        </Alert>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Allocated</span>
            <span className={
              isOverAllocated ? 'text-red-600' :
              !isComplete ? 'text-orange-600' : 'text-green-600'
            }>
              {totalAllocated}%
            </span>
          </div>
          <Progress 
            value={Math.min(totalAllocated, 100)} 
            className={`h-3 ${
              isOverAllocated ? '[&>div]:bg-red-500' :
              !isComplete ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'
            }`}
          />
          {isOverAllocated && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Total allocation exceeds 100%. Please adjust the percentages.
              </AlertDescription>
            </Alert>
          )}
        </div>

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
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active Tenants:</span>
              <span className="ml-2 font-medium">{activeLeases.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Utilities Covered:</span>
              <span className="ml-2 font-medium">{COMMON_UTILITIES.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Allocated:</span>
              <span className="ml-2 font-medium">{totalAllocated}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Owner Share:</span>
              <span className="ml-2 font-medium">{ownerPercentage}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}