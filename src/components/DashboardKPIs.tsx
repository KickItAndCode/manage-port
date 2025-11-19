"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Receipt,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DashboardFilters as DashboardFiltersType } from "./DashboardFilters";

interface DashboardKPIsProps {
  userId: string;
  /** Show compact view */
  compact?: boolean;
  /** Optional filters to apply to metrics */
  filters?: DashboardFiltersType;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  onClick?: () => void;
  compact?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor,
  bgColor,
  onClick,
  compact = false,
}: KPICardProps) {
  const formattedValue = typeof value === "number" 
    ? value.toLocaleString("en-US", { 
        style: "currency", 
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : value;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
        onClick && "hover:border-primary",
        compact && "p-3"
      )}
      onClick={onClick}
    >
      <CardContent className={cn("p-4 sm:p-6", compact && "p-3")}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-muted-foreground mb-1",
              compact ? "text-xs" : "text-sm"
            )}>
              {title}
            </p>
            <p className={cn(
              "font-bold text-foreground mb-1",
              compact ? "text-lg" : "text-2xl"
            )}>
              {formattedValue}
            </p>
            {subtitle && (
              <p className={cn(
                "text-muted-foreground",
                compact ? "text-xs" : "text-sm"
              )}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2",
                compact ? "text-xs" : "text-sm"
              )}>
                {trend.isPositive ? (
                  <ArrowUpRight className={cn(
                    "text-success",
                    compact ? "h-3 w-3" : "h-4 w-4"
                  )} />
                ) : (
                  <ArrowDownRight className={cn(
                    "text-destructive",
                    compact ? "h-3 w-3" : "h-4 w-4"
                  )} />
                )}
                <span className={cn(
                  trend.isPositive ? "text-success" : "text-destructive",
                  "font-medium"
                )}>
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground ml-1">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "rounded-lg p-2 sm:p-3 flex-shrink-0",
            bgColor
          )}>
            <Icon className={cn(
              iconColor,
              compact ? "h-5 w-5" : "h-6 w-6"
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard KPIs Component
 * 
 * Displays key performance indicators: occupancy, rent collected,
 * utility spend, and net income with trends and quick navigation.
 */
export function DashboardKPIs({ userId, compact = false, filters }: DashboardKPIsProps) {
  const router = useRouter();

  const metrics = useQuery(
    api.dashboard.getDashboardMetrics,
    userId ? { 
      userId,
      propertyId: filters?.propertyId,
      dateRange: filters?.dateRange,
      status: filters?.status,
    } : "skip"
  );

  const utilityInsights = useQuery(
    api.utilityInsights.getUtilityInsights,
    userId ? { userId } : "skip"
  );

  // Get properties to show property name when filter is active
  const propertiesResult = useQuery(
    api.properties.getProperties,
    userId ? { userId, limit: 1000 } : "skip" // Get all properties for KPIs
  );
  const properties = propertiesResult?.properties || (Array.isArray(propertiesResult) ? propertiesResult : []);

  // Get utility bills for property breakdown
  const utilityBills = useQuery(
    api.utilityBills.getUtilityBills,
    userId ? { userId } : "skip"
  );

  // Get property name when property filter is active
  const selectedProperty = useMemo(() => {
    if (!filters?.propertyId || !properties) return null;
    return properties.find(p => p._id === filters.propertyId);
  }, [filters?.propertyId, properties]);

  if (!metrics) {
    return (
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6",
        compact && "gap-2"
      )}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={cn(compact && "p-3")}>
            <CardContent className={cn("p-4 sm:p-6", compact && "p-3")}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate net income
  const netIncome = metrics.totalMonthlyRent - 
    metrics.totalUtilityCost - 
    metrics.totalMonthlyMortgage - 
    metrics.totalMonthlyCapEx;

  // Calculate occupancy percentage (cap at 100%)
  const occupancyPercentage = Math.min(Math.round(metrics.occupancyRate), 100);

  // Calculate average utility spend per property
  const avgUtilityPerProperty = useMemo(() => {
    if (!metrics || metrics.totalProperties === 0) return 0;
    return metrics.totalUtilityCost / metrics.totalProperties;
  }, [metrics]);

  // Calculate trend for occupancy (simplified - would need historical data)
  const occupancyTrend = metrics.occupancyRate >= 80 
    ? { value: 5, label: "vs target", isPositive: true }
    : metrics.occupancyRate >= 50
    ? { value: 10, label: "vs target", isPositive: false }
    : undefined;

  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6",
      compact && "gap-2"
    )}>
      {/* Occupancy Rate */}
      <KPICard
        title="Occupancy Rate"
        value={`${occupancyPercentage}%`}
        subtitle={
          selectedProperty
            ? selectedProperty.name
            : metrics.totalUnits > 0
            ? `${metrics.activeLeases} active lease${metrics.activeLeases !== 1 ? "s" : ""} of ${metrics.totalUnits} unit${metrics.totalUnits !== 1 ? "s" : ""}`
            : `${metrics.activeLeases} active lease${metrics.activeLeases !== 1 ? "s" : ""} of ${metrics.totalProperties} propert${metrics.totalProperties !== 1 ? "ies" : "y"}`
        }
        trend={occupancyTrend}
        icon={Building2}
        iconColor="text-blue-600 dark:text-blue-400"
        bgColor="bg-blue-50 dark:bg-blue-950/20"
        onClick={() => {
          if (selectedProperty) {
            router.push(`/leases?propertyId=${selectedProperty._id}`);
          } else {
            router.push("/leases");
          }
        }}
        compact={compact}
      />

      {/* Monthly Rent Collected */}
      <KPICard
        title="Monthly Rent"
        value={metrics.totalMonthlyRent}
        subtitle={
          selectedProperty
            ? selectedProperty.name
            : `From ${metrics.activeLeases} active lease${metrics.activeLeases !== 1 ? "s" : ""}`
        }
        icon={DollarSign}
        iconColor="text-green-600 dark:text-green-400"
        bgColor="bg-green-50 dark:bg-green-950/20"
        onClick={() => {
          if (selectedProperty) {
            router.push(`/leases?propertyId=${selectedProperty._id}`);
          } else {
            router.push("/leases");
          }
        }}
        compact={compact}
      />

      {/* Utility Spend */}
      <KPICard
        title="Monthly Utilities"
        value={Math.round(metrics.totalUtilityCost)}
        subtitle={
          selectedProperty
            ? selectedProperty.name
            : metrics.totalProperties > 0
            ? `Avg $${Math.round(avgUtilityPerProperty)}/property`
            : "No properties"
        }
        trend={
          utilityInsights?.anomalyCount && utilityInsights.anomalyCount > 0
            ? {
                value: utilityInsights.highSeverityAnomalies,
                label: `${utilityInsights.anomalyCount} anomalies`,
                isPositive: false,
              }
            : undefined
        }
        icon={Receipt}
        iconColor="text-orange-600 dark:text-orange-400"
        bgColor="bg-orange-50 dark:bg-orange-950/20"
        onClick={() => {
          if (selectedProperty) {
            router.push(`/utility-bills?propertyId=${selectedProperty._id}`);
          } else {
            router.push("/utility-bills");
          }
        }}
        compact={compact}
      />

      {/* Net Income */}
      <KPICard
        title="Net Income"
        value={netIncome}
        subtitle="After utilities & expenses"
        icon={TrendingUp}
        iconColor={netIncome > 0 ? "text-success" : "text-destructive"}
        bgColor={netIncome > 0 ? "bg-success/10" : "bg-destructive/10"}
        onClick={() => router.push("/dashboard")}
        compact={compact}
      />
    </div>
  );
}

