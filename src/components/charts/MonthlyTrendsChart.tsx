"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Dot
} from "recharts";
import { 
  TrendingUp, TrendingDown, AlertCircle, Sparkles,
  ChevronRight, Info, DollarSign, Zap, Plus, FileText
} from "lucide-react";
import { formatCurrency } from "@/utils/chartUtils";
import { cn } from "@/lib/utils";

interface MonthlyTrendData {
  month: string;
  total: number;
  Electric: number;
  Water: number;
  Gas: number;
  Other: number;
  // Enhanced fields
  prediction?: number;
  anomaly?: boolean;
  savingsOpportunity?: number;
  weatherNormalized?: number;
}

interface MonthlyTrendsChartProps {
  data: MonthlyTrendData[];
  onDrillDown?: (data: any) => void;
  height?: number;
  className?: string;
}

export function MonthlyTrendsChart({ 
  data, 
  onDrillDown, 
  height = 400,
  className 
}: MonthlyTrendsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<"total" | "breakdown">("total");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Calculate enhanced metrics
  const enhancedData = useMemo(() => {
    if (!data || data.length === 0) return { data: [], insights: {} };

    // Calculate moving average for anomaly detection
    const movingAvg = data.map((item, idx) => {
      const start = Math.max(0, idx - 2);
      const end = idx + 1;
      const subset = data.slice(start, end);
      const avg = subset.reduce((sum, d) => sum + d.total, 0) / subset.length;
      return avg;
    });

    // Enhance data with predictions and anomalies
    const enhanced = data.map((item, idx) => {
      const avg = movingAvg[idx];
      const deviation = Math.abs(item.total - avg) / avg;
      const anomaly = deviation > 0.3; // 30% deviation threshold

      // Simple linear prediction for next month
      let prediction: number | undefined;
      if (idx === data.length - 1 && idx >= 2) {
        const trend = (data[idx].total - data[idx - 2].total) / 2;
        prediction = Math.max(0, item.total + trend);
      }

      // Identify savings opportunities (simplified)
      const savingsOpportunity = anomaly && item.total > avg 
        ? item.total - avg 
        : undefined;

      return {
        ...item,
        anomaly,
        prediction,
        savingsOpportunity,
        movingAverage: avg
      };
    });

    // Calculate insights
    const currentMonth = enhanced[enhanced.length - 1];
    const previousMonth = enhanced[enhanced.length - 2];
    const yearAgo = enhanced[Math.max(0, enhanced.length - 12)];

    const insights = {
      trend: currentMonth && previousMonth 
        ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
        : 0,
      yearOverYear: currentMonth && yearAgo
        ? ((currentMonth.total - yearAgo.total) / yearAgo.total) * 100
        : 0,
      avgMonthly: enhanced.reduce((sum, d) => sum + d.total, 0) / enhanced.length,
      highestMonth: enhanced.reduce((max, d) => d.total > max.total ? d : max, enhanced[0]),
      lowestMonth: enhanced.reduce((min, d) => d.total < min.total ? d : min, enhanced[0]),
      totalSavingsOpportunity: enhanced.reduce((sum, d) => sum + (d.savingsOpportunity || 0), 0),
      anomalyCount: enhanced.filter(d => d.anomaly).length
    };

    return { data: enhanced, insights };
  }, [data]);

  const { data: chartData, insights } = enhancedData;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const isAnomaly = data.anomaly;
    const savingsOpp = data.savingsOpportunity;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{label}</p>
            {isAnomaly && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Anomaly
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-mono font-semibold">{formatCurrency(data.total)}</span>
            </div>
            
            {selectedMetric === "breakdown" && (
              <>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Electric:</span>
                  <span className="font-mono">{formatCurrency(data.Electric)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Water:</span>
                  <span className="font-mono">{formatCurrency(data.Water)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Gas:</span>
                  <span className="font-mono">{formatCurrency(data.Gas)}</span>
                </div>
              </>
            )}
            
            {savingsOpp && (
              <div className="pt-2 mt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Potential savings: {formatCurrency(savingsOpp)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Custom dot for anomalies
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    if (payload.anomaly) {
      return (
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <circle cx={cx} cy={cy} r={6} fill="#ef4444" />
          <circle cx={cx} cy={cy} r={3} fill="#fff" />
        </motion.g>
      );
    }
    
    return <circle cx={cx} cy={cy} r={4} fill="#10b981" />;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Cost Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track spending patterns and identify opportunities
            </p>
          </div>
          
          {/* Quick insights */}
          <div className="flex items-center gap-2">
            {insights && insights.trend !== 0 && (
              <Badge 
                variant={insights.trend > 0 ? "destructive" : "secondary"}
                className="gap-1"
              >
                {insights.trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(insights.trend).toFixed(1)}%
              </Badge>
            )}
            
            {insights && insights.anomalyCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                {insights.anomalyCount} anomal{insights.anomalyCount === 1 ? 'y' : 'ies'}
              </Badge>
            )}
          </div>
        </div>

        {/* Metric selector */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setSelectedMetric("total")}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              selectedMetric === "total"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            Total Cost
          </button>
          <button
            onClick={() => setSelectedMetric("breakdown")}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              selectedMetric === "breakdown"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            By Type
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {/* Empty state */}
          {!chartData || chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 p-8 text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <FileText className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold mb-2">No Utility Bills Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Your Monthly Cost Trends will appear here once you add utility bills. 
                Track spending patterns, identify anomalies, and discover savings opportunities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.href = '/utility-bills'}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Bill
                </button>
                <button
                  onClick={() => {
                    // Create sample data to demonstrate the chart
                    const currentDate = new Date();
                    const sampleData = Array.from({ length: 6 }, (_, i) => {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
                      const month = date.toISOString().slice(0, 7);
                      const baseElectric = 120 + Math.sin(i * 0.5) * 40; // Seasonal variation
                      const baseWater = 60 + Math.random() * 20;
                      const baseGas = 80 + Math.cos(i * 0.8) * 30;
                      const baseOther = 30 + Math.random() * 15;
                      
                      return {
                        month,
                        Electric: Math.round(baseElectric),
                        Water: Math.round(baseWater),
                        Gas: Math.round(baseGas),
                        Other: Math.round(baseOther),
                        total: Math.round(baseElectric + baseWater + baseGas + baseOther)
                      };
                    });
                    
                    // Update the data temporarily for demo purposes
                    onDrillDown?.({ demoData: sampleData });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  View Demo Data
                </button>
              </div>
              
              <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Pro Tip:</strong> Add 3-6 months of historical bills to see meaningful trends and get anomaly detection.
                </p>
              </div>
            </div>
          ) : (
            /* Main chart */
            <ResponsiveContainer width="100%" height={height}>
            <AreaChart 
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              onClick={onDrillDown}
              onMouseMove={(e) => {
                if (e && e.activeLabel) {
                  setHoveredMonth(e.activeLabel);
                }
              }}
              onMouseLeave={() => setHoveredMonth(null)}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorElectric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
                tickFormatter={(value) => {
                  // Format as "Jan '24" for better readability
                  const date = new Date(value + '-01');
                  const month = date.toLocaleDateString('en-US', { month: 'short' });
                  const year = date.getFullYear().toString().slice(2);
                  return `${month} '${year}`;
                }}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Moving average reference line */}
              {insights && insights.avgMonthly && (
                <ReferenceLine 
                  y={insights.avgMonthly} 
                  stroke="#6b7280"
                  strokeDasharray="5 5"
                  label={{ value: "Average", position: "right", fontSize: 12 }}
                />
              )}
              
              {selectedMetric === "total" ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                    dot={<CustomDot />}
                    animationDuration={1000}
                  />
                  
                  {/* Prediction for next month */}
                  {chartData[chartData.length - 1]?.prediction && (
                    <ReferenceLine
                      x={chartData[chartData.length - 1].month}
                      stroke="#8b5cf6"
                      strokeDasharray="3 3"
                      label={{
                        value: `Predicted: ${formatCurrency(chartData[chartData.length - 1].prediction || 0)}`,
                        position: "top",
                        fontSize: 12
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="Electric"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="Water"
                    stackId="1"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="Gas"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="Other"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
          )}

          {/* Hover overlay */}
          <AnimatePresence>
            {hoveredMonth && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 right-4 text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-md border"
              >
                Click to view bills for {hoveredMonth}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Insights section */}
        <div className="p-4 pt-2 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total savings opportunity */}
            {insights && insights.totalSavingsOpportunity > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
              >
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Savings Opportunity
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Up to {formatCurrency(insights?.totalSavingsOpportunity || 0)} based on unusual usage patterns
                  </p>
                </div>
              </motion.div>
            )}

            {/* Year over year change */}
            {insights && insights.yearOverYear !== 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                {(insights?.yearOverYear || 0) > 0 ? (
                  <TrendingUp className="w-5 h-5 text-destructive mt-0.5" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Year-over-Year
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(insights?.yearOverYear || 0) > 0 ? '+' : ''}{(insights?.yearOverYear || 0).toFixed(1)}% compared to last year
                  </p>
                </div>
              </motion.div>
            )}

            {/* Action button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => onDrillDown?.({})}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">View All Bills</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}