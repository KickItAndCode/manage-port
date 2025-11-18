"use client";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, ReferenceLine
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Zap, Droplets, Flame,
  Calendar, AlertTriangle, Target, Lightbulb, ArrowUpRight,
  ArrowDownRight, Equal, Sparkles
} from "lucide-react";
import { InteractiveChart } from "../charts/InteractiveChart";
import { formatCurrency, calculateChange, calculateTrend } from "@/utils/chartUtils";

interface UtilityAnalyticsProps {
  userId: string;
}

interface InsightData {
  type: 'trend' | 'anomaly' | 'optimization' | 'forecast';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value?: number;
  change?: number;
  action?: string;
  icon: React.ReactNode;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function EnhancedUtilityAnalytics({ userId }: UtilityAnalyticsProps) {
  const [timeframe, setTimeframe] = useState("6");
  const [selectedMetric, setSelectedMetric] = useState<'total' | 'trend' | 'forecast'>('total');
  const router = useRouter();

  const utilityBills = useQuery(api.utilityBills.getUtilityBills, { userId });
  const properties = useQuery(api.properties.getProperties, { userId });

  const analyticsData = useMemo(() => {
    if (!utilityBills || !properties) return null;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(timeframe));
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);

    const recentBills = utilityBills.filter(bill => bill.billMonth >= cutoffMonth);
    
    // Enhanced monthly data with trend analysis
    const monthlyData: Record<string, {
      month: string;
      total: number;
      Electric: number;
      Water: number;
      Gas: number;
      Other: number;
      trend?: number;
      forecast?: number;
      isAnomaly?: boolean;
    }> = {};
    
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
      monthlyData[bill.billMonth][bill.utilityType as keyof typeof monthlyData[string]] += bill.totalAmount;
    });

    const monthlyTrends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trend lines and forecasts
    monthlyTrends.forEach((month, index) => {
      if (index >= 2) {
        const prevAvg = monthlyTrends.slice(Math.max(0, index - 2), index)
          .reduce((sum, m) => sum + m.total, 0) / 2;
        month.trend = prevAvg;
      }
      
      // Simple forecast (moving average + trend)
      if (index >= 3) {
        const recent = monthlyTrends.slice(index - 3, index);
        const avg = recent.reduce((sum, m) => sum + m.total, 0) / recent.length;
        const trend = (recent[recent.length - 1].total - recent[0].total) / recent.length;
        month.forecast = avg + trend;
      }

      // Anomaly detection (simple threshold based)
      if (index >= 1) {
        const prevMonth = monthlyTrends[index - 1];
        const change = Math.abs(month.total - prevMonth.total) / prevMonth.total;
        month.isAnomaly = change > 0.3; // 30% change threshold
      }
    });

    // Calculate insights
    const insights: InsightData[] = [];
    
    // Trend analysis
    if (monthlyTrends.length >= 2) {
      const recent = monthlyTrends[monthlyTrends.length - 1];
      const previous = monthlyTrends[monthlyTrends.length - 2];
      const monthChange = ((recent.total - previous.total) / previous.total) * 100;
      
      if (Math.abs(monthChange) > 15) {
        insights.push({
          type: 'trend',
          severity: Math.abs(monthChange) > 30 ? 'high' : 'medium',
          title: monthChange > 0 ? 'Costs Increasing' : 'Costs Decreasing',
          description: `Utility costs ${monthChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(monthChange).toFixed(1)}% from last month`,
          change: monthChange,
          action: monthChange > 0 ? 'Review recent usage patterns' : 'Great cost management!',
          icon: monthChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
        });
      }
    }

    // Anomaly detection
    const anomalies = monthlyTrends.filter(m => m.isAnomaly);
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        severity: 'high',
        title: 'Unusual Activity Detected',
        description: `${anomalies.length} month(s) show unusual cost patterns`,
        action: 'Check for maintenance issues or rate changes',
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }

    // Optimization suggestions
    const electricTotal = recentBills.filter(b => b.utilityType === 'Electric').reduce((sum, b) => sum + b.totalAmount, 0);
    const totalCost = recentBills.reduce((sum, b) => sum + b.totalAmount, 0);
    
    if (electricTotal / totalCost > 0.6) {
      insights.push({
        type: 'optimization',
        severity: 'medium',
        title: 'High Electric Costs',
        description: `Electric bills account for ${((electricTotal / totalCost) * 100).toFixed(0)}% of total utility costs`,
        action: 'Consider energy-efficient upgrades or rate comparisons',
        icon: <Lightbulb className="w-4 h-4" />
      });
    }

    // Forecasting
    if (monthlyTrends.length >= 3) {
      const recentAvg = monthlyTrends.slice(-3).reduce((sum, m) => sum + m.total, 0) / 3;
      const forecast = recentAvg;
      
      insights.push({
        type: 'forecast',
        severity: 'low',
        title: 'Next Month Forecast',
        description: `Expected utility costs: ${formatCurrency(forecast)}`,
        value: forecast,
        action: 'Based on recent 3-month average',
        icon: <Target className="w-4 h-4" />
      });
    }

    return {
      monthlyTrends,
      insights,
      summary: {
        totalCost: recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        averageMonthly: monthlyTrends.length > 0 ? recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0) / monthlyTrends.length : 0,
        billCount: recentBills.length,
        averageBill: recentBills.length > 0 ? recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0) / recentBills.length : 0,
        monthOverMonth: monthlyTrends.length >= 2 ? 
          ((monthlyTrends[monthlyTrends.length - 1].total - monthlyTrends[monthlyTrends.length - 2].total) / monthlyTrends[monthlyTrends.length - 2].total) * 100 : 0
      }
    };
  }, [utilityBills, properties, timeframe]);

  if (!analyticsData) {
    return <div>Loading enhanced analytics...</div>;
  }

  const getSeverityColor = (severity: InsightData['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 5) return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    if (change < -5) return <ArrowDownRight className="w-4 h-4 text-green-500" />;
    return <Equal className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with enhanced metrics */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Smart Utility Analytics
          </h2>
          <p className="text-muted-foreground">AI-powered insights and cost optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <select
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
      </motion.div>

      {/* Smart Insights Panel */}
      <AnimatePresence>
        {analyticsData.insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Smart Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Alert className="border-l-4 border-l-primary">
                    <div className="flex items-start gap-3">
                      {insight.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge variant={getSeverityColor(insight.severity)} className="text-xs">
                            {insight.severity}
                          </Badge>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {insight.description}
                        </AlertDescription>
                        {insight.action && (
                          <p className="text-xs text-muted-foreground italic">
                            💡 {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </Alert>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Summary Cards */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${analyticsData.summary.totalCost.toFixed(0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(analyticsData.summary.monthOverMonth)}
                  <span className="text-xs text-muted-foreground">
                    {analyticsData.summary.monthOverMonth > 0 ? '+' : ''}
                    {analyticsData.summary.monthOverMonth.toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600" />
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Monthly</p>
                <p className="text-2xl font-bold">${analyticsData.summary.averageMonthly.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {timeframe} month average
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{analyticsData.summary.billCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(analyticsData.summary.billCount / parseInt(timeframe))} per month
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Bill</p>
                <p className="text-2xl font-bold">${analyticsData.summary.averageBill.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per utility bill
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {/* Chart Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <div className="flex gap-1">
            {[
              { key: 'total', label: 'Actual Costs', icon: DollarSign },
              { key: 'trend', label: 'With Trends', icon: TrendingUp },
              { key: 'forecast', label: 'With Forecast', icon: Target }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedMetric === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric(key as any)}
                className="text-xs"
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Enhanced Chart */}
        <InteractiveChart
          title="Advanced Cost Analysis"
          icon={<TrendingUp className="w-5 h-5" />}
          onDrillDown={(data) => {
            const month = data?.month || data?.activeLabel;
            const params = new URLSearchParams();
            if (month) params.set('month', month);
            router.push(`/utility-bills?${params.toString()}`);
          }}
          height={400}
          showNavigationHint={true}
          drillDownPath="/utility-bills"
          onNavigate={(path) => router.push(path)}
        >
          <AreaChart data={analyticsData.monthlyTrends}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              fontSize={12}
              tickFormatter={(value) => value.slice(5)}
              stroke="#6b7280"
            />
            <YAxis fontSize={12} stroke="#6b7280" />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-semibold">{label}</p>
                      <p className="text-green-600">
                        Total: {formatCurrency(data.total)}
                      </p>
                      {data.isAnomaly && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Unusual activity
                        </p>
                      )}
                      {selectedMetric === 'trend' && data.trend && (
                        <p className="text-blue-500 text-xs">
                          Trend: {formatCurrency(data.trend)}
                        </p>
                      )}
                      {selectedMetric === 'forecast' && data.forecast && (
                        <p className="text-purple-500 text-xs">
                          Forecast: {formatCurrency(data.forecast)}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Main cost area */}
            <Area
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#costGradient)"
              dot={(props: any) => {
                const isAnomaly = props.payload?.isAnomaly;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={isAnomaly ? 6 : 4}
                    fill={isAnomaly ? "#ef4444" : "#10b981"}
                    stroke={isAnomaly ? "#fef2f2" : "#ffffff"}
                    strokeWidth={2}
                  />
                );
              }}
            />

            {/* Trend line */}
            {selectedMetric === 'trend' && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}

            {/* Forecast line */}
            {selectedMetric === 'forecast' && (
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </AreaChart>
        </InteractiveChart>
      </motion.div>
    </div>
  );
}