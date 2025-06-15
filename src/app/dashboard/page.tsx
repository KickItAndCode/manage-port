"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyCreationWizard, type PropertyWizardData } from "@/components/PropertyCreationWizard";
import { LeaseForm } from "@/components/LeaseForm";
import DocumentUploadForm from "@/components/DocumentUploadForm";
import { UtilityBillForm } from "@/components/UtilityBillForm";
import { OutstandingBalances } from "@/components/OutstandingBalances";
import { UtilityAnalytics } from "@/components/UtilityAnalytics";
import { UtilityResponsibilityModal } from "@/components/UtilityResponsibilityModal";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { InteractiveChart, useChartDrillDown } from "@/components/charts/InteractiveChart";
import { createEnhancedTooltip } from "@/components/charts/AdvancedTooltip";
import { formatCurrency, calculateChange } from "@/utils/chartUtils";
import { 
  Home, DollarSign, Percent, TrendingUp, 
  Building2, Receipt, Calendar, Users, Sparkles, Wand2 
} from "lucide-react";
import { useRouter } from "next/navigation";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

// Status-specific colors for better semantic meaning
const STATUS_COLORS = {
  'Occupied': '#10b981',    // Green - positive/active
  'Vacant': '#f59e0b',      // Amber - attention needed
  'Under Maintenance': '#ef4444', // Red - issue/work needed
  'Other': '#6b7280'        // Gray - neutral
};

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const metrics = useQuery(api.dashboard.getDashboardMetrics, { 
    userId: user?.id ?? "" 
  });
  
  // Get user settings for component visibility
  const userSettings = useQuery(api.userSettings.getUserSettings, 
    user ? { userId: user.id } : "skip"
  );
  
  // Modal states
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const [leaseModalOpen, setLeaseModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [utilityBillModalOpen, setUtilityBillModalOpen] = useState(false);
  const [utilityResponsibilityModalOpen, setUtilityResponsibilityModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Mutations
  const createPropertyWithUnits = useMutation(api.properties.createPropertyWithUnits);
  const addLease = useMutation(api.leases.addLease);
  const addUtilityBill = useMutation(api.utilityBills.addUtilityBill);
  
  // Get additional data for forms
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  
  // Check if user has no properties
  const hasNoProperties = properties && properties.length === 0;

  // Comprehensive dashboard loading skeleton that matches the actual layout
  const DashboardLoadingSkeleton = () => (
    <main className="min-h-screen bg-background text-foreground p-3 sm:p-6 lg:p-8 transition-colors duration-300" role="main">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <header className="mb-4 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <Skeleton className="h-8 sm:h-9 w-48" />
              <Skeleton className="h-4 w-80 mt-1" />
            </div>
            <div className="flex justify-end items-center sm:flex-col sm:items-end gap-2">
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 sm:h-6 w-20" />
              </div>
            </div>
          </div>
        </header>

        {/* Stat Cards skeleton */}
        <section className="mb-4 sm:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-3 sm:p-6 border-l-4 border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-6 sm:h-8 w-16 mb-2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl self-end sm:self-auto" />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions skeleton */}
        <section className="mb-4 sm:mb-8">
          <Card className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Skeleton className="h-5 sm:h-6 w-32" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg border border-border min-h-[80px] sm:min-h-[100px]">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="text-center space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Outstanding Balances skeleton */}
        <section className="mb-4 sm:mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Charts Grid skeleton */}
        <section className="mb-4 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Monthly Revenue Trend skeleton */}
            <Card className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Skeleton className="h-4 w-4 sm:h-5 sm:w-5" />
                <Skeleton className="h-5 sm:h-6 w-44" />
              </div>
              <Skeleton className="h-[200px] sm:h-[300px] w-full" />
            </Card>

            {/* Properties by Type skeleton */}
            <Card className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Skeleton className="h-4 w-4 sm:h-5 sm:w-5" />
                <Skeleton className="h-5 sm:h-6 w-40" />
              </div>
              <Skeleton className="h-[200px] sm:h-[300px] w-full" />
            </Card>
          </div>
        </section>

        {/* Additional Charts skeleton */}
        <section className="mb-4 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Properties by Status skeleton */}
            <Card className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Skeleton className="h-4 w-4 sm:h-5 sm:w-5" />
                <Skeleton className="h-5 sm:h-6 w-44" />
              </div>
              <Skeleton className="h-[200px] sm:h-[300px] w-full" />
            </Card>

            {/* Financial Summary skeleton */}
            <Card className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Skeleton className="h-4 w-4 sm:h-5 sm:w-5" />
                <Skeleton className="h-5 sm:h-6 w-36" />
              </div>
              <div className="space-y-2 sm:space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 rounded-lg gap-1 sm:gap-0">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 sm:h-5 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* Utility Analytics skeleton */}
        <section className="mb-6 sm:mb-8">
          <div className="space-y-6">
            {/* Header */}
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

            {/* Summary Cards */}
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
          </div>
        </section>

      </div>
    </main>
  );

  if (!user || !metrics || !userSettings) {
    return <DashboardLoadingSkeleton />;
  }

  const statCards = [
    {
      title: "Total Properties",
      value: metrics.totalProperties,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800",
      trend: "+2 this month",
      trendPositive: true,
    },
    {
      title: "Monthly Revenue",
      value: `$${metrics.totalMonthlyRent.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
      trend: `+${((metrics.totalMonthlyRent / 10000) * 100).toFixed(1)}%`,
      trendPositive: true,
    },
    {
      title: "Occupancy Rate",
      value: `${metrics.occupancyRate.toFixed(1)}%`,
      icon: Percent,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-800",
      trend: metrics.occupancyRate >= 90 ? "Excellent" : metrics.occupancyRate >= 75 ? "Good" : "Needs attention",
      trendPositive: metrics.occupancyRate >= 75,
    },
    {
      title: "Security Deposits",
      value: `$${metrics.totalSecurityDeposits.toLocaleString()}`,
      icon: Users,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800",
      trend: `${metrics.activeLeases} active`,
      trendPositive: true,
    },
  ];

  const typeData = Object.entries(metrics.propertiesByType).map(([type, count]) => ({
    name: type,
    value: count,
  }));

  const statusData = Object.entries(metrics.propertiesByStatus).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // Chart drill-down handlers with pre-selected filters
  const handlePropertyTypeDrillDown = (data?: any) => {
    const propertyType = data?.name || data?.activeLabel;
    const params = new URLSearchParams();
    if (propertyType) {
      params.set('type', propertyType);
    }
    const url = `/properties${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handlePropertyStatusDrillDown = (data?: any) => {
    const status = data?.name || data?.activeLabel;
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    const url = `/properties${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleRevenueDrillDown = (data?: any) => {
    const month = data?.month || data?.activeLabel;
    const params = new URLSearchParams();
    if (month) {
      params.set('month', month);
    }
    const url = `/properties${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(url);
    // Scroll to top after navigation
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  // Enhanced tooltip configurations
  const revenueTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => 'Monthly Revenue',
    formatValue: (value) => {
      if (typeof value === 'number') {
        return formatCurrency(value);
      }
      return value?.toString() || 'N/A';
    }
  });

  const propertyTooltipConfig = createEnhancedTooltip({
    getLabel: (payload, label) => `${label || 'Property'} Properties`,
    formatValue: (value) => {
      if (typeof value === 'number') {
        return `${value} ${value === 1 ? 'property' : 'properties'}`;
      }
      return value?.toString() || 'N/A';
    }
  });

  return (
    <main className="min-h-screen bg-background text-foreground p-3 sm:p-6 lg:p-8 transition-colors duration-300" role="main">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Welcome back! Here&apos;s an overview of your real estate portfolio.
              </p>
            </div>
            <div className="flex justify-end items-center sm:flex-col sm:items-end gap-2">
              <div className="text-right">
                <p className="text-xs sm:text-sm text-muted-foreground">Portfolio Value</p>
                <p className="text-sm sm:text-xl font-semibold text-green-600 dark:text-green-400">
                  ${(metrics.totalMonthlyRent * 12).toLocaleString()}/yr
                </p>
              </div>
            </div>
          </div>
        </header>


      {/* Stat Cards - only show if user has properties */}
      {!hasNoProperties && userSettings.dashboardComponents.showMetrics && (
        <section className="mb-4 sm:mb-8" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Portfolio Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className={`p-3 sm:p-6 hover:shadow-xl transition-all duration-300 border-l-4 ${stat.borderColor} group cursor-pointer`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate leading-tight">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 break-words group-hover:scale-105 transition-transform" aria-label={`${stat.title}: ${stat.value}`}>
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1 mt-1 sm:mt-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${stat.bgColor} ${stat.color} font-medium`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} flex-shrink-0 self-end sm:self-auto sm:ml-2 group-hover:scale-110 transition-transform`} aria-hidden="true">
                    <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      {userSettings.dashboardComponents.showQuickActions && (
        <section className="mb-4 sm:mb-8">
          <Card className="p-3 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <button 
                onClick={() => setWizardModalOpen(true)}
                className={`flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg transition-all min-h-[80px] sm:min-h-[100px] relative ${
                  hasNoProperties 
                    ? "bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/30 hover:border-primary/50" 
                    : "bg-background hover:bg-muted/50 border border-border hover:border-primary/30"
                }`}
              >
                {hasNoProperties && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-sm animate-pulse">
                    <Sparkles className="h-3 w-3" />
                    <span>Start here</span>
                  </div>
                )}
                <Wand2 className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                <div className="text-center">
                  <span className="text-sm sm:text-sm font-medium block">Property Wizard</span>
                  <span className={`text-xs ${hasNoProperties ? "text-primary/80" : "text-muted-foreground"}`}>
                    Add Properties
                  </span>
                </div>
              </button>
              <button 
                onClick={() => setLeaseModalOpen(true)}
                className="flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30 min-h-[80px] sm:min-h-[100px]"
              >
                <Users className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-sm font-medium text-center">New Lease</span>
              </button>
              <button 
                onClick={() => setUtilityBillModalOpen(true)}
                className="flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30 min-h-[80px] sm:min-h-[100px]"
              >
                <Receipt className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-sm font-medium text-center">Add Bill</span>
              </button>
              <button 
                onClick={() => setUtilityResponsibilityModalOpen(true)}
                className="flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30 min-h-[80px] sm:min-h-[100px] disabled:opacity-50"
                disabled={!properties || properties.length === 0}
              >
                <Percent className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-sm font-medium text-center">Utility Split</span>
              </button>
              <button 
                onClick={() => setDocumentModalOpen(true)}
                className="flex flex-col items-center gap-2 p-4 sm:p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30 min-h-[80px] sm:min-h-[100px]"
              >
                <DollarSign className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-sm font-medium text-center">Upload Docs</span>
              </button>
            </div>
          </Card>
        </section>
      )}

      {/* All dashboard content below - only show if user has properties */}
      {!hasNoProperties && (
        <>
          {/* Outstanding Balances */}
          {userSettings.dashboardComponents.showOutstandingBalances && (
            <section className="mb-4 sm:mb-8">
              <OutstandingBalances userId={user.id} />
            </section>
          )}

          {/* Charts Grid */}
          {userSettings.dashboardComponents.showCharts && (
            <section className="mb-4 sm:mb-8" aria-labelledby="charts-heading">
              <h2 id="charts-heading" className="sr-only">Analytics Charts</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
              {/* Monthly Revenue Trend */}
              <InteractiveChart
                title="Monthly Revenue Trend"
                icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                onDrillDown={handleRevenueDrillDown}
                height={300}
                showNavigationHint={true}
                drillDownPath="/properties"
                onNavigate={(path) => router.push(path)}
              >
                <LineChart data={metrics.monthlyIncome} onClick={(data) => handleRevenueDrillDown(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={revenueTooltipConfig} />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </InteractiveChart>

              {/* Properties by Type */}
              <InteractiveChart
                title="Properties by Type"
                icon={<Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />}
                onDrillDown={handlePropertyTypeDrillDown}
                height={300}
                showNavigationHint={true}
                drillDownPath="/properties"
                onNavigate={(path) => router.push(path)}
              >
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => handlePropertyTypeDrillDown(data)}
                  >
                    {typeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={propertyTooltipConfig} />
                </PieChart>
              </InteractiveChart>
              </div>
            </section>
          )}

          {/* Additional Charts */}
          {(userSettings.dashboardComponents.showCharts || userSettings.dashboardComponents.showFinancialSummary) && (
            <section className="mb-4 sm:mb-8" aria-labelledby="additional-charts-heading">
              <h2 id="additional-charts-heading" className="sr-only">Additional Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                {/* Properties by Status */}
                {userSettings.dashboardComponents.showCharts && (
                  <InteractiveChart
                    title="Properties by Status"
                    icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />}
                    onDrillDown={handlePropertyStatusDrillDown}
                    height={300}
                    showNavigationHint={true}
                    drillDownPath="/properties"
                    onNavigate={(path) => router.push(path)}
                  >
                    <BarChart data={statusData} onClick={(data) => handlePropertyStatusDrillDown(data)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                        allowDecimals={false}
                        domain={[0, (dataMax: number) => Math.max(dataMax * 2, 1)]}
                      />
                      <Tooltip content={propertyTooltipConfig} />
                      <Bar 
                        dataKey="value" 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {statusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || STATUS_COLORS.Other}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </InteractiveChart>
                )}

                {/* Financial Summary */}
                {userSettings.dashboardComponents.showFinancialSummary && (
                  <Card className="p-3 sm:p-6">
                    <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" aria-hidden="true" />
                      Financial Summary
                    </h3>
                    <div className="space-y-2 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg gap-1 sm:gap-0">
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-base">Monthly Rental Income</span>
                        <span className="font-semibold text-green-700 dark:text-green-400 text-sm sm:text-lg">
                          ${metrics.totalMonthlyRent.toLocaleString()}
                        </span>
                      </div>
                      {metrics.totalMonthlyMortgage > 0 && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg gap-1 sm:gap-0">
                          <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-base">Monthly Mortgage</span>
                          <span className="font-semibold text-orange-700 dark:text-orange-400 text-sm sm:text-lg">
                            -${metrics.totalMonthlyMortgage.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg gap-1 sm:gap-0">
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-base">Monthly Utility Costs</span>
                        <span className="font-semibold text-red-700 dark:text-red-400 text-sm sm:text-lg">
                          -${metrics.totalUtilityCost.toLocaleString()}
                        </span>
                      </div>
                      {metrics.totalMonthlyCapEx > 0 && (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg gap-1 sm:gap-0">
                          <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-base">CapEx Reserve (10%)</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400 text-sm sm:text-lg">
                            -${metrics.totalMonthlyCapEx.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg gap-1 sm:gap-0 border-t-2 border-blue-200 dark:border-blue-800">
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-base font-medium">Net Monthly Income</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400 text-sm sm:text-lg">
                          ${(metrics.totalMonthlyRent - metrics.totalUtilityCost - metrics.totalMonthlyMortgage - metrics.totalMonthlyCapEx).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* Utility Analytics */}
          {userSettings.dashboardComponents.showUtilityAnalytics && (
            <section className="mb-6 sm:mb-8">
              <UtilityAnalytics userId={user.id} />
            </section>
          )}

        </>
      )}
      
      {/* Modals */}

      {/* Property Creation Wizard Modal */}
      <Dialog open={wizardModalOpen} onOpenChange={setWizardModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[95vh] p-0 overflow-hidden">
          <PropertyCreationWizard
            isModal={true}
            onSubmit={async (data: PropertyWizardData) => {
              setLoading(true);
              try {
                const result = await createPropertyWithUnits({
                  // Basic property info
                  userId: user.id,
                  name: data.name,
                  address: data.address,
                  type: data.type,
                  status: data.status,
                  bedrooms: data.bedrooms,
                  bathrooms: data.bathrooms,
                  squareFeet: data.squareFeet,
                  purchaseDate: data.purchaseDate,
                  monthlyMortgage: data.monthlyMortgage,
                  monthlyCapEx: data.monthlyCapEx,
                  
                  // Property type and units
                  propertyType: data.propertyType,
                  units: data.units,
                  
                  // Utility setup
                  utilityPreset: data.utilityPreset,
                  customSplit: data.customSplit,
                });

                toast.success(result.message);
                setWizardModalOpen(false);
                
                // Navigate to the new property if on mobile, or just close modal on desktop
                if (window.innerWidth < 768) {
                  router.push(`/properties/${result.propertyId}`);
                }
              } catch (err: any) {
                console.error("Create property error:", err);
                toast.error(formatErrorForToast(err));
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => setWizardModalOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Add Lease Modal */}
      <Dialog open={leaseModalOpen} onOpenChange={setLeaseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Lease</DialogTitle>
          </DialogHeader>
          <LeaseForm
            properties={properties || []}
            userId={user.id}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addLease({ 
                  ...data, 
                  userId: user.id,
                  propertyId: data.propertyId as any,
                  unitId: data.unitId ? data.unitId as any : undefined,
                  status: data.status as "active" | "expired" | "pending"
                });
                toast.success("Lease created successfully!");
                setLeaseModalOpen(false);
              } catch (err: any) {
                console.error("Add lease error:", err);
                toast.error(formatErrorForToast(err));
              } finally {
                setLoading(false);
              }
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Add Utility Bill Modal */}
      <Dialog open={utilityBillModalOpen} onOpenChange={setUtilityBillModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Utility Bill</DialogTitle>
          </DialogHeader>
          <UtilityBillForm
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addUtilityBill({
                  userId: user.id,
                  ...data,
                  propertyId: data.propertyId as any,
                });
                setUtilityBillModalOpen(false);
              } catch (err: any) {
                console.error("Add utility bill error:", err);
                toast.error(formatErrorForToast(err));
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => setUtilityBillModalOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Upload Documents Modal */}
      <DocumentUploadForm
        open={documentModalOpen}
        onOpenChange={setDocumentModalOpen}
        onUploadComplete={() => {
          // Optionally refresh data or show success message
        }}
      />

      {/* Utility Responsibility Modal */}
      <UtilityResponsibilityModal
        open={utilityResponsibilityModalOpen}
        onOpenChange={setUtilityResponsibilityModalOpen}
        userId={user.id}
      />
      
      </div>
    </main>
  );
}