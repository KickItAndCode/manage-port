"use client";
import { useState, memo } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Zap,
  Droplets,
  Flame,
  Calendar,
  PieChart as PieChartIcon,
} from "lucide-react";
import { InteractiveChart } from "./charts/InteractiveChart";
import { createEnhancedTooltip } from "./charts/AdvancedTooltip";
import { formatCurrency, calculateChange } from "@/utils/chartUtils";
import { MonthlyTrendsChart } from "./charts/MonthlyTrendsChart";
import { SeasonalInsights } from "./charts/SeasonalInsights";

interface UtilityAnalyticsProps {
  userId: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export const UtilityAnalytics = memo(function UtilityAnalytics({
  userId,
}: UtilityAnalyticsProps) {
  const [timeframe, setTimeframe] = useState(6); // months as number
  const router = useRouter();

  // Get enhanced analytics data from backend
  const analyticsData = useQuery(
    api.utilityAnalytics.getEnhancedUtilityAnalytics,
    {
      userId,
      timeframeMonths: timeframe,
    }
  );

  // Get utility bills for backward compatibility
  const utilityBills = useQuery(api.utilityBills.getUtilityBills, {
    userId,
  });

  // Get properties for context
  const properties = useQuery(api.properties.getProperties, {
    userId,
  });

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case "Electric":
        return Zap;
      case "Water":
        return Droplets;
      case "Gas":
        return Flame;
      default:
        return DollarSign;
    }
  };

  // Enhanced monthly trends data with anomaly detection
  const enhancedMonthlyTrends =
    analyticsData?.monthlyTrends.map((month, idx) => {
      const insights = analyticsData.insights;
      const anomaly = insights.anomalies.find((a) => a.month === month.month);

      return {
        ...month,
        anomaly: anomaly?.isAnomaly || false,
        prediction: insights.predictions[month.month],
        savingsOpportunity:
          anomaly?.isAnomaly && month.total > insights.averageMonthly
            ? month.total - insights.averageMonthly
            : undefined,
      };
    }) || [];

  // Chart drill-down handlers with pre-selected filters
  const handleUtilityTrendDrillDown = (data?: any) => {
    const month = data?.month || data?.activeLabel;
    const params = new URLSearchParams();
    if (month) {
      params.set("month", month);
    }
    const url = `/utility-bills${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  const handleUtilityTypeDrillDown = (data?: any) => {
    const utilityType = data?.name || data?.activeLabel;
    const params = new URLSearchParams();
    if (utilityType) {
      params.set("utilityType", utilityType);
    }
    const url = `/utility-bills${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  // Enhanced tooltip configurations
  const utilityTrendTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => "Monthly Utility Cost",
    formatValue: (value) => {
      if (typeof value === "number") {
        return formatCurrency(value);
      }
      return value?.toString() || "N/A";
    },
  });

  const utilityTypeTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => `${label || "Utility"} Cost`,
    formatValue: (value) => {
      if (typeof value === "number") {
        return formatCurrency(value);
      }
      return value?.toString() || "N/A";
    },
  });

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Summary Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Utility Type Breakdown skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Property Comparison skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Top Utility Types skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!analyticsData) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Utility Analytics</h2>
          <p className="text-muted-foreground">Cost trends and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="timeframe">Timeframe:</Label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(parseInt(e.target.value))}
            className="h-10 px-3 rounded-md border bg-background"
          >
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
            <option value="24">Last 2 years</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">
                  ${analyticsData?.insights.totalSpent.toFixed(0) || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Monthly</p>
                <p className="text-2xl font-bold">
                  ${analyticsData?.insights.averageMonthly.toFixed(0) || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consistency</p>
                <p className="text-2xl font-bold">
                  {analyticsData?.insights.consistencyScore.toFixed(0) || 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies</p>
                <p className="text-2xl font-bold">
                  {analyticsData?.insights.anomalies.length || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Monthly Trends */}
        <div className="lg:col-span-2">
          <MonthlyTrendsChart
            data={enhancedMonthlyTrends}
            onDrillDown={handleUtilityTrendDrillDown}
            height={400}
          />
        </div>

        {/* Utility Type Breakdown */}
        <InteractiveChart
          title="Cost by Utility Type"
          icon={<PieChartIcon className="w-5 h-5" />}
          onDrillDown={handleUtilityTypeDrillDown}
          height={300}
          showNavigationHint={true}
          drillDownPath="/utility-bills"
          onNavigate={(path) => router.push(path)}
        >
          {(analyticsData?.utilityBreakdown || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <PieChartIcon className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                No utility type data available.
                <br />
                Add utility bills to see breakdown.
              </p>
            </div>
          ) : (
            <PieChart>
              <Pie
                data={analyticsData?.utilityBreakdown || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => handleUtilityTypeDrillDown(data)}
              >
                {(analyticsData?.utilityBreakdown || []).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={utilityTypeTooltipConfig} />
            </PieChart>
          )}
        </InteractiveChart>

        {/* Top Utility Types */}
        <Card>
          <CardHeader>
            <CardTitle>Top Utility Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analyticsData?.utilityBreakdown || []).length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <PieChartIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No utility costs to display yet.
                  </p>
                </div>
              ) : (
                (analyticsData?.utilityBreakdown || [])
                  .slice(0, 5)
                  .map((utility, index) => {
                    const Icon = getUtilityIcon(utility.name);
                    const percentage = analyticsData?.insights.totalSpent
                      ? (
                          (utility.value / analyticsData.insights.totalSpent) *
                          100
                        ).toFixed(1)
                      : "0";

                    return (
                      <div
                        key={utility.name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{utility.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {percentage}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${utility.value.toFixed(0)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Property Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analyticsData?.propertyComparison || []).length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No property cost data available yet.
                  </p>
                </div>
              ) : (
                (analyticsData?.propertyComparison || []).map(
                  (property, index) => (
                    <div
                      key={property.propertyId}
                      className="flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{property.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.billCount} bills • Avg $
                          {property.average.toFixed(0)}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold">
                          ${property.total.toFixed(0)}
                        </p>
                        <Badge
                          variant={index === 0 ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Insights */}
      {analyticsData?.insights.seasonalPattern && (
        <SeasonalInsights
          pattern={analyticsData.insights.seasonalPattern}
          className="mt-6"
        />
      )}
    </div>
  );
});
