import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { getLeaseStatus } from "./lib/leaseStatus";
import { averageMonthlyCost } from "./lib/finance";


// Helper function to calculate date range start date
function getDateRangeStart(dateRange?: "week" | "month" | "quarter" | "year" | "all"): Date | null {
  if (!dateRange || dateRange === "all") return null;
  
  const now = new Date();
  const start = new Date();
  
  switch (dateRange) {
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  return start;
}

// Get dashboard metrics for a user
export const getDashboardMetrics = query({
  args: { 
    propertyId: v.optional(v.id("properties")),
    dateRange: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("quarter"), v.literal("year"), v.literal("all"))),
    status: v.optional(v.union(v.literal("all"), v.literal("active"), v.literal("expired"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Get properties using index (optimized)
    let properties;
    if (args.propertyId) {
      // If filtering by specific property, get it directly
      const property = await ctx.db.get(args.propertyId);
      properties = property && property.userId === userId ? [property] : [];
    } else {
      // Use index for userId query
      properties = await ctx.db
        .query("properties")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Get leases using index (optimized)
    let leases;
    if (args.propertyId) {
      // Capture in const so TypeScript narrows inside the callback
      const propertyId = args.propertyId;
      // Use propertyId index for filtered query
      leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      // Use userId index
      leases = await ctx.db
        .query("leases")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Get utility bills using index (optimized)
    let utilityBills;
    if (args.propertyId) {
      const propertyId = args.propertyId;
      // Use propertyId index for filtered query
      utilityBills = await ctx.db
        .query("utilityBills")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      // Use userId index
      utilityBills = await ctx.db
        .query("utilityBills")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Calculate metrics
    const totalProperties = properties.length;
    const totalSquareFeet = properties.reduce((sum, p) => sum + (p.squareFeet ?? 0), 0);
    
    // Get units using index (optimized) - batch query by propertyId
    const propertyIds = properties.map(p => p._id);
    const unitsPromises = propertyIds.map(propertyId =>
      ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .collect()
    );
    const unitsArrays = await Promise.all(unitsPromises);
    const units = unitsArrays.flat();
    const totalUnits = units.length;
    
    // Apply date range filter to leases
    const dateRangeStart = getDateRangeStart(args.dateRange);
    if (dateRangeStart) {
      leases = leases.filter(l => {
        const leaseStart = new Date(l.startDate);
        const leaseEnd = new Date(l.endDate);
        // Include leases that overlap with the date range
        return leaseEnd >= dateRangeStart && leaseStart <= new Date();
      });
    }

    // Apply status filter to leases
    if (args.status && args.status !== "all") {
      leases = leases.filter(l => {
        const computedStatus = getLeaseStatus(l.startDate, l.endDate);
        return computedStatus === args.status;
      });
    }
    
    // Calculate occupancy and rent from active leases (computed from dates)
    const activeLeases = leases.filter(l => {
      const computedStatus = getLeaseStatus(l.startDate, l.endDate);
      return computedStatus === "active";
    });
    
    // Calculate occupancy rate based on units (more accurate for multi-unit properties)
    // If no units exist, fall back to properties-based calculation but cap at 100%
    let occupancyRate = 0;
    if (totalUnits > 0) {
      // Count unique units with active leases
      const unitsWithActiveLeases = new Set(
        activeLeases
          .map(l => l.unitId)
          .filter((id): id is Id<"units"> => id !== undefined)
      );
      occupancyRate = (unitsWithActiveLeases.size / totalUnits) * 100;
    } else if (totalProperties > 0) {
      // Fallback: use properties but cap at 100%
      occupancyRate = Math.min((activeLeases.length / totalProperties) * 100, 100);
    }
    
    // Use actual lease rent instead of property rent for more accurate income
    const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + l.rent, 0);
    
    // Calculate security deposits held
    const totalSecurityDeposits = activeLeases.reduce((sum, l) => sum + (l.securityDeposit || 0), 0);
    
    // Apply date range filter to utility bills
    let filteredUtilityBills = utilityBills;
    if (dateRangeStart) {
      filteredUtilityBills = utilityBills.filter(bill => {
        const billDate = new Date(bill.billDate);
        return billDate >= dateRangeStart;
      });
    }
    
    // Calculate total utility costs from recent bills
    // If date range is specified, use that; otherwise use last 3 months
    const utilityDateStart = dateRangeStart || (() => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return threeMonthsAgo;
    })();
    
    const recentBills = filteredUtilityBills.filter(bill => new Date(bill.billDate) >= utilityDateStart);
    
    // Average monthly utility cost over the window being viewed, through the
    // shared helper so the property page averages bills the same way.
    const monthsInRange = args.dateRange
      ? args.dateRange === "week"
        ? 7 / 30
        : args.dateRange === "month"
          ? 1
          : args.dateRange === "quarter"
            ? 3
            : args.dateRange === "year"
              ? 12
              : 3
      : 3; // Default: trailing three months
    const totalUtilityCost = averageMonthlyCost(recentBills, monthsInRange);

    // Calculate total mortgage and CapEx costs
    const totalMonthlyMortgage = properties.reduce((sum, p) => sum + (p.monthlyMortgage || 0), 0);
    const totalMonthlyCapEx = properties.reduce((sum, p) => sum + (p.monthlyCapEx || 0), 0);
    
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
        status: p.status,
        type: p.type,
      }));

    return {
      totalProperties,
      totalUnits,
      totalMonthlyRent,
      totalSquareFeet,
      occupancyRate,
      totalUtilityCost,
      totalMonthlyMortgage,
      totalMonthlyCapEx,
      totalSecurityDeposits,
      propertiesByType,
      propertiesByStatus,
      monthlyIncome,
      recentProperties,
      activeLeases: activeLeases.length,
    };
  },
});