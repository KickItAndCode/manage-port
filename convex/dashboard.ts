import { query } from "./_generated/server";
import { v } from "convex/values";

// Get dashboard metrics for a user
export const getDashboardMetrics = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all properties
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Get all leases
    const leases = await ctx.db
      .query("leases")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Get all utilities
    const utilities = await ctx.db
      .query("utilities")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Calculate metrics
    const totalProperties = properties.length;
    const totalSquareFeet = properties.reduce((sum, p) => sum + p.squareFeet, 0);
    
    // Calculate occupancy and rent from active leases
    const activeLeases = leases.filter(l => l.status === "active");
    const occupancyRate = totalProperties > 0 ? (activeLeases.length / totalProperties) * 100 : 0;
    
    // Use actual lease rent instead of property rent for more accurate income
    const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + l.rent, 0);
    
    // Calculate security deposits held
    const totalSecurityDeposits = activeLeases.reduce((sum, l) => sum + (l.securityDeposit || 0), 0);
    
    // Calculate total utility costs
    const totalUtilityCost = utilities.reduce((sum, u) => sum + u.cost, 0);
    
    // Properties by type
    const propertiesByType = properties.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Properties by status
    const propertiesByStatus = properties.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Monthly income trend (last 6 months)
    const currentDate = new Date();
    const monthlyIncome = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = date.toLocaleString('default', { month: 'short' });
      
      // For now, we'll use the current rent as the income for each month
      // In a real app, you'd track historical data
      monthlyIncome.push({
        month: monthStr,
        income: totalMonthlyRent,
      });
    }
    
    // Recent properties
    const recentProperties = properties
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p._id,
        name: p.name,
        address: p.address,
        monthlyRent: p.monthlyRent,
        status: p.status,
        type: p.type,
      }));

    return {
      totalProperties,
      totalMonthlyRent,
      totalSquareFeet,
      occupancyRate,
      totalUtilityCost,
      totalSecurityDeposits,
      propertiesByType,
      propertiesByStatus,
      monthlyIncome,
      recentProperties,
      activeLeases: activeLeases.length,
    };
  },
});