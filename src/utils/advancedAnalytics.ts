import { Id } from "@/../convex/_generated/dataModel";

export interface UtilityBill {
  _id: Id<"utilityBills">;
  propertyId: Id<"properties">;
  utilityType: string;
  totalAmount: number;
  billMonth: string;
  billDate: string;
  dueDate: string;
  isPaid: boolean;
  noTenantCharges?: boolean;
}

export interface AnalyticsMetrics {
  totalCost: number;
  averageMonthly: number;
  billCount: number;
  averageBill: number;
  monthOverMonth: number;
  yearOverYear?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  efficiency: number;
}

export interface SeasonalPattern {
  month: number;
  averageMultiplier: number;
  confidence: number;
}

export interface PredictionData {
  month: string;
  predicted: number;
  confidence: number;
  upper: number;
  lower: number;
}

export interface AnomalyData {
  month: string;
  actual: number;
  expected: number;
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'drop' | 'pattern_break';
}

/**
 * Advanced analytics engine for utility cost analysis
 */
export class UtilityAnalyticsEngine {
  private bills: UtilityBill[];
  private cache: Map<string, any> = new Map();

  constructor(bills: UtilityBill[]) {
    this.bills = bills;
  }

  /**
   * Calculate comprehensive analytics metrics
   */
  calculateMetrics(timeframeMonths: number): AnalyticsMetrics {
    const cacheKey = `metrics_${timeframeMonths}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - timeframeMonths);
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);

    const recentBills = this.bills.filter(bill => bill.billMonth >= cutoffMonth);
    const monthlyData = this.groupByMonth(recentBills);
    const sortedMonths = Object.keys(monthlyData).sort();

    const totalCost = recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const averageMonthly = sortedMonths.length > 0 ? totalCost / sortedMonths.length : 0;
    const billCount = recentBills.length;
    const averageBill = billCount > 0 ? totalCost / billCount : 0;

    // Month-over-month calculation
    let monthOverMonth = 0;
    if (sortedMonths.length >= 2) {
      const lastMonth = monthlyData[sortedMonths[sortedMonths.length - 1]];
      const prevMonth = monthlyData[sortedMonths[sortedMonths.length - 2]];
      monthOverMonth = ((lastMonth - prevMonth) / prevMonth) * 100;
    }

    // Year-over-year calculation
    let yearOverYear: number | undefined;
    if (timeframeMonths >= 12 && sortedMonths.length >= 12) {
      const recent12Months = sortedMonths.slice(-12);
      const previous12Months = sortedMonths.slice(-24, -12);
      
      if (previous12Months.length === 12) {
        const recentSum = recent12Months.reduce((sum, month) => sum + monthlyData[month], 0);
        const previousSum = previous12Months.reduce((sum, month) => sum + monthlyData[month], 0);
        yearOverYear = ((recentSum - previousSum) / previousSum) * 100;
      }
    }

    // Trend analysis
    const trend = this.calculateTrend(monthlyData, sortedMonths);
    
    // Volatility calculation (coefficient of variation)
    const monthlyValues = sortedMonths.map(month => monthlyData[month]);
    const variance = this.calculateVariance(monthlyValues);
    const volatility = averageMonthly > 0 ? Math.sqrt(variance) / averageMonthly : 0;

    // Efficiency score (lower cost per property is better)
    const uniqueProperties = new Set(recentBills.map(b => b.propertyId)).size;
    const efficiency = uniqueProperties > 0 ? averageMonthly / uniqueProperties : 0;

    const metrics: AnalyticsMetrics = {
      totalCost,
      averageMonthly,
      billCount,
      averageBill,
      monthOverMonth,
      yearOverYear,
      trend,
      volatility,
      efficiency
    };

    this.cache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Detect seasonal patterns in utility costs
   */
  detectSeasonalPatterns(minYears: number = 2): SeasonalPattern[] {
    const cacheKey = `seasonal_${minYears}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const monthlyData: Record<number, number[]> = {};
    
    // Group bills by calendar month across all years
    this.bills.forEach(bill => {
      const month = new Date(bill.billMonth + '-01').getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(bill.totalAmount);
    });

    const patterns: SeasonalPattern[] = [];
    const overallAverage = this.bills.reduce((sum, b) => sum + b.totalAmount, 0) / this.bills.length;

    for (let month = 0; month < 12; month++) {
      if (monthlyData[month] && monthlyData[month].length >= minYears) {
        const monthAverage = monthlyData[month].reduce((sum, val) => sum + val, 0) / monthlyData[month].length;
        const multiplier = overallAverage > 0 ? monthAverage / overallAverage : 1;
        
        // Calculate confidence based on data consistency
        const variance = this.calculateVariance(monthlyData[month]);
        const stdDev = Math.sqrt(variance);
        const confidence = Math.max(0, Math.min(1, 1 - (stdDev / monthAverage)));

        patterns.push({
          month,
          averageMultiplier: multiplier,
          confidence
        });
      }
    }

    this.cache.set(cacheKey, patterns);
    return patterns;
  }

  /**
   * Generate cost predictions for future months
   */
  generatePredictions(monthsAhead: number = 6): PredictionData[] {
    const cacheKey = `predictions_${monthsAhead}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const monthlyData = this.groupByMonth(this.bills);
    const sortedMonths = Object.keys(monthlyData).sort();
    
    if (sortedMonths.length < 3) {
      return []; // Need at least 3 months of data
    }

    const predictions: PredictionData[] = [];
    const seasonalPatterns = this.detectSeasonalPatterns();
    
    // Simple trend-based prediction with seasonal adjustment
    const recentMonths = sortedMonths.slice(-6); // Use last 6 months for trend
    const recentValues = recentMonths.map(month => monthlyData[month]);
    const trendSlope = this.calculateLinearTrend(recentValues);
    const baseValue = recentValues[recentValues.length - 1];

    for (let i = 1; i <= monthsAhead; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      const futureMonth = futureDate.toISOString().slice(0, 7);
      const calendarMonth = futureDate.getMonth();

      // Base prediction with trend
      let predicted = baseValue + (trendSlope * i);

      // Apply seasonal adjustment
      const seasonalPattern = seasonalPatterns.find(p => p.month === calendarMonth);
      if (seasonalPattern && seasonalPattern.confidence > 0.6) {
        predicted *= seasonalPattern.averageMultiplier;
      }

      // Calculate confidence and bounds
      const confidence = Math.max(0.3, 1 - (i * 0.1)); // Confidence decreases over time
      const variance = this.calculateVariance(recentValues);
      const stdDev = Math.sqrt(variance);
      
      predictions.push({
        month: futureMonth,
        predicted: Math.max(0, predicted),
        confidence,
        upper: predicted + (stdDev * 1.96), // 95% confidence interval
        lower: Math.max(0, predicted - (stdDev * 1.96))
      });
    }

    this.cache.set(cacheKey, predictions);
    return predictions;
  }

  /**
   * Detect anomalies in utility costs
   */
  detectAnomalies(sensitivityThreshold: number = 2): AnomalyData[] {
    const cacheKey = `anomalies_${sensitivityThreshold}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const monthlyData = this.groupByMonth(this.bills);
    const sortedMonths = Object.keys(monthlyData).sort();
    const values = sortedMonths.map(month => monthlyData[month]);
    
    if (values.length < 6) return []; // Need sufficient data for anomaly detection

    const anomalies: AnomalyData[] = [];
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(this.calculateVariance(values));

    sortedMonths.forEach((month, index) => {
      if (index < 3) return; // Skip first few months (no context)

      const actual = monthlyData[month];
      const recentAverage = values.slice(Math.max(0, index - 3), index)
        .reduce((sum, val) => sum + val, 0) / Math.min(3, index);

      const zScore = Math.abs(actual - mean) / stdDev;
      const deviationFromRecent = Math.abs(actual - recentAverage) / recentAverage;

      if (zScore > sensitivityThreshold || deviationFromRecent > 0.5) {
        let severity: 'low' | 'medium' | 'high';
        let type: 'spike' | 'drop' | 'pattern_break';

        if (zScore > 3 || deviationFromRecent > 0.8) {
          severity = 'high';
        } else if (zScore > 2.5 || deviationFromRecent > 0.6) {
          severity = 'medium';
        } else {
          severity = 'low';
        }

        if (actual > recentAverage * 1.3) {
          type = 'spike';
        } else if (actual < recentAverage * 0.7) {
          type = 'drop';
        } else {
          type = 'pattern_break';
        }

        anomalies.push({
          month,
          actual,
          expected: recentAverage,
          severity,
          type
        });
      }
    });

    this.cache.set(cacheKey, anomalies);
    return anomalies;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(): Array<{
    type: 'cost_reduction' | 'efficiency' | 'budgeting' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
    action: string;
  }> {
    const recommendations = [];
    const metrics = this.calculateMetrics(12);
    const anomalies = this.detectAnomalies();
    
    // Utility type analysis
    const utilityTotals: Record<string, number> = {};
    this.bills.forEach(bill => {
      utilityTotals[bill.utilityType] = (utilityTotals[bill.utilityType] || 0) + bill.totalAmount;
    });

    const totalCost = Object.values(utilityTotals).reduce((sum, val) => sum + val, 0);
    
    // High electric costs recommendation
    if (utilityTotals.Electric && (utilityTotals.Electric / totalCost) > 0.6) {
      recommendations.push({
        type: 'cost_reduction',
        priority: 'high',
        title: 'High Electricity Costs Detected',
        description: `Electricity accounts for ${((utilityTotals.Electric / totalCost) * 100).toFixed(0)}% of your utility costs.`,
        potentialSavings: utilityTotals.Electric * 0.15, // Estimate 15% savings potential
        action: 'Consider LED upgrades, smart thermostats, or energy audit'
      });
    }

    // High volatility recommendation
    if (metrics.volatility > 0.3) {
      recommendations.push({
        type: 'budgeting',
        priority: 'medium',
        title: 'High Cost Volatility',
        description: 'Your utility costs vary significantly month-to-month.',
        action: 'Set up larger utility budget buffer or investigate seasonal patterns'
      });
    }

    // Anomaly-based recommendations
    if (anomalies.length > 2) {
      recommendations.push({
        type: 'maintenance',
        priority: 'high',
        title: 'Unusual Usage Patterns Detected',
        description: `${anomalies.length} months show abnormal utility costs.`,
        action: 'Review for equipment issues, rate changes, or tenant behavior changes'
      });
    }

    return recommendations;
  }

  // Private utility methods
  private groupByMonth(bills: UtilityBill[]): Record<string, number> {
    const monthlyData: Record<string, number> = {};
    bills.forEach(bill => {
      monthlyData[bill.billMonth] = (monthlyData[bill.billMonth] || 0) + bill.totalAmount;
    });
    return monthlyData;
  }

  private calculateTrend(monthlyData: Record<string, number>, sortedMonths: string[]): 'increasing' | 'decreasing' | 'stable' {
    if (sortedMonths.length < 3) return 'stable';
    
    const values = sortedMonths.map(month => monthlyData[month]);
    const slope = this.calculateLinearTrend(values);
    
    const threshold = values.reduce((sum, val) => sum + val, 0) / values.length * 0.05; // 5% threshold
    
    if (slope > threshold) return 'increasing';
    if (slope < -threshold) return 'decreasing';
    return 'stable';
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0,1,2,...,n-1
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumXX = values.reduce((sum, _, index) => sum + (index * index), 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Clear cache (useful for testing or when data changes significantly)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Performance-optimized hook factory for analytics
 */
export function createAnalyticsEngine(bills: UtilityBill[]) {
  return new UtilityAnalyticsEngine(bills);
}

/**
 * Utility functions for common analytics operations
 */
export const AnalyticsUtils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  formatPercentage: (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  },

  getMonthName: (monthString: string): string => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  },

  calculateEfficiencyScore: (costPerProperty: number, benchmarkCost: number): number => {
    return Math.max(0, Math.min(100, ((benchmarkCost - costPerProperty) / benchmarkCost) * 100));
  },

  getBenchmarkData: (utilityType: string): { averageCost: number; efficiencyThreshold: number } => {
    // Industry benchmark data (simplified)
    const benchmarks: Record<string, { averageCost: number; efficiencyThreshold: number }> = {
      'Electric': { averageCost: 120, efficiencyThreshold: 100 },
      'Water': { averageCost: 50, efficiencyThreshold: 40 },
      'Gas': { averageCost: 80, efficiencyThreshold: 65 },
      'Other': { averageCost: 30, efficiencyThreshold: 25 }
    };
    
    return benchmarks[utilityType] || { averageCost: 75, efficiencyThreshold: 60 };
  }
};