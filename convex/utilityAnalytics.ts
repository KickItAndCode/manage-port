import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Utility analytics with enhanced insights
export const getEnhancedUtilityAnalytics = query({
  args: {
    userId: v.string(),
    timeframeMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, timeframeMonths = 12 } = args;

    // Get utility bills
    const allBills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (!allBills || allBills.length === 0) {
      return {
        monthlyTrends: [],
        insights: {
          totalSpent: 0,
          averageMonthly: 0,
          trend: 0,
          yearOverYear: 0,
          seasonalPattern: null,
          anomalies: [],
          predictions: {},
        },
        utilityBreakdown: [],
        propertyComparison: [],
      };
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - timeframeMonths);
    const cutoffMonth = cutoffDate.toISOString().slice(0, 7);

    // Filter bills by timeframe
    const recentBills = allBills.filter(bill => bill.billMonth >= cutoffMonth);

    // Process monthly trends with enhanced data
    const monthlyData: Record<string, {
      month: string;
      total: number;
      Electric: number;
      Water: number;
      Gas: number;
      Other: number;
      billCount: number;
      properties: Set<string>;
    }> = {};

    recentBills.forEach(bill => {
      if (!monthlyData[bill.billMonth]) {
        monthlyData[bill.billMonth] = {
          month: bill.billMonth,
          total: 0,
          Electric: 0,
          Water: 0,
          Gas: 0,
          Other: 0,
          billCount: 0,
          properties: new Set(),
        };
      }

      const monthData = monthlyData[bill.billMonth];
      monthData.total += bill.totalAmount;
      monthData.billCount += 1;
      monthData.properties.add(bill.propertyId);

      // Categorize by utility type
      switch (bill.utilityType) {
        case "Electric":
          monthData.Electric += bill.totalAmount;
          break;
        case "Water":
          monthData.Water += bill.totalAmount;
          break;
        case "Gas":
          monthData.Gas += bill.totalAmount;
          break;
        default:
          monthData.Other += bill.totalAmount;
      }
    });

    // Convert to array and sort, ensuring all utility types are present
    const monthlyTrends = Object.values(monthlyData)
      .map(({ properties, ...data }) => ({
        ...data,
        propertyCount: properties.size,
        // Ensure all utility types have a value, even if 0
        Electric: data.Electric || 0,
        Water: data.Water || 0,
        Gas: data.Gas || 0,
        Other: data.Other || 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate insights
    const insights = calculateInsights(monthlyTrends, allBills);

    // Utility type breakdown
    const utilityTotals: Record<string, { amount: number; count: number }> = {};
    recentBills.forEach(bill => {
      if (!utilityTotals[bill.utilityType]) {
        utilityTotals[bill.utilityType] = { amount: 0, count: 0 };
      }
      utilityTotals[bill.utilityType].amount += bill.totalAmount;
      utilityTotals[bill.utilityType].count += 1;
    });

    const utilityBreakdown = Object.entries(utilityTotals)
      .map(([type, data]) => ({
        name: type,
        value: data.amount,
        count: data.count,
        average: data.amount / data.count,
      }))
      .sort((a, b) => b.value - a.value);

    // Property comparison (top 5 by cost)
    const propertyTotals: Record<string, { 
      propertyId: string; 
      total: number; 
      billCount: number;
      utilityTypes: Set<string>;
    }> = {};

    recentBills.forEach(bill => {
      if (!propertyTotals[bill.propertyId]) {
        propertyTotals[bill.propertyId] = {
          propertyId: bill.propertyId,
          total: 0,
          billCount: 0,
          utilityTypes: new Set(),
        };
      }
      propertyTotals[bill.propertyId].total += bill.totalAmount;
      propertyTotals[bill.propertyId].billCount += 1;
      propertyTotals[bill.propertyId].utilityTypes.add(bill.utilityType);
    });

    // Get property names
    const propertyIds = Object.keys(propertyTotals);
    const properties = await ctx.db
      .query("properties")
      .filter(q => q.or(...propertyIds.map(id => q.eq(q.field("_id"), id))))
      .collect();

    const propertyMap = new Map(properties.map(p => [p._id, p]));

    const propertyComparison = Object.values(propertyTotals)
      .map(data => {
        const property = propertyMap.get(data.propertyId);
        return {
          propertyId: data.propertyId,
          name: property?.name || "Unknown Property",
          address: property?.address || "",
          total: data.total,
          average: data.total / data.billCount,
          billCount: data.billCount,
          utilityTypeCount: data.utilityTypes.size,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      monthlyTrends,
      insights,
      utilityBreakdown,
      propertyComparison,
    };
  },
});

// Helper function to calculate advanced insights
function calculateInsights(
  monthlyTrends: Array<{
    month: string;
    total: number;
    Electric: number;
    Water: number;
    Gas: number;
    Other: number;
    billCount: number;
    propertyCount: number;
  }>,
  allBills: Doc<"utilityBills">[]
) {
  if (monthlyTrends.length === 0) {
    return {
      totalSpent: 0,
      averageMonthly: 0,
      trend: 0,
      yearOverYear: 0,
      seasonalPattern: null,
      anomalies: [],
      predictions: {},
      highestMonth: null,
      lowestMonth: null,
      consistencyScore: 0,
    };
  }

  // Basic metrics
  const totalSpent = monthlyTrends.reduce((sum, m) => sum + m.total, 0);
  const averageMonthly = totalSpent / monthlyTrends.length;

  // Trend calculation (last 3 months vs previous 3 months)
  let trend = 0;
  if (monthlyTrends.length >= 6) {
    const recent3 = monthlyTrends.slice(-3).reduce((sum, m) => sum + m.total, 0) / 3;
    const previous3 = monthlyTrends.slice(-6, -3).reduce((sum, m) => sum + m.total, 0) / 3;
    trend = ((recent3 - previous3) / previous3) * 100;
  }

  // Year-over-year comparison
  let yearOverYear = 0;
  const currentMonth = monthlyTrends[monthlyTrends.length - 1];
  const yearAgoMonth = monthlyTrends.find(m => {
    const current = new Date(currentMonth.month);
    const target = new Date(m.month);
    return (
      current.getMonth() === target.getMonth() &&
      current.getFullYear() - target.getFullYear() === 1
    );
  });
  
  if (yearAgoMonth) {
    yearOverYear = ((currentMonth.total - yearAgoMonth.total) / yearAgoMonth.total) * 100;
  }

  // Detect anomalies (using z-score method)
  const standardDeviation = Math.sqrt(
    monthlyTrends.reduce((sum, m) => sum + Math.pow(m.total - averageMonthly, 2), 0) / 
    monthlyTrends.length
  );

  const anomalies = monthlyTrends
    .map(month => {
      const zScore = Math.abs((month.total - averageMonthly) / standardDeviation);
      return {
        month: month.month,
        total: month.total,
        zScore,
        isAnomaly: zScore > 2, // 2 standard deviations
        severity: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low',
      };
    })
    .filter(a => a.isAnomaly);

  // Seasonal pattern detection
  const seasonalPattern = detectSeasonalPattern(monthlyTrends);

  // Simple linear regression for prediction
  const predictions = calculatePredictions(monthlyTrends);

  // Find highest and lowest months
  const highestMonth = monthlyTrends.reduce((max, m) => 
    m.total > max.total ? m : max, monthlyTrends[0]
  );
  const lowestMonth = monthlyTrends.reduce((min, m) => 
    m.total < min.total ? m : min, monthlyTrends[0]
  );

  // Consistency score (lower coefficient of variation = more consistent)
  const consistencyScore = standardDeviation > 0 
    ? Math.max(0, 100 - (standardDeviation / averageMonthly) * 100)
    : 100;

  return {
    totalSpent,
    averageMonthly,
    trend,
    yearOverYear,
    seasonalPattern,
    anomalies,
    predictions,
    highestMonth,
    lowestMonth,
    consistencyScore,
  };
}

// Detect seasonal patterns
function detectSeasonalPattern(monthlyTrends: Array<{ month: string; total: number }>) {
  if (monthlyTrends.length < 12) return null;

  // Group by month of year
  const monthlyAverages: Record<number, { total: number; count: number }> = {};
  
  monthlyTrends.forEach(({ month, total }) => {
    const monthNum = new Date(month).getMonth();
    if (!monthlyAverages[monthNum]) {
      monthlyAverages[monthNum] = { total: 0, count: 0 };
    }
    monthlyAverages[monthNum].total += total;
    monthlyAverages[monthNum].count += 1;
  });

  // Calculate seasonal indices
  const overallAverage = monthlyTrends.reduce((sum, m) => sum + m.total, 0) / monthlyTrends.length;
  const seasonalIndices = Object.entries(monthlyAverages).map(([month, data]) => ({
    month: parseInt(month),
    index: (data.total / data.count) / overallAverage,
    average: data.total / data.count,
  }));

  // Identify peak and low seasons
  const peak = seasonalIndices.reduce((max, s) => s.index > max.index ? s : max);
  const low = seasonalIndices.reduce((min, s) => s.index < min.index ? s : min);

  return {
    indices: seasonalIndices,
    peakMonth: peak.month,
    peakIndex: peak.index,
    lowMonth: low.month,
    lowIndex: low.index,
    variation: peak.index - low.index,
  };
}

// Calculate predictions using simple linear regression
function calculatePredictions(monthlyTrends: Array<{ month: string; total: number }>) {
  if (monthlyTrends.length < 3) return {};

  // Convert months to numeric values
  const data = monthlyTrends.map((m, i) => ({ x: i, y: m.total }));
  
  // Calculate linear regression
  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Predict next 3 months
  const predictions: Record<string, number> = {};
  const lastMonth = new Date(monthlyTrends[monthlyTrends.length - 1].month);

  for (let i = 1; i <= 3; i++) {
    const futureMonth = new Date(lastMonth);
    futureMonth.setMonth(futureMonth.getMonth() + i);
    const monthStr = futureMonth.toISOString().slice(0, 7);
    predictions[monthStr] = Math.max(0, slope * (n - 1 + i) + intercept);
  }

  return predictions;
}