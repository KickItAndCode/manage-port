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
  Building2, Receipt, Calendar, Users 
} from "lucide-react";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useUser();
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your real estate portfolio.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Monthly Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.monthlyIncome}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Properties by Type */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            Properties by Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Properties by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Properties by Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Financial Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Financial Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <span className="text-gray-700">Monthly Rental Income</span>
              <span className="font-semibold text-green-700">
                ${metrics.totalMonthlyRent.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="text-gray-700">Monthly Utility Costs</span>
              <span className="font-semibold text-red-700">
                ${metrics.totalUtilityCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="text-gray-700">Net Monthly Income</span>
              <span className="font-semibold text-blue-700">
                ${(metrics.totalMonthlyRent - metrics.totalUtilityCost).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <span className="text-gray-700">Total Square Feet</span>
              <span className="font-semibold text-purple-700">
                {metrics.totalSquareFeet.toLocaleString()} sq ft
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Properties */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          Recent Properties
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-3">Property</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Monthly Rent</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentProperties.map((property) => (
                <tr key={property.id} className="border-t">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {property.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      property.status === 'Available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {property.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">
                    ${property.monthlyRent.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}