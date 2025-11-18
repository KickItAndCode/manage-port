"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sun, 
  Snowflake, 
  TrendingUp, 
  TrendingDown,
  Info
} from "lucide-react";
import { formatCurrency } from "@/utils/chartUtils";

interface SeasonalPattern {
  indices: Array<{ month: number; index: number; average: number }>;
  peakMonth: number;
  peakIndex: number;
  lowMonth: number;
  lowIndex: number;
  variation: number;
}

interface SeasonalInsightsProps {
  pattern: SeasonalPattern | null;
  className?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function SeasonalInsights({ pattern, className }: SeasonalInsightsProps) {
  if (!pattern || pattern.variation < 0.2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Seasonal Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your utility costs are relatively consistent throughout the year with minimal seasonal variation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const variationPercentage = (pattern.variation * 100).toFixed(0);
  const peakMonthName = monthNames[pattern.peakMonth];
  const lowMonthName = monthNames[pattern.lowMonth];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="w-5 h-5" />
          Seasonal Patterns Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variation summary */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Seasonal Variation</span>
          <Badge variant={pattern.variation > 0.5 ? "destructive" : "secondary"}>
            {variationPercentage}% difference
          </Badge>
        </div>

        {/* Peak and low months */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-900 dark:text-red-100">
                Peak Month
              </span>
            </div>
            <p className="text-lg font-semibold text-red-900 dark:text-red-100">
              {peakMonthName}
            </p>
            <p className="text-xs text-red-700 dark:text-red-300">
              {((pattern.peakIndex - 1) * 100).toFixed(0)}% above average
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Low Month
              </span>
            </div>
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {lowMonthName}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {((1 - pattern.lowIndex) * 100).toFixed(0)}% below average
            </p>
          </motion.div>
        </div>

        {/* Monthly breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">Monthly Cost Index</p>
          {pattern.indices
            .sort((a, b) => b.index - a.index)
            .slice(0, 4)
            .map((month, idx) => (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {monthNames[month.month]}
                  </span>
                  <span className="font-medium">
                    {((month.index - 1) * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={month.index * 50} 
                  className="h-2"
                />
              </motion.div>
            ))}
        </div>

        {/* Insight */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Consider budget adjustments for {peakMonthName} when costs are typically highest.
            You could save approximately {variationPercentage}% by optimizing usage during peak months.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}