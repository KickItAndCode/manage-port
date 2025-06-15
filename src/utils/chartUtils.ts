import { Doc } from "@/../convex/_generated/dataModel";

// Chart data transformation utilities
export interface ChartDataPoint {
  name: string;
  value: number;
  originalData?: any;
  metadata?: Record<string, any>;
}

export interface TrendData extends ChartDataPoint {
  change?: number;
  changePercentage?: number;
  period?: string;
}

// Calculate percentage change between periods
export function calculateChange(current: number, previous: number): {
  change: number;
  changePercentage: number;
} {
  const change = current - previous;
  const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;
  
  return { change, changePercentage };
}

// Process monthly revenue data with trends
export function processRevenueData(
  monthlyData: Array<{ month: string; income: number }>
): TrendData[] {
  return monthlyData.map((item, index) => {
    const previousItem = monthlyData[index - 1];
    const trend = previousItem 
      ? calculateChange(item.income, previousItem.income)
      : { change: 0, changePercentage: 0 };

    return {
      name: item.month,
      value: item.income,
      change: trend.change,
      changePercentage: trend.changePercentage,
      period: previousItem?.month || 'N/A',
      originalData: item
    };
  });
}

// Process property data for charts
export function processPropertyData(
  properties: Array<Doc<"properties">>
): {
  typeData: ChartDataPoint[];
  statusData: ChartDataPoint[];
} {
  // Group by type
  const typeGroups = properties.reduce((acc, property) => {
    const type = property.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by status
  const statusGroups = properties.reduce((acc, property) => {
    const status = property.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.entries(typeGroups).map(([name, value]) => ({
    name,
    value,
    originalData: properties.filter(p => p.type === name)
  }));

  const statusData = Object.entries(statusGroups).map(([name, value]) => ({
    name,
    value,
    originalData: properties.filter(p => p.status === name)
  }));

  return { typeData, statusData };
}

// Process utility bills for analytics
export function processUtilityData(
  bills: Array<Doc<"utilityBills">>,
  timeframe: number = 6
): {
  monthlyTrends: TrendData[];
  utilityBreakdown: ChartDataPoint[];
  costAnalysis: {
    totalCost: number;
    averageMonthly: number;
    averageBill: number;
    billCount: number;
  };
} {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - timeframe);
  const cutoffMonth = cutoffDate.toISOString().slice(0, 7);

  // Filter recent bills
  const recentBills = bills.filter(bill => bill.billMonth >= cutoffMonth);

  // Monthly trends
  const monthlyGroups = recentBills.reduce((acc, bill) => {
    const month = bill.billMonth;
    acc[month] = (acc[month] || 0) + bill.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(monthlyGroups)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const monthlyTrends = monthlyData.map((item, index) => {
    const previousItem = monthlyData[index - 1];
    const trend = previousItem 
      ? calculateChange(item.total, previousItem.total)
      : { change: 0, changePercentage: 0 };

    return {
      name: item.month,
      value: item.total,
      change: trend.change,
      changePercentage: trend.changePercentage,
      period: previousItem?.month || 'N/A',
      originalData: recentBills.filter(b => b.billMonth === item.month)
    };
  });

  // Utility type breakdown
  const utilityGroups = recentBills.reduce((acc, bill) => {
    const type = bill.utilityType || 'Other';
    acc[type] = (acc[type] || 0) + bill.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const utilityBreakdown = Object.entries(utilityGroups)
    .map(([name, value]) => ({
      name,
      value,
      originalData: recentBills.filter(b => b.utilityType === name)
    }))
    .sort((a, b) => b.value - a.value);

  // Cost analysis
  const totalCost = recentBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const averageMonthly = monthlyTrends.length > 0 ? totalCost / monthlyTrends.length : 0;
  const billCount = recentBills.length;
  const averageBill = billCount > 0 ? totalCost / billCount : 0;

  return {
    monthlyTrends,
    utilityBreakdown,
    costAnalysis: {
      totalCost,
      averageMonthly,
      averageBill,
      billCount
    }
  };
}

// Calculate benchmark comparisons
export function calculateBenchmarks(
  currentValue: number,
  comparisonValues: number[]
): {
  average: number;
  percentile: number;
  performance: 'above' | 'below' | 'at';
} {
  const average = comparisonValues.reduce((sum, val) => sum + val, 0) / comparisonValues.length;
  
  const sorted = [...comparisonValues].sort((a, b) => a - b);
  const rank = sorted.filter(val => val <= currentValue).length;
  const percentile = (rank / sorted.length) * 100;
  
  const performance = currentValue > average * 1.05 ? 'above' : 
                    currentValue < average * 0.95 ? 'below' : 'at';

  return { average, percentile, performance };
}

// Format currency values consistently
export function formatCurrency(
  value: number, 
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  }).format(value);
}

// Format percentage values
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// Generate chart colors with semantic meaning
export const CHART_COLORS = {
  primary: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
  revenue: '#10b981',
  expense: '#ef4444',
  neutral: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6'
};

// Get semantic color based on performance
export function getPerformanceColor(
  performance: 'above' | 'below' | 'at' | 'positive' | 'negative' | 'neutral'
): string {
  switch (performance) {
    case 'above':
    case 'positive':
      return CHART_COLORS.success;
    case 'below':
    case 'negative':
      return CHART_COLORS.danger;
    case 'at':
    case 'neutral':
    default:
      return CHART_COLORS.neutral;
  }
}