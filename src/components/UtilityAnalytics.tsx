"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Droplets, 
  Flame,
  Calendar,
  PieChart as PieChartIcon
} from "lucide-react";
import { InteractiveChart } from "./charts/InteractiveChart";
import { createEnhancedTooltip } from "./charts/AdvancedTooltip";
import { formatCurrency, calculateChange } from "@/utils/chartUtils";

interface UtilityAnalyticsProps {
  userId: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function UtilityAnalytics({ userId }: UtilityAnalyticsProps) {
  const [timeframe, setTimeframe] = useState("6"); // months
  const router = useRouter();

  // Get utility bills
  const utilityBills = useQuery(api.utilityBills.getUtilityBills, {
    userId,
  });

  // Get properties for context
  const properties = useQuery(api.properties.getProperties, {
    userId,
  });

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case "Electric": return Zap;
      case "Water": return Droplets;
      case "Gas": return Flame;
      default: return DollarSign;
    }
  };

  const processAnalyticsData = () => {
    if (!utilityBills || !properties) return null;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(timeframe));
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);

    // Filter bills by timeframe
    const recentBills = utilityBills.filter(bill => bill.billMonth >= cutoffMonth);

    // Monthly trends
    const monthlyData: Record<string, { month: string; total: number; Electric: number; Water: number; Gas: number; Other: number }> = {};
    
    recentBills.forEach(bill => {
      if (!monthlyData[bill.billMonth]) {
        monthlyData[bill.billMonth] = {
          month: bill.billMonth,
          total: 0,
          Electric: 0,
          Water: 0,
          Gas: 0,
          Other: 0
        };
      }
      monthlyData[bill.billMonth].total += bill.totalAmount;
      
      if (bill.utilityType === "Electric") {
        monthlyData[bill.billMonth].Electric += bill.totalAmount;
      } else if (bill.utilityType === "Water") {
        monthlyData[bill.billMonth].Water += bill.totalAmount;
      } else if (bill.utilityType === "Gas") {
        monthlyData[bill.billMonth].Gas += bill.totalAmount;
      } else {
        monthlyData[bill.billMonth].Other += bill.totalAmount;
      }
    });

    const monthlyTrends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Utility type breakdown
    const utilityTotals: Record<string, number> = {};
    recentBills.forEach(bill => {
      utilityTotals[bill.utilityType] = (utilityTotals[bill.utilityType] || 0) + bill.totalAmount;
    });

    const utilityBreakdown = Object.entries(utilityTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);


    // Summary stats
    const totalCost = recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const averageMonthly = monthlyTrends.length > 0 ? totalCost / monthlyTrends.length : 0;
    const billCount = recentBills.length;
    const averageBill = billCount > 0 ? totalCost / billCount : 0;

    return {
      monthlyTrends,
      utilityBreakdown,
      summary: {
        totalCost,
        averageMonthly,
        billCount,
        averageBill,
        timeframeMonths: parseInt(timeframe)
      }
    };
  };

  const analyticsData = processAnalyticsData();

  // Chart drill-down handlers with pre-selected filters
  const handleUtilityTrendDrillDown = (data?: any) => {
    const month = data?.month || data?.activeLabel;
    const params = new URLSearchParams();
    if (month) {
      params.set('month', month);
    }
    const url = `/utility-bills${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleUtilityTypeDrillDown = (data?: any) => {
    const utilityType = data?.name || data?.activeLabel;
    const params = new URLSearchParams();
    if (utilityType) {
      params.set('utilityType', utilityType);
    }
    const url = `/utility-bills${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };


  // Enhanced tooltip configurations
  const utilityTrendTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => 'Monthly Utility Cost',
    formatValue: (value) => {
      if (typeof value === 'number') {
        return formatCurrency(value);
      }
      return value?.toString() || 'N/A';
    }
  });

  const utilityTypeTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => `${label || 'Utility'} Cost`,
    formatValue: (value) => {
      if (typeof value === 'number') {
        return formatCurrency(value);
      }
      return value?.toString() || 'N/A';
    }
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
            onChange={(e) => setTimeframe(e.target.value)}
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
                <p className="text-2xl font-bold">${analyticsData.summary.totalCost.toFixed(0)}</p>
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
                <p className="text-2xl font-bold">${analyticsData.summary.averageMonthly.toFixed(0)}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{analyticsData.summary.billCount}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Bill</p>
                <p className="text-2xl font-bold">${analyticsData.summary.averageBill.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <InteractiveChart
          title="Monthly Cost Trends"
          icon={<TrendingUp className="w-5 h-5" />}
          onDrillDown={handleUtilityTrendDrillDown}
          height={300}
          showNavigationHint={true}
          drillDownPath="/utility-bills"
          onNavigate={(path) => router.push(path)}
        >
          <LineChart data={analyticsData.monthlyTrends} onClick={(data) => handleUtilityTrendDrillDown(data)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              fontSize={12}
              tickFormatter={(value) => value.slice(5)} // Show MM only
            />
            <YAxis fontSize={12} />
            <Tooltip content={utilityTrendTooltipConfig} />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
            />
          </LineChart>
        </InteractiveChart>

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
          <PieChart>
            <Pie
              data={analyticsData.utilityBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => handleUtilityTypeDrillDown(data)}
            >
              {analyticsData.utilityBreakdown.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={utilityTypeTooltipConfig} />
          </PieChart>
        </InteractiveChart>


        {/* Top Utility Types */}
        <Card>
          <CardHeader>
            <CardTitle>Top Utility Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.utilityBreakdown.slice(0, 5).map((utility, index) => {
                const Icon = getUtilityIcon(utility.name);
                const percentage = ((utility.value / analyticsData.summary.totalCost) * 100).toFixed(1);
                
                return (
                  <div key={utility.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{utility.name}</p>
                        <p className="text-sm text-muted-foreground">{percentage}% of total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${utility.value.toFixed(0)}</p>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}