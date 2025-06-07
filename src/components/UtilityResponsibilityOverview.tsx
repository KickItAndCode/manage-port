"use client";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Droplets, 
  Flame, 
  Wifi, 
  Trash, 
  Home,
  Users,
  AlertTriangle,
  CheckCircle,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UtilityResponsibilityOverviewProps {
  propertyId: Id<"properties">;
  userId: string;
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
}

const UTILITY_TYPES = [
  { type: "Electric", icon: Zap, color: "text-yellow-600" },
  { type: "Water", icon: Droplets, color: "text-blue-600" },
  { type: "Gas", icon: Flame, color: "text-orange-600" },
  { type: "Sewer", icon: Droplets, color: "text-green-600" },
  { type: "Trash", icon: Trash, color: "text-gray-600" },
  { type: "Internet", icon: Wifi, color: "text-purple-600" },
  { type: "Cable", icon: Wifi, color: "text-purple-600" },
] as const;

export function UtilityResponsibilityOverview({ 
  propertyId, 
  userId 
}: UtilityResponsibilityOverviewProps) {
  // Get active leases for the property
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get utility settings for all leases
  const utilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, {
    propertyId,
    userId,
  });

  const getUtilityIcon = (type: string) => {
    const utility = UTILITY_TYPES.find(u => u.type === type);
    return utility ? utility.icon : Home;
  };

  const getUtilityColor = (type: string) => {
    const utility = UTILITY_TYPES.find(u => u.type === type);
    return utility ? utility.color : "text-gray-600";
  };

  // Get units for property to resolve unit identifiers
  const units = useQuery(api.units.getUnitsByProperty, {
    propertyId,
    userId,
  });

  const calculateUtilityBreakdowns = (): UtilityBreakdown[] => {
    if (!leases || !utilitySettings || !units) return [];

    const activeLeases = leases.filter(l => l.status === "active");
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
          
          if (!setting) return null;

          // Get unit identifier from units data
          let unitIdentifier: string | undefined;
          if (lease.unitId) {
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
      
      // Updated logic: Allow partial tenant responsibility
      // 50% tenant + 50% owner = 100% is valid
      // Only mark as incomplete if totalAssigned > 100 (over-assigned)
      const isComplete = totalAssigned <= 100;

      breakdowns.push({
        utilityType,
        totalAssigned,
        assignments,
        ownerPercentage,
        isComplete,
      });
    });

    return breakdowns.sort((a, b) => a.utilityType.localeCompare(b.utilityType));
  };

  const breakdowns = calculateUtilityBreakdowns();
  const activeLeases = leases?.filter(l => l.status === "active") || [];
  const incompleteUtilities = breakdowns.filter(b => !b.isComplete);

  if (!leases || !utilitySettings || !units) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
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
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
            Utility Responsibilities
          </CardTitle>
          {incompleteUtilities.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs self-start sm:self-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {incompleteUtilities.length} Incomplete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {/* Summary Alert */}
        {incompleteUtilities.length > 0 && (
          <Alert variant="destructive" className="mx-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Over-assigned responsibilities detected. Applies to all utility types.
            </AlertDescription>
          </Alert>
        )}

        {/* Utility Breakdowns */}
        <div className="space-y-3">
          {breakdowns.map((breakdown) => {
            const Icon = getUtilityIcon(breakdown.utilityType);
            const iconColor = getUtilityColor(breakdown.utilityType);

            return (
              <div
                key={breakdown.utilityType}
                className={`w-full border rounded-lg p-3 overflow-hidden ${
                  !breakdown.isComplete ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex flex-col gap-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg bg-muted ${iconColor} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{breakdown.utilityType}</h3>
                        <p className="text-xs text-muted-foreground">
                          {breakdown.assignments.length} tenant{breakdown.assignments.length !== 1 ? 's' : ''} assigned
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {breakdown.isComplete ? (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {breakdown.totalAssigned}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3 w-full">
                  <Progress 
                    value={breakdown.totalAssigned} 
                    className={`h-2 w-full ${
                      breakdown.totalAssigned > 100 ? 'bg-red-100 dark:bg-red-950/20' : 
                      breakdown.totalAssigned < 100 ? 'bg-orange-100 dark:bg-orange-950/20' : 'bg-green-100 dark:bg-green-950/20'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className={cn(
                      "font-medium",
                      breakdown.totalAssigned > 100 ? 'text-red-600 dark:text-red-400' :
                      breakdown.totalAssigned < 100 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                    )}>
                      {breakdown.totalAssigned}% assigned
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Tenant Assignments */}
                <div className="space-y-2 w-full">
                  {breakdown.assignments.map((assignment) => (
                    <div 
                      key={assignment.leaseId}
                      className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded w-full overflow-hidden"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{assignment.tenantName}</span>
                        {assignment.unitIdentifier && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {assignment.unitIdentifier}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium flex-shrink-0">
                        {assignment.percentage}%
                      </div>
                    </div>
                  ))}

                  {/* Owner Responsibility */}
                  {breakdown.ownerPercentage > 0 && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 w-full overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Home className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-blue-700 dark:text-blue-300 text-sm truncate">Owner Responsibility</span>
                      </div>
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-shrink-0">
                        {breakdown.ownerPercentage}%
                      </div>
                    </div>
                  )}

                  {/* Unassigned Warning */}
                  {breakdown.totalAssigned < 100 && breakdown.ownerPercentage === 0 && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800 w-full overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="font-medium text-orange-700 dark:text-orange-300 text-sm truncate">Unassigned</span>
                      </div>
                      <div className="text-sm font-medium text-orange-700 dark:text-orange-300 flex-shrink-0">
                        {100 - breakdown.totalAssigned}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-3 w-full">
          <h4 className="font-medium mb-2 text-sm">Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Active Tenants</span>
              <span className="font-medium">{activeLeases.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Utilities Configured</span>
              <span className="font-medium">{breakdowns.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Complete Assignments</span>
              <span className="font-medium">{breakdowns.length - incompleteUtilities.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Needs Attention</span>
              <span className="font-medium text-orange-600 dark:text-orange-400">{incompleteUtilities.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}