"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { LoadingContent } from "@/components/LoadingContent";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { UtilityForm } from "@/components/UtilityForm";
import { LeaseForm } from "@/components/LeaseForm";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  Home, DollarSign, Percent, TrendingUp, 
  Building2, Receipt, Calendar, Users, ArrowRight 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PropertyCard } from "@/components/PropertyCard";
import { cn } from "@/lib/utils";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const metrics = useQuery(api.dashboard.getDashboardMetrics, { 
    userId: user?.id ?? "" 
  });
  
  // Modal states
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [utilityModalOpen, setUtilityModalOpen] = useState(false);
  const [leaseModalOpen, setLeaseModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Mutations
  const addProperty = useMutation(api.properties.addProperty);
  const addUtility = useMutation(api.utilities.addUtility);
  const addLease = useMutation(api.leases.addLease);
  
  // Get additional data for forms
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");

  if (!user || !metrics) {
    return <LoadingContent />;
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

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300" role="main">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Welcome back! Here's an overview of your real estate portfolio.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Portfolio Value</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ${(metrics.totalMonthlyRent * 12).toLocaleString()}/yr
                </p>
              </div>
            </div>
          </div>
        </header>

      {/* Stat Cards */}
      <section className="mb-6 sm:mb-8" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Portfolio Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className={`p-4 sm:p-6 hover:shadow-xl transition-all duration-300 border-l-4 ${stat.borderColor} group cursor-pointer`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold mt-1 break-words group-hover:scale-105 transition-transform" aria-label={`${stat.title}: ${stat.value}`}>
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stat.bgColor} ${stat.color} font-medium`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} flex-shrink-0 ml-2 group-hover:scale-110 transition-transform`} aria-hidden="true">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-6 sm:mb-8">
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button 
              onClick={() => setPropertyModalOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Add Property</span>
            </button>
            <button 
              onClick={() => setLeaseModalOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30"
            >
              <Users className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">New Lease</span>
            </button>
            <button 
              onClick={() => setUtilityModalOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30"
            >
              <Receipt className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Add Utility</span>
            </button>
            <button 
              onClick={() => setDocumentModalOpen(true)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background hover:bg-muted/50 transition-colors border border-border hover:border-primary/30"
            >
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Upload Docs</span>
            </button>
          </div>
        </Card>
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
                  <th className="pb-3 px-2 sm:px-0" scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentProperties.map((property) => (
                  <tr 
                    key={property.id} 
                    className={cn(
                      "border-t group cursor-pointer hover:bg-muted/50 transition-colors"
                    )}
                    role="row"
                    onClick={() => router.push(`/properties/${property.id}`)}
                  >
                    <PropertyCard
                      property={{
                        _id: property.id,
                        name: property.name,
                        address: property.address,
                        type: property.type,
                        status: property.status,
                        bedrooms: property.bedrooms || 0,
                        bathrooms: property.bathrooms || 0,
                        squareFeet: property.squareFeet || 0,
                        monthlyRent: property.monthlyRent,
                        purchaseDate: property.purchaseDate || new Date().toISOString(),
                      }}
                      variant="table-row"
                      showActions={false}
                    />
                    <td className="py-3 px-2 sm:px-0" role="cell">
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                    </td>
                  </tr>
                ))}
                {metrics.recentProperties.length === 0 && (
                  <tr role="row">
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-sm" role="cell">
                      No properties found. Add your first property to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
      
      {/* Modals */}
      {/* Add Property Modal */}
      <Dialog open={propertyModalOpen} onOpenChange={setPropertyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>
          <PropertyForm
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addProperty({ ...data, userId: user.id });
                setPropertyModalOpen(false);
              } catch (err: any) {
                console.error("Add property error:", err);
                const errorMessage = err.data?.message || err.message || "Unknown error";
                alert("Failed to add property: " + errorMessage);
              } finally {
                setLoading(false);
              }
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Add Utility Modal */}
      <Dialog open={utilityModalOpen} onOpenChange={setUtilityModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Utility</DialogTitle>
          </DialogHeader>
          <UtilityForm
            properties={properties || []}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addUtility({ ...data, userId: user.id, propertyId: data.propertyId as any });
                setUtilityModalOpen(false);
              } catch (err: any) {
                console.error("Add utility error:", err);
                const errorMessage = err.data?.message || err.message || "Unknown error";
                alert("Failed to add utility: " + errorMessage);
              } finally {
                setLoading(false);
              }
            }}
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
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addLease({ ...data, userId: user.id });
                setLeaseModalOpen(false);
              } catch (err: any) {
                console.error("Add lease error:", err);
                const errorMessage = err.data?.message || err.message || "Unknown error";
                alert("Failed to add lease: " + errorMessage);
              } finally {
                setLoading(false);
              }
            }}
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
      
      </div>
    </main>
  );
}