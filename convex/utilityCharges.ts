import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Helper function to generate charges for a utility bill
 * This is the core logic that creates stored charges for each tenant
 * based on their lease utility responsibility percentages
 */
async function generateChargesForBillHelper(ctx: any, billId: string) {
  // 1. Get the bill
  const bill = await ctx.db.get(billId);
  if (!bill) {
    throw new Error("Bill not found");
  }

  // 2. Get active leases for the property
  const activeLeases = await ctx.db
    .query("leases")
    .withIndex("by_property", (q) => q.eq("propertyId", bill.propertyId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();

  if (activeLeases.length === 0) {
    console.warn(`No active leases found for property ${bill.propertyId}`);
    return [];
  }

  const charges = [];

  // 3. For each active lease, calculate charge
  for (const lease of activeLeases) {
    const utilitySetting = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
      .filter((q) => q.eq(q.field("utilityType"), bill.utilityType))
      .first();

    if (utilitySetting && utilitySetting.responsibilityPercentage > 0) {
      const chargedAmount = (bill.totalAmount * utilitySetting.responsibilityPercentage) / 100;
      
      // Create the charge
      const chargeId = await ctx.db.insert("utilityCharges", {
        leaseId: lease._id,
        utilityBillId: billId,
        unitId: lease.unitId,
        tenantName: lease.tenantName,
        chargedAmount,
        responsibilityPercentage: utilitySetting.responsibilityPercentage,
        dueDate: bill.dueDate,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      charges.push(chargeId);
    }
  }

  // 4. Comprehensive validation
  if (charges.length > 0) {
    // Validate total percentages
    const totalPercentage = await validateChargePercentages(ctx, billId);
    if (totalPercentage > 100) {
      console.warn(`Total responsibility percentages exceed 100%: ${totalPercentage}% for bill ${billId}`);
    }

    // Validate no duplicate charges
    await validateNoDuplicateCharges(ctx, billId);

    // Validate charge amounts are reasonable
    await validateChargeAmounts(ctx, billId);
  }

  return charges;
}

/**
 * Generate charges for a utility bill (public mutation)
 * This wraps the helper function for external API access
 */
export const generateChargesForBill = mutation({
  args: { 
    billId: v.id("utilityBills") 
  },
  handler: async (ctx, args) => {
    return await generateChargesForBillHelper(ctx, args.billId);
  },
});

/**
 * Get charges for a specific bill
 */
export const getChargesForBill = query({
  args: { billId: v.id("utilityBills") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("utilityCharges")
      .withIndex("by_bill", (q) => q.eq("utilityBillId", args.billId))
      .collect();
  },
});

/**
 * Get outstanding charges for a tenant (lease)
 */
export const getOutstandingCharges = query({
  args: { leaseId: v.id("leases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("utilityCharges")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .filter((q) => q.neq(q.field("status"), "paid"))
      .collect();
  },
});

/**
 * Get charges by status (pending, paid, partial)
 */
export const getChargesByStatus = query({
  args: { 
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("partial")),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all charges for user's leases with the specified status
    const userLeases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const charges = [];
    for (const lease of userLeases) {
      const leaseCharges = await ctx.db
        .query("utilityCharges")
        .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
        .filter((q) => q.eq(q.field("status"), args.status))
        .collect();
      charges.push(...leaseCharges);
    }

    return charges;
  },
});

/**
 * Update charge status (used when payments are recorded)
 */
export const updateChargeStatus = mutation({
  args: {
    chargeId: v.id("utilityCharges"),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("partial")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chargeId, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    return args.chargeId;
  },
});

/**
 * Helper function to delete charges for a bill
 */
async function deleteChargesForBillHelper(ctx: any, billId: string) {
  const charges = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .collect();

  const deletedIds = [];
  for (const charge of charges) {
    await ctx.db.delete(charge._id);
    deletedIds.push(charge._id);
  }

  return deletedIds;
}

/**
 * Delete charges for a bill (public mutation)
 */
export const deleteChargesForBill = mutation({
  args: { billId: v.id("utilityBills") },
  handler: async (ctx, args) => {
    return await deleteChargesForBillHelper(ctx, args.billId);
  },
});

/**
 * Helper function to validate charge percentages for a bill
 */
async function validateChargePercentages(ctx: any, billId: string) {
  const charges = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .collect();

  return charges.reduce((sum: number, charge: any) => sum + charge.responsibilityPercentage, 0);
}

/**
 * Helper function to validate no duplicate charges exist
 */
async function validateNoDuplicateCharges(ctx: any, billId: string) {
  const charges = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .collect();

  const seenLeases = new Set();
  for (const charge of charges) {
    if (seenLeases.has(charge.leaseId)) {
      throw new Error(`Duplicate charge found for lease ${charge.leaseId} on bill ${billId}`);
    }
    seenLeases.add(charge.leaseId);
  }
}

/**
 * Helper function to validate charge amounts are reasonable
 */
async function validateChargeAmounts(ctx: any, billId: string) {
  const charges = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .collect();

  const bill = await ctx.db.get(billId);
  if (!bill) return;

  for (const charge of charges) {
    // Validate charge amount is not negative
    if (charge.chargedAmount < 0) {
      throw new Error(`Negative charge amount found: $${charge.chargedAmount} for tenant ${charge.tenantName}`);
    }

    // Validate charge amount doesn't exceed total bill
    if (charge.chargedAmount > bill.totalAmount) {
      throw new Error(`Charge amount $${charge.chargedAmount} exceeds total bill amount $${bill.totalAmount} for tenant ${charge.tenantName}`);
    }

    // Validate percentage is reasonable
    if (charge.responsibilityPercentage < 0 || charge.responsibilityPercentage > 100) {
      throw new Error(`Invalid responsibility percentage ${charge.responsibilityPercentage}% for tenant ${charge.tenantName}`);
    }
  }
}

/**
 * Get total paid amount for a specific charge
 */
export const getTotalPaidForCharge = query({
  args: { chargeId: v.id("utilityCharges") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_charge", (q) => q.eq("chargeId", args.chargeId))
      .collect();

    return payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
  },
});

/**
 * Get payment details for a charge
 */
export const getChargePayments = query({
  args: { chargeId: v.id("utilityCharges") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("utilityPayments")
      .withIndex("by_charge", (q) => q.eq("chargeId", args.chargeId))
      .order("desc")
      .collect();
  },
});

/**
 * Calculate all tenant charges (compatibility function for UI)
 * This replaces the old on-demand calculation with stored charges
 */
export const calculateAllTenantCharges = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Get user's leases (filtered by property if specified)
    let leases;
    if (args.propertyId) {
      leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
    } else {
      leases = await ctx.db
        .query("leases")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
    }

    const allCharges = [];

    for (const lease of leases) {
      // Get all charges for this lease
      const charges = await ctx.db
        .query("utilityCharges")
        .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
        .collect();

      for (const charge of charges) {
        // Get the bill details
        const bill = await ctx.db.get(charge.utilityBillId);
        if (!bill) continue;

        // Get property details
        const property = await ctx.db.get(lease.propertyId);
        const unit = charge.unitId ? await ctx.db.get(charge.unitId) : null;

        // Get total paid for this charge
        const payments = await ctx.db
          .query("utilityPayments")
          .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
          .collect();

        const paidAmount = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const remainingAmount = Math.max(0, charge.chargedAmount - paidAmount);

        // Format the charge data to match the expected interface
        allCharges.push({
          _id: charge._id,
          leaseId: charge.leaseId,
          utilityBillId: charge.utilityBillId,
          tenantName: charge.tenantName,
          propertyName: property?.name || "Unknown Property",
          unitIdentifier: unit?.unitIdentifier,
          utilityType: bill.utilityType,
          billMonth: bill.billMonth,
          chargedAmount: charge.chargedAmount,
          responsibilityPercentage: charge.responsibilityPercentage,
          totalBillAmount: bill.totalAmount,
          paidAmount,
          remainingAmount,
          dueDate: charge.dueDate,
          status: charge.status,
          createdAt: charge.createdAt,
        });
      }
    }

    return allCharges;
  },
});

/**
 * Get charge summary for a property (useful for dashboards)
 */
export const getPropertyChargeSummary = query({
  args: { 
    propertyId: v.id("properties"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all bills for the property
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    let totalCharges = 0;
    let pendingCharges = 0;
    let paidCharges = 0;
    let chargeCount = 0;

    for (const bill of bills) {
      const charges = await ctx.db
        .query("utilityCharges")
        .withIndex("by_bill", (q) => q.eq("utilityBillId", bill._id))
        .collect();

      for (const charge of charges) {
        totalCharges += charge.chargedAmount;
        chargeCount++;
        
        if (charge.status === "pending" || charge.status === "partial") {
          pendingCharges += charge.chargedAmount;
        } else if (charge.status === "paid") {
          paidCharges += charge.chargedAmount;
        }
      }
    }

    return {
      totalCharges,
      pendingCharges,
      paidCharges,
      chargeCount,
      averageCharge: chargeCount > 0 ? totalCharges / chargeCount : 0,
    };
  },
});