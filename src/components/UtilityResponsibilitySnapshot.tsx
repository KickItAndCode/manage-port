"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, 
  Droplets, 
  Flame, 
  Wifi, 
  Trash, 
  Home,
  AlertTriangle,
  CheckCircle,
  Percent,
  User,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UtilityResponsibilitySnapshotProps {
  propertyId?: Id<"properties">;
  leaseId?: Id<"leases">;
  userId: string;
  /** Show edit button */
  showEdit?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

interface UtilityBreakdown {
  utilityType: string;
  totalAssigned: number;
  assignments: Array<{
    leaseId: Id<"leases">;
    tenantName: string;
    unitIdentifier?: string;
    percentage: number;
  }>;
  ownerPercentage: number;
  isComplete: boolean;
  isOverAllocated: boolean;
}

const UTILITY_TYPES = [
  { type: "Electric", icon: Zap, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/20" },
  { type: "Water", icon: Droplets, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/20" },
  { type: "Gas", icon: Flame, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/20" },
  { type: "Sewer", icon: Droplets, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/20" },
  { type: "Trash", icon: Trash, color: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/20" },
  { type: "Internet", icon: Wifi, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/20" },
  { type: "Cable", icon: Wifi, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/20" },
] as const;

/**
 * Utility Responsibility Snapshot
 * 
 * Displays utility responsibility splits with pill-based percentages,
 * validation chips, and owner share highlighting. Designed for embedding
 * in property and lease detail views.
 */
export function UtilityResponsibilitySnapshot({ 
  propertyId,
  leaseId,
  userId,
  showEdit = false,
  compact = false,
}: UtilityResponsibilitySnapshotProps) {
  const router = useRouter();

  // Get leases - either by property or specific lease
  const leases = useQuery(
    propertyId 
      ? api.leases.getLeasesByProperty
      : leaseId
      ? api.leases.getLeases
      : null,
    propertyId 
      ? { propertyId, userId }
      : leaseId
      ? { userId, propertyId: undefined }
      : "skip"
  );

  // Filter to specific lease if provided
  const filteredLeases = leaseId && leases 
    ? leases.filter(l => l._id === leaseId)
    : leases;

  // Get utility settings
  const utilitySettings = useQuery(
    propertyId
      ? api.leaseUtilitySettings.getUtilitySettingsByProperty
      : leaseId
      ? api.leaseUtilitySettings.getLeaseUtilities
      : null,
    propertyId
      ? { propertyId, userId }
      : leaseId
      ? { leaseId, userId }
      : "skip"
  );

  // Get units for property to resolve unit identifiers
  const units = useQuery(
    propertyId && api.units.getUnitsByProperty,
    propertyId ? { propertyId, userId } : "skip"
  );

  const getUtilityIcon = (type: string) => {
    const utility = UTILITY_TYPES.find(u => u.type === type);
    return utility ? utility.icon : Home;
  };

  const getUtilityColor = (type: string) => {
    const utility = UTILITY_TYPES.find(u => u.type === type);
    return utility ? utility.color : "text-gray-600";
  };

  const getUtilityBgColor = (type: string) => {
    const utility = UTILITY_TYPES.find(u => u.type === type);
    return utility ? utility.bgColor : "bg-gray-50 dark:bg-gray-950/20";
  };

  const calculateUtilityBreakdowns = (): UtilityBreakdown[] => {
    if (!filteredLeases || !utilitySettings || (propertyId && !units)) return [];

    const activeLeases = filteredLeases.filter(l => l.status === "active");
    if (activeLeases.length === 0) return [];

    const breakdowns: UtilityBreakdown[] = [];

    // Get all utility types that have been configured
    const configuredUtilities = new Set(utilitySettings.map(s => s.utilityType));
    
    // Add common utilities even if not configured
    UTILITY_TYPES.forEach(util => configuredUtilities.add(util.type));

    configuredUtilities.forEach(utilityType => {
      const assignments = activeLeases
        .map(lease => {
          const setting = utilitySettings.find(
            s => s.leaseId === lease._id && s.utilityType === utilityType
          );
          
          if (!setting || setting.responsibilityPercentage === 0) return null;

          // Get unit identifier from units data
          let unitIdentifier: string | undefined;
          if (lease.unitId && units) {
            const unit = units.find(u => u._id === lease.unitId);
            if (unit) {
              unitIdentifier = unit.displayName || unit.unitIdentifier;
            }
          }
          
          return {
            leaseId: lease._id,
            tenantName: lease.tenantName,
            unitIdentifier,
            percentage: setting.responsibilityPercentage,
          };
        })
        .filter(Boolean) as UtilityBreakdown['assignments'];

      const totalAssigned = assignments.reduce((sum, a) => sum + a.percentage, 0);
      const ownerPercentage = Math.max(0, 100 - totalAssigned);
      const isComplete = totalAssigned <= 100 && totalAssigned > 0;
      const isOverAllocated = totalAssigned > 100;

      // Only show utilities that have assignments or are commonly used
      if (assignments.length > 0 || ['Electric', 'Water', 'Gas'].includes(utilityType)) {
        breakdowns.push({
          utilityType,
          totalAssigned,
          assignments,
          ownerPercentage,
          isComplete,
          isOverAllocated,
        });
      }
    });

    return breakdowns.sort((a, b) => a.utilityType.localeCompare(b.utilityType));
  };

  const breakdowns = calculateUtilityBreakdowns();

  if (breakdowns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Utility Responsibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">
              {propertyId 
                ? "No active leases with utility responsibilities configured."
                : "No utility responsibilities configured for this lease."}
            </p>
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  if (propertyId) {
                    router.push(`/properties/${propertyId}?tab=utilities`);
                  } else if (leaseId) {
                    router.push(`/leases?leaseId=${leaseId}&edit=utilities`);
                  }
                }}
              >
                Configure Utilities
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
            <Percent className="h-5 w-5" />
            Utility Responsibility
          </CardTitle>
          {showEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (propertyId) {
                  router.push(`/properties/${propertyId}?tab=utilities`);
                } else if (leaseId) {
                  router.push(`/leases?leaseId=${leaseId}&edit=utilities`);
                }
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact && "space-y-3")}>
        {breakdowns.map((breakdown) => {
          const Icon = getUtilityIcon(breakdown.utilityType);
          const utilityColor = getUtilityColor(breakdown.utilityType);
          const utilityBgColor = getUtilityBgColor(breakdown.utilityType);

          return (
            <div
              key={breakdown.utilityType}
              className={cn(
                "rounded-lg border p-3 sm:p-4 transition-colors",
                utilityBgColor,
                breakdown.isOverAllocated && "border-destructive/50",
                breakdown.isComplete && !breakdown.isOverAllocated && "border-success/50"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", utilityColor)} />
                  <span className="font-medium text-sm">{breakdown.utilityType}</span>
                </div>
                
                {/* Validation Chip */}
                {breakdown.isOverAllocated ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Over-allocated
                  </Badge>
                ) : breakdown.isComplete ? (
                  <Badge variant="default" className="text-xs bg-success text-success-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : breakdown.totalAssigned > 0 ? (
                  <Badge variant="outline" className="text-xs">
                    Partial
                  </Badge>
                ) : null}
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-2 mb-2">
                {breakdown.assignments.map((assignment) => (
                  <div
                    key={assignment.leaseId}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      "bg-background border border-border",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-foreground">
                      {assignment.tenantName}
                      {assignment.unitIdentifier && (
                        <span className="text-muted-foreground ml-1">
                          ({assignment.unitIdentifier})
                        </span>
                      )}
                    </span>
                    <span className={cn("font-semibold", utilityColor)}>
                      {assignment.percentage}%
                    </span>
                  </div>
                ))}
                
                {/* Owner Share - Highlighted */}
                {breakdown.ownerPercentage > 0 && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      "bg-primary/10 border-2 border-primary/30",
                      "hover:bg-primary/15 transition-colors"
                    )}
                  >
                    <Building2 className="h-3 w-3 text-primary" />
                    <span className="text-foreground font-semibold">Owner</span>
                    <span className="text-primary font-bold">
                      {breakdown.ownerPercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total: {breakdown.totalAssigned}%</span>
                  <span>Owner: {breakdown.ownerPercentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      breakdown.isOverAllocated
                        ? "bg-destructive"
                        : breakdown.isComplete
                        ? "bg-success"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, breakdown.totalAssigned)}%` }}
                  />
                </div>
              </div>

              {/* Warning for over-allocation */}
              {breakdown.isOverAllocated && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Total allocation exceeds 100%. Please adjust percentages.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

