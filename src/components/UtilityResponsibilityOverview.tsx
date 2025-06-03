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

  const calculateUtilityBreakdowns = (): UtilityBreakdown[] => {
    if (!leases || !utilitySettings) return [];

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
          
          return setting ? {
            leaseId: lease._id,
            tenantName: lease.tenantName,
            unitIdentifier: lease.unitId ? `Unit ${lease.unitId}` : undefined,
            percentage: setting.responsibilityPercentage,
          } : null;
        })
        .filter(Boolean) as UtilityBreakdown['assignments'];

      const totalAssigned = assignments.reduce((sum, a) => sum + a.percentage, 0);
      const ownerPercentage = Math.max(0, 100 - totalAssigned);
      const isComplete = totalAssigned === 100;

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

  if (!leases || !utilitySettings) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Utility Responsibilities
          </CardTitle>
          {incompleteUtilities.length > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              {incompleteUtilities.length} Incomplete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Alert */}
        {incompleteUtilities.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some utilities don&apos;t have complete responsibility assignments. 
              Make sure all percentages add up to 100% for each utility.
            </AlertDescription>
          </Alert>
        )}

        {/* Utility Breakdowns */}
        <div className="space-y-4">
          {breakdowns.map((breakdown) => {
            const Icon = getUtilityIcon(breakdown.utilityType);
            const iconColor = getUtilityColor(breakdown.utilityType);

            return (
              <div
                key={breakdown.utilityType}
                className={`border rounded-lg p-4 ${
                  !breakdown.isComplete ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">{breakdown.utilityType}</h3>
                      <p className="text-sm text-muted-foreground">
                        {breakdown.assignments.length} tenant{breakdown.assignments.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {breakdown.isComplete ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {breakdown.totalAssigned}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <Progress 
                    value={breakdown.totalAssigned} 
                    className={`h-2 ${
                      breakdown.totalAssigned > 100 ? 'bg-red-100' : 
                      breakdown.totalAssigned < 100 ? 'bg-orange-100' : 'bg-green-100'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className={
                      breakdown.totalAssigned > 100 ? 'text-red-600' :
                      breakdown.totalAssigned < 100 ? 'text-orange-600' : 'text-green-600'
                    }>
                      {breakdown.totalAssigned}% assigned
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Tenant Assignments */}
                <div className="space-y-2">
                  {breakdown.assignments.map((assignment) => (
                    <div 
                      key={assignment.leaseId}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{assignment.tenantName}</span>
                        {assignment.unitIdentifier && (
                          <Badge variant="secondary" className="text-xs">
                            {assignment.unitIdentifier}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        {assignment.percentage}%
                      </div>
                    </div>
                  ))}

                  {/* Owner Responsibility */}
                  {breakdown.ownerPercentage > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-700">Owner Responsibility</span>
                      </div>
                      <div className="text-sm font-medium text-blue-700">
                        {breakdown.ownerPercentage}%
                      </div>
                    </div>
                  )}

                  {/* Unassigned Warning */}
                  {breakdown.totalAssigned < 100 && breakdown.ownerPercentage === 0 && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-700">Unassigned</span>
                      </div>
                      <div className="text-sm font-medium text-orange-700">
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
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active Tenants:</span>
              <span className="ml-2 font-medium">{activeLeases.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Utilities Configured:</span>
              <span className="ml-2 font-medium">{breakdowns.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Complete Assignments:</span>
              <span className="ml-2 font-medium">{breakdowns.length - incompleteUtilities.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Needs Attention:</span>
              <span className="ml-2 font-medium text-orange-600">{incompleteUtilities.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}