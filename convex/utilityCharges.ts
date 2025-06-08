import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Type for calculated tenant charges
export interface CalculatedTenantCharge {
  leaseId: Id<"leases">;
  unitId?: Id<"units">;
  tenantName: string;
  utilityBillId: Id<"utilityBills">;
  utilityType: string;
  billMonth: string;
  totalBillAmount: number;
  chargedAmount: number;
  responsibilityPercentage: number;
  dueDate: string;
  paidAmount: number;
  remainingAmount: number;
  unitIdentifier?: string;
  propertyName?: string;
}

// Helper function to calculate tenant charges for a bill
async function calculateChargesForBill(
  ctx: any,
  bill: Doc<"utilityBills">
): Promise<CalculatedTenantCharge[]> {
  // Get all active leases for the property
  const activeLeases = await ctx.db
    .query("leases")
    .withIndex("by_property", (q: any) => q.eq("propertyId", bill.propertyId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  if (activeLeases.length === 0) {
    return [];
  }

  const charges: CalculatedTenantCharge[] = [];

  // Calculate charges for each lease based on utility settings
  for (const lease of activeLeases) {
    // Get utility setting for this lease and utility type
    const setting = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
      .filter((q: any) => q.eq(q.field("utilityType"), bill.utilityType))
      .first();

    if (setting && setting.responsibilityPercentage > 0) {
      // Calculate the charged amount
      const chargedAmount = Math.round((bill.totalAmount * setting.responsibilityPercentage) / 100 * 100) / 100;

      // Get payments for this lease and bill
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
        .filter((q: any) => q.eq(q.field("utilityBillId"), bill._id))
        .collect();

      const paidAmount = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
      const remainingAmount = Math.max(0, chargedAmount - paidAmount);

      // Get unit information if available
      let unitIdentifier;
      if (lease.unitId) {
        const unit = await ctx.db.get(lease.unitId);
        unitIdentifier = unit?.unitIdentifier;
      }

      charges.push({
        leaseId: lease._id,
        unitId: lease.unitId,
        tenantName: lease.tenantName,
        utilityBillId: bill._id,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        totalBillAmount: bill.totalAmount,
        chargedAmount,
        responsibilityPercentage: setting.responsibilityPercentage,
        dueDate: bill.dueDate,
        paidAmount,
        remainingAmount,
        unitIdentifier,
      });
    }
  }

  return charges;
}

// Calculate tenant charges for a specific bill
export const calculateTenantChargesForBill = query({
  args: {
    billId: v.id("utilityBills"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill || bill.userId !== args.userId) {
      return [];
    }

    return await calculateChargesForBill(ctx, bill);
  },
});

// Calculate tenant charges for all bills in a property within a date range
export const calculateTenantChargesForProperty = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      return [];
    }

    // Get bills for the property within date range
    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId));

    if (args.startMonth && args.endMonth) {
      billsQuery = billsQuery.filter((q: any) => 
        q.and(
          q.gte(q.field("billMonth"), args.startMonth),
          q.lte(q.field("billMonth"), args.endMonth)
        )
      );
    } else if (args.startMonth) {
      billsQuery = billsQuery.filter((q: any) => 
        q.gte(q.field("billMonth"), args.startMonth)
      );
    } else if (args.endMonth) {
      billsQuery = billsQuery.filter((q: any) => 
        q.lte(q.field("billMonth"), args.endMonth)
      );
    }

    const bills = await billsQuery.collect();

    // Calculate charges for all bills
    const allCharges: CalculatedTenantCharge[] = [];
    for (const bill of bills) {
      const charges = await calculateChargesForBill(ctx, bill);
      allCharges.push(...charges);
    }

    // Add property name to charges
    const chargesWithProperty = allCharges.map(charge => ({
      ...charge,
      propertyName: property.name,
    }));

    // Sort by bill month descending, then by tenant name
    return chargesWithProperty.sort((a, b) => {
      const monthCompare = b.billMonth.localeCompare(a.billMonth);
      if (monthCompare !== 0) return monthCompare;
      return a.tenantName.localeCompare(b.tenantName);
    });
  },
});

// Calculate tenant charges for all properties of a user within a date range
export const calculateAllTenantCharges = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get bills for the user (optionally filtered by property)
    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId));

    const bills = await billsQuery.collect();

    // Filter by property if specified
    const filteredBills = args.propertyId 
      ? bills.filter(bill => bill.propertyId === args.propertyId)
      : bills;

    // Filter by date range if specified
    const dateFilteredBills = filteredBills.filter(bill => {
      if (args.startMonth && bill.billMonth < args.startMonth) return false;
      if (args.endMonth && bill.billMonth > args.endMonth) return false;
      return true;
    });

    // Calculate charges for all bills
    const allCharges: CalculatedTenantCharge[] = [];
    for (const bill of dateFilteredBills) {
      const charges = await calculateChargesForBill(ctx, bill);
      allCharges.push(...charges);
    }

    // Add property names to charges
    const propertyMap = new Map();
    const chargesWithProperty = await Promise.all(
      allCharges.map(async (charge) => {
        // Get the bill to find the property
        let property = propertyMap.get(charge.utilityBillId);
        if (!property) {
          const bill = await ctx.db.get(charge.utilityBillId);
          if (bill) {
            property = await ctx.db.get(bill.propertyId);
            propertyMap.set(charge.utilityBillId, property);
          }
        }
        
        return {
          ...charge,
          propertyName: property?.name || "Unknown Property",
        };
      })
    );

    // Sort by creation date descending
    return chargesWithProperty.sort((a, b) => 
      b.billMonth.localeCompare(a.billMonth)
    );
  },
});

// Calculate tenant charges for a specific lease within a date range
export const calculateTenantChargesForLease = query({
  args: {
    leaseId: v.id("leases"),
    userId: v.string(),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== args.userId) {
      return [];
    }

    // Get all bills for the property
    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", lease.propertyId));

    const bills = await billsQuery.collect();

    // Filter by date range if specified
    const dateFilteredBills = bills.filter(bill => {
      if (args.startMonth && bill.billMonth < args.startMonth) return false;
      if (args.endMonth && bill.billMonth > args.endMonth) return false;
      return true;
    });

    // Calculate charges only for this specific lease
    const leaseCharges: CalculatedTenantCharge[] = [];
    
    for (const bill of dateFilteredBills) {
      // Get utility setting for this lease and utility type
      const setting = await ctx.db
        .query("leaseUtilitySettings")
        .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
        .filter((q: any) => q.eq(q.field("utilityType"), bill.utilityType))
        .first();

      if (setting && setting.responsibilityPercentage > 0) {
        // Calculate the charged amount
        const chargedAmount = Math.round((bill.totalAmount * setting.responsibilityPercentage) / 100 * 100) / 100;

        // Get payments for this lease and bill
        const payments = await ctx.db
          .query("utilityPayments")
          .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
          .filter((q: any) => q.eq(q.field("utilityBillId"), bill._id))
          .collect();

        const paidAmount = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const remainingAmount = Math.max(0, chargedAmount - paidAmount);

        // Get unit information if available
        let unitIdentifier;
        if (lease.unitId) {
          const unit = await ctx.db.get(lease.unitId);
          unitIdentifier = unit?.unitIdentifier;
        }

        // Get property information
        const property = await ctx.db.get(lease.propertyId);

        leaseCharges.push({
          leaseId: lease._id,
          unitId: lease.unitId,
          tenantName: lease.tenantName,
          utilityBillId: bill._id,
          utilityType: bill.utilityType,
          billMonth: bill.billMonth,
          totalBillAmount: bill.totalAmount,
          chargedAmount,
          responsibilityPercentage: setting.responsibilityPercentage,
          dueDate: bill.dueDate,
          paidAmount,
          remainingAmount,
          unitIdentifier,
          propertyName: property?.name,
        });
      }
    }

    // Sort by bill month descending
    return leaseCharges.sort((a, b) => 
      b.billMonth.localeCompare(a.billMonth)
    );
  },
});

// Get outstanding (unpaid) charges summary
export const getOutstandingChargesSummary = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Get all charges (with optional property filter) - implement the logic here directly
    // Get bills for the user (optionally filtered by property)
    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId));

    const bills = await billsQuery.collect();

    // Filter by property if specified
    const filteredBills = args.propertyId 
      ? bills.filter(bill => bill.propertyId === args.propertyId)
      : bills;

    // Calculate charges for all bills
    const allCharges: CalculatedTenantCharge[] = [];
    for (const bill of filteredBills) {
      const charges = await calculateChargesForBill(ctx, bill);
      allCharges.push(...charges);
    }

    // Filter to only outstanding charges
    const outstandingCharges = allCharges.filter(charge => charge.remainingAmount > 0);

    // Calculate summary statistics
    const totalOutstanding = outstandingCharges.reduce(
      (sum, charge) => sum + charge.remainingAmount, 
      0
    );

    const byUtilityType: Record<string, number> = {};
    const byProperty: Record<string, number> = {};
    const byTenant: Record<string, number> = {};

    outstandingCharges.forEach(charge => {
      // By utility type
      byUtilityType[charge.utilityType] = (byUtilityType[charge.utilityType] || 0) + charge.remainingAmount;
      
      // By property
      if (charge.propertyName) {
        byProperty[charge.propertyName] = (byProperty[charge.propertyName] || 0) + charge.remainingAmount;
      }
      
      // By tenant
      byTenant[charge.tenantName] = (byTenant[charge.tenantName] || 0) + charge.remainingAmount;
    });

    // Find oldest unpaid charge
    const oldestCharge = outstandingCharges.length > 0 
      ? outstandingCharges.reduce((oldest, current) => 
          current.billMonth < oldest.billMonth ? current : oldest
        )
      : null;

    return {
      totalOutstanding,
      totalCharges: outstandingCharges.length,
      byUtilityType,
      byProperty,
      byTenant,
      oldestCharge: oldestCharge ? {
        tenantName: oldestCharge.tenantName,
        amount: oldestCharge.remainingAmount,
        billMonth: oldestCharge.billMonth,
        utilityType: oldestCharge.utilityType,
      } : null,
    };
  },
});