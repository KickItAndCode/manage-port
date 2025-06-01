"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { LoadingContent } from "@/components/LoadingContent";
import { Card } from "@/components/ui/card";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Home, DollarSign, Percent, TrendingUp, 
  Building2, Receipt, Calendar, Users, ArrowRight 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const metrics = useQuery(api.dashboard.getDashboardMetrics, { 
    userId: user?.id ?? "" 
  });

  if (!user || !metrics) {
    return <LoadingContent />;
  }

  const statCards = [
    {
      title: "Total Properties",
      value: metrics.totalProperties,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Monthly Revenue",
      value: `$${metrics.totalMonthlyRent.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Occupancy Rate",
      value: `${metrics.occupancyRate.toFixed(1)}%`,
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Active Leases",
      value: metrics.activeLeases,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
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

  return (
    <main className="p-4 sm:p-6 lg:p-8" role="main">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Welcome back! Here's an overview of your real estate portfolio.
        </p>
      </header>

      {/* Stat Cards */}
      <section className="mb-6 sm:mb-8" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Portfolio Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 break-words" aria-label={`${stat.title}: ${stat.value}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor} flex-shrink-0 ml-2`} aria-hidden="true">
                  <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Charts Grid */}
      <section className="mb-6 sm:mb-8" aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">Analytics Charts</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Monthly Revenue Trend */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" aria-hidden="true" />
              Monthly Revenue Trend
            </h3>
            <div className="h-[250px] sm:h-[300px]" role="img" aria-label="Line chart showing monthly revenue trend over time">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyIncome}>
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
                  <Tooltip 
                    formatter={(value) => `$${value}`} 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Properties by Type */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
              <Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" aria-hidden="true" />
              Properties by Type
            </h3>
            <div className="h-[250px] sm:h-[300px]" role="img" aria-label="Pie chart showing distribution of properties by type">
              <ResponsiveContainer width="100%" height="100%">
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
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      {/* Additional Charts */}
      <section className="mb-6 sm:mb-8" aria-labelledby="additional-charts-heading">
        <h2 id="additional-charts-heading" className="sr-only">Additional Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Properties by Status */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" aria-hidden="true" />
              Properties by Status
            </h3>
            <div className="h-[250px] sm:h-[300px]" role="img" aria-label="Bar chart showing properties grouped by status">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Financial Summary */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" aria-hidden="true" />
              Financial Summary
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-green-50 dark:bg-green-950/20 rounded-lg gap-2 sm:gap-0">
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Monthly Rental Income</span>
                <span className="font-semibold text-green-700 dark:text-green-400 text-base sm:text-lg">
                  ${metrics.totalMonthlyRent.toLocaleString()}
                </span>
              </div>
              {metrics.totalMonthlyMortgage > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg gap-2 sm:gap-0">
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Monthly Mortgage</span>
                  <span className="font-semibold text-orange-700 dark:text-orange-400 text-base sm:text-lg">
                    -${metrics.totalMonthlyMortgage.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg gap-2 sm:gap-0">
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Monthly Utility Costs</span>
                <span className="font-semibold text-red-700 dark:text-red-400 text-base sm:text-lg">
                  -${metrics.totalUtilityCost.toLocaleString()}
                </span>
              </div>
              {metrics.totalMonthlyCapEx > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg gap-2 sm:gap-0">
                  <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">CapEx Reserve (10%)</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 text-base sm:text-lg">
                    -${metrics.totalMonthlyCapEx.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg gap-2 sm:gap-0 border-t-2 border-blue-200 dark:border-blue-800">
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base font-medium">Net Monthly Income</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400 text-base sm:text-lg">
                  ${(metrics.totalMonthlyRent - metrics.totalUtilityCost - metrics.totalMonthlyMortgage - metrics.totalMonthlyCapEx).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Recent Properties */}
      <section aria-labelledby="recent-properties-heading">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 id="recent-properties-heading" className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" aria-hidden="true" />
              Recent Properties
            </h3>
            <button 
              onClick={() => router.push('/properties')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[600px] sm:min-w-0" role="table" aria-label="Recent properties overview">
              <thead>
                <tr className="text-left text-xs sm:text-sm text-muted-foreground">
                  <th className="pb-3 px-2 sm:px-0" scope="col">Property</th>
                  <th className="pb-3 px-2 sm:px-0" scope="col">Type</th>
                  <th className="pb-3 px-2 sm:px-0" scope="col">Status</th>
                  <th className="pb-3 text-right px-2 sm:px-0" scope="col">Monthly Rent</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentProperties.map((property, index) => (
                  <tr 
                    key={property.id} 
                    className={cn(
                      "border-t group cursor-pointer hover:bg-muted/50 transition-colors"
                    )}
                    role="row"
                    onClick={() => router.push(`/properties/${property.id}`)}
                  >
                    <td className="py-3 px-2 sm:px-0" role="cell">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors">
                            {property.name}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                            {property.address}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-0" role="cell">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full text-xs whitespace-nowrap">
                        {property.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-0" role="cell">
                      <StatusBadge status={property.status} variant="compact" />
                    </td>
                    <td className="py-3 text-right font-medium px-2 sm:px-0 text-sm sm:text-base" role="cell">
                      ${property.monthlyRent.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {metrics.recentProperties.length === 0 && (
                  <tr role="row">
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-sm" role="cell">
                      No properties found. Add your first property to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}