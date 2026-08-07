"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaymentStatus } from "@/utils/utilityBillHelpers";
import { portfolioValue } from "@/../convex/lib/investment";
import { monthlyNetIncome } from "@/../convex/lib/finance";
import { useRouter } from "next/navigation";
import { useMemo, memo, useCallback } from "react";
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
  /** Set on cards a test needs to read; omitted elsewhere. */
  testId?: string;
}

const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor,
  bgColor,
  onClick,
  compact = false,
  testId
}: KPICardProps) {
  const formattedValue = useMemo(
    () =>
      typeof value === "number"
        ? value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })
        : value,
    [value]
  );

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
            <p
              className={cn(
                "text-muted-foreground mb-1",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {title}
            </p>
            <p
              className={cn(
                "font-bold text-foreground mb-1",
                compact ? "text-lg" : "text-2xl"
              )}
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {formattedValue}
            </p>
            {subtitle && (
              <p
                className={cn(
                  "text-muted-foreground",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-2",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight
                    className={cn(
                      "text-success",
                      compact ? "h-3 w-3" : "h-4 w-4"
                    )}
                  />
                ) : (
                  <ArrowDownRight
                    className={cn(
                      "text-destructive",
                      compact ? "h-3 w-3" : "h-4 w-4"
                    )}
                  />
                )}
                <span
                  className={cn(
                    trend.isPositive ? "text-success" : "text-destructive",
                    "font-medium"
                  )}
                >
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground ml-1">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn("rounded-lg p-2 sm:p-3 flex-shrink-0", bgColor)}>
            <Icon className={cn(iconColor, compact ? "h-5 w-5" : "h-6 w-6")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Dashboard KPIs Component
 *
 * Displays key performance indicators: occupancy, rent collected,
 * utility spend, and net income with trends and quick navigation.
 */
export const DashboardKPIs = memo(function DashboardKPIs({
  
  compact = false,
  filters
}: DashboardKPIsProps) {
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const metrics = useQuery(
    api.dashboard.getDashboardMetrics,
    isAuthenticated ? {
          propertyId: filters?.propertyId,
          dateRange: filters?.dateRange,
          status: filters?.status } : "skip"
  );

  const utilityInsights = useQuery(
    api.utilityInsights.getUtilityInsights,
    isAuthenticated ? {} : "skip"
  );

  /**
   * Unpaid bills, so the dashboard can say what is actually late.
   *
   * The landing page reported occupancy, rent and utility spend but never that
   * money was overdue — the one thing on it that needs acting on today. Only
   * unpaid bills are fetched; a paid bill can never be overdue.
   */
  const unpaidBills = useQuery(
    api.utilityBills.getUtilityBills,
    isAuthenticated
      ? { propertyId: filters?.propertyId, landlordPaid: false }
      : "skip"
  );

  const overdue = useMemo(() => {
    const bills = (unpaidBills ?? []).filter(
      (bill) => getPaymentStatus(bill).status === "overdue"
    );
    return {
      count: bills.length,
      amount: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    };
  }, [unpaidBills]);

  // Get properties to show property name when filter is active
  const propertiesResult = useQuery(
    api.properties.getProperties,
    isAuthenticated ? { limit: 1000 } : "skip" // Get all properties for KPIs
  );
  const properties =
    propertiesResult && "properties" in propertiesResult
      ? propertiesResult.properties
      : [];

  /**
   * What the portfolio is worth, and how much of it could be valued.
   *
   * The count travels with the total so the card can say "across 2 of 3" —
   * presenting a partial sum as the whole portfolio would understate it
   * silently, which is worse than admitting the gap.
   */
  const portfolio = useMemo(() => portfolioValue(properties), [properties]);

  // Get utility bills for property breakdown

  // Get property name when property filter is active
  const selectedProperty = useMemo(() => {
    if (!filters?.propertyId || !properties) return null;
    return properties.find((p) => p._id === filters.propertyId);
  }, [filters?.propertyId, properties]);

  // Calculate net income (memoized) - safe with optional chaining
  const netIncome = useMemo(
    () =>
      metrics
        ? monthlyNetIncome({
            monthlyRent: metrics.totalMonthlyRent,
            monthlyUtilities: metrics.totalUtilityCost,
            monthlyMortgage: metrics.totalMonthlyMortgage,
            monthlyCapEx: metrics.totalMonthlyCapEx,
          })
        : 0,
    [
      metrics?.totalMonthlyRent,
      metrics?.totalUtilityCost,
      metrics?.totalMonthlyMortgage,
      metrics?.totalMonthlyCapEx,
    ]
  );

  // Calculate occupancy percentage (cap at 100%) - memoized - safe with optional chaining
  const occupancyPercentage = useMemo(
    () => (metrics ? Math.min(Math.round(metrics.occupancyRate), 100) : 0),
    [metrics?.occupancyRate]
  );

  // Calculate average utility spend per property - already memoized - safe with optional chaining
  const avgUtilityPerProperty = useMemo(() => {
    if (!metrics || metrics.totalProperties === 0) return 0;
    return metrics.totalUtilityCost / metrics.totalProperties;
  }, [metrics?.totalUtilityCost, metrics?.totalProperties]);

  // Calculate trend for occupancy (simplified - would need historical data) - memoized - safe with optional chaining
  const occupancyTrend = useMemo(
    () =>
      metrics && metrics.occupancyRate >= 80
        ? { value: 5, label: "vs target", isPositive: true }
        : metrics && metrics.occupancyRate >= 50
          ? { value: 10, label: "vs target", isPositive: false }
          : undefined,
    [metrics?.occupancyRate]
  );

  // Memoize navigation handlers - all hooks must be called before early return
  const handleOccupancyClick = useCallback(() => {
    if (selectedProperty) {
      router.push(`/leases?propertyId=${selectedProperty._id}`);
    } else {
      router.push("/leases");
    }
  }, [selectedProperty, router]);

  const handleRentClick = useCallback(() => {
    if (selectedProperty) {
      router.push(`/leases?propertyId=${selectedProperty._id}`);
    } else {
      router.push("/leases");
    }
  }, [selectedProperty, router]);

  // Lands on the bills list already filtered to what is late, so the card
  // answers "what?" and the click answers "which?".
  const handleOverdueClick = useCallback(() => {
    const property = selectedProperty ? `propertyId=${selectedProperty._id}&` : "";
    router.push(`/utility-bills?${property}status=overdue`);
  }, [router, selectedProperty]);

  const handleUtilityClick = useCallback(() => {
    if (selectedProperty) {
      router.push(`/utility-bills?propertyId=${selectedProperty._id}`);
    } else {
      router.push("/utility-bills");
    }
  }, [selectedProperty, router]);

  const handleNetIncomeClick = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Early return after all hooks are called
  if (!metrics) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6",
          compact && "gap-2"
        )}
      >
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

  return (
    <div
      className={cn(
        // A fixed column count that lets cards wrap, rather than one column per
        // card. Between four and six render depending on what the account has,
        // and squeezing six across a 1280px screen clipped "$812,000" to
        // "$812,00" and ran titles into their icons.
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6",
        compact && "gap-2"
      )}
    >
      {/*
        Shown only when something is actually late, and shown first. This is an
        alert rather than a metric — a permanent "Overdue: 0" is noise, and
        burying a real one behind occupancy and rent is worse.
      */}
      {overdue.count > 0 && (
        <KPICard
          title="Overdue Bills"
          // A string: KPICard formats every number as currency, which turned a
          // count of 33 bills into "$33".
          value={String(overdue.count)}
          subtitle={`${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(overdue.amount)} past due`}
          icon={AlertCircle}
          iconColor="text-red-600 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-950/20"
          onClick={handleOverdueClick}
          compact={compact}
          testId="kpi-overdue"
        />
      )}

      {/*
        Shown only once at least one property has a price or a value on file.
        An owner who has not entered any gets no card rather than "$0", which
        would read as a portfolio worth nothing.
      */}
      {portfolio.valued > 0 && (
        <KPICard
          title="Portfolio Value"
          value={portfolio.total}
          subtitle={
            portfolio.unvalued > 0
              ? `across ${portfolio.valued} of ${portfolio.valued + portfolio.unvalued} properties`
              : `across ${portfolio.valued} ${portfolio.valued === 1 ? "property" : "properties"}`
          }
          icon={Building2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-950/20"
          onClick={() => router.push("/properties")}
          compact={compact}
          testId="kpi-portfolio-value"
        />
      )}

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
        onClick={handleOccupancyClick}
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
        onClick={handleRentClick}
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
                isPositive: false
              }
            : undefined
        }
        icon={Receipt}
        iconColor="text-orange-600 dark:text-orange-400"
        bgColor="bg-orange-50 dark:bg-orange-950/20"
        onClick={handleUtilityClick}
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
        onClick={handleNetIncomeClick}
        compact={compact}
        testId="kpi-net-income"
      />
    </div>
  );
});
