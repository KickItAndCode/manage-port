"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";

interface UtilityAnalyticsProps {
  userId: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function UtilityAnalytics({ userId }: UtilityAnalyticsProps) {
  const [timeframe, setTimeframe] = useState("6"); // months

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

    // Property comparison
    const propertyTotals: Record<string, number> = {};
    recentBills.forEach(bill => {
      const property = properties.find(p => p._id === bill.propertyId);
      const propertyName = property?.name || "Unknown Property";
      propertyTotals[propertyName] = (propertyTotals[propertyName] || 0) + bill.totalAmount;
    });

    const propertyComparison = Object.entries(propertyTotals)
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
      propertyComparison,
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

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading analytics data...
          </div>
        </CardContent>
      </Card>
    );
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
              <BarChart3 className="w-8 h-8 text-purple-600" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Cost Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                    tickFormatter={(value) => value.slice(5)} // Show MM only
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Total Cost']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Utility Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Cost by Utility Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  >
                    {analyticsData.utilityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Property Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Cost by Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.propertyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => [`$${value}`, 'Total Cost']} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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