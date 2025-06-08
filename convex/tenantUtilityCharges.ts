import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Get outstanding charges with filtering options
export const getOutstandingCharges = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
  },
  handler: async (ctx, args) => {
    // First get all unpaid charges
    let chargesQuery = ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_payment_status", (q: any) => q.eq("fullyPaid", false));

    const charges = await chargesQuery.collect();

    // Filter by user's properties/leases
    const userCharges = [];
    
    for (const charge of charges) {
      // Get the utility bill to check ownership
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Apply lease filter if specified
      if (args.leaseId && charge.leaseId !== args.leaseId) continue;

      // Get lease information
      const lease = await ctx.db.get(charge.leaseId);
      if (!lease) continue;

      // Get property information
      const property = await ctx.db.get(bill.propertyId);
      if (!property) continue;

      // Get unit information if available
      let unitIdentifier;
      if (lease.unitId) {
        const unit = await ctx.db.get(lease.unitId);
        unitIdentifier = unit?.unitIdentifier;
      }

      // Get payment history for this charge
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q: any) => q.eq("chargeId", charge._id))
        .collect();

      const paidAmount = charge.tenantPaidAmount;

      userCharges.push({
        ...charge,
        tenantName: lease.tenantName,
        propertyName: property.name,
        unitIdentifier,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        dueDate: bill.dueDate,
        paidAmount,
      });
    }

    // Sort by creation date (oldest first)
    return userCharges.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },
});

// Get charge details with payment history
export const getChargeDetails = query({
  args: {
    chargeId: v.id("tenantUtilityCharges"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const charge = await ctx.db.get(args.chargeId);
    if (!charge) return null;

    // Get the utility bill
    const bill = await ctx.db.get(charge.utilityBillId);
    if (!bill || bill.userId !== args.userId) return null;

    // Get lease information
    const lease = await ctx.db.get(charge.leaseId);
    if (!lease) return null;

    // Get property information
    const property = await ctx.db.get(bill.propertyId);
    if (!property) return null;

    // Get payment history
    const payments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_charge", (q: any) => q.eq("chargeId", args.chargeId))
      .collect();

    const paidAmount = charge.tenantPaidAmount;
    const remainingAmount = charge.chargedAmount - paidAmount;

    return {
      ...charge,
      tenantName: lease.tenantName,
      propertyName: property.name,
      utilityType: bill.utilityType,
      billMonth: bill.billMonth,
      dueDate: bill.dueDate,
      paidAmount,
      remainingAmount,
      payments: payments.sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      ),
    };
  },
});

// Get charges by lease
export const getChargesByLease = query({
  args: {
    leaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== args.userId) return [];

    const charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", args.leaseId))
      .collect();

    // Add bill information to each charge
    const chargesWithBillInfo = [];
    for (const charge of charges) {
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill) continue;

      // Get payment information
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q: any) => q.eq("chargeId", charge._id))
        .collect();

      const paidAmount = charge.tenantPaidAmount;

      chargesWithBillInfo.push({
        ...charge,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        dueDate: bill.dueDate,
        paidAmount,
        remainingAmount: charge.chargedAmount - paidAmount,
      });
    }

    return chargesWithBillInfo.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
});

// Get summary statistics for a property or user
export const getChargesSummary = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Get all unpaid charges for the user
    let chargesQuery = ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_payment_status", (q: any) => q.eq("isPaid", false));

    const charges = await chargesQuery.collect();
    const outstandingCharges = [];
    
    for (const charge of charges) {
      // Get the utility bill to check ownership
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Get lease information
      const lease = await ctx.db.get(charge.leaseId);
      if (!lease) continue;

      // Get property information
      const property = await ctx.db.get(bill.propertyId);
      if (!property) continue;

      // Get payment history for this charge
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q: any) => q.eq("chargeId", charge._id))
        .collect();

      const paidAmount = charge.tenantPaidAmount;
      const remaining = charge.chargedAmount - paidAmount;

      outstandingCharges.push({
        ...charge,
        remainingAmount: remaining,
        paidAmount,
        utilityType: bill.utilityType,
        propertyName: property.name,
        tenantName: lease.tenantName,
      });
    }

    // Calculate summary statistics
    const totalOutstanding = outstandingCharges.reduce(
      (sum, charge) => sum + (charge.chargedAmount - (charge.tenantPaidAmount || 0)), 
      0
    );

    const byUtilityType: Record<string, number> = {};
    const byProperty: Record<string, number> = {};
    const byTenant: Record<string, number> = {};

    outstandingCharges.forEach(charge => {
      const remaining = charge.chargedAmount - (charge.tenantPaidAmount || 0);
      
      // By utility type
      byUtilityType[charge.utilityType] = (byUtilityType[charge.utilityType] || 0) + remaining;
      
      // By property
      byProperty[charge.propertyName] = (byProperty[charge.propertyName] || 0) + remaining;
      
      // By tenant
      byTenant[charge.tenantName] = (byTenant[charge.tenantName] || 0) + remaining;
    });

    // Find oldest unpaid charge
    const oldestCharge = outstandingCharges.length > 0 
      ? outstandingCharges[0] // Already sorted by date
      : null;

    return {
      totalOutstanding,
      totalCharges: outstandingCharges.length,
      byUtilityType,
      byProperty,
      byTenant,
      oldestCharge: oldestCharge ? {
        id: oldestCharge._id,
        tenantName: oldestCharge.tenantName,
        amount: oldestCharge.chargedAmount - (oldestCharge.tenantPaidAmount || 0),
        daysOld: Math.floor(
          (new Date().getTime() - new Date(oldestCharge.createdAt).getTime()) / 
          (1000 * 60 * 60 * 24)
        ),
      } : null,
    };
  },
});

// Get all charges for a user (for filtering purposes)
export const getAllChargesForUser = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Get all charges for the user's bills
    const allCharges = await ctx.db
      .query("tenantUtilityCharges")
      .collect();

    const userCharges = [];
    
    for (const charge of allCharges) {
      // Get the utility bill to check ownership
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Get lease information
      const lease = await ctx.db.get(charge.leaseId);
      if (!lease) continue;

      // Get payment information
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q: any) => q.eq("chargeId", charge._id))
        .collect();

      const paidAmount = charge.tenantPaidAmount;

      userCharges.push({
        ...charge,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        dueDate: bill.dueDate,
        paidAmount,
        remainingAmount: charge.chargedAmount - paidAmount,
        tenantName: lease.tenantName,
      });
    }

    return userCharges.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
});