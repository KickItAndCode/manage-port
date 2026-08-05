import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  requireUser,
  requireBillOwner,
  requireLeaseOwner,
  requireChargeOwner,
} from "./lib/auth";

/** Shape returned by calculateAllTenantCharges */
export interface CalculatedTenantCharge {
  _id: Id<"utilityCharges">;
  leaseId: Id<"leases">;
  utilityBillId: Id<"utilityBills">;
  tenantName: string;
  propertyName: string;
  unitIdentifier?: string;
  utilityType: string;
  billMonth: string;
  chargedAmount: number;
  responsibilityPercentage: number;
  totalBillAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: string;
  createdAt: string;
}

/**
 * Helper function to generate charges for a utility bill
 * This is the core logic that creates stored charges for each tenant
 * based on their lease utility responsibility percentages
 */
async function generateChargesForBillHelper(ctx: MutationCtx, billId: Id<"utilityBills">) {
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
 * Ensure a bill has stored charges (used for automatic generation)
 */
export async function ensureChargesForBill(
  ctx: MutationCtx,
  billId: Id<"utilityBills">
) {
  const existingCharge = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .first();

  if (existingCharge) {
    return [];
  }

  const bill = await ctx.db.get(billId);
  if (!bill || bill.noTenantCharges) {
    return [];
  }

  return await generateChargesForBillHelper(ctx, billId);
}

/**
 * Delete and regenerate charges for a bill so stored data matches bill state
 */
export async function rebuildChargesForBill(
  ctx: MutationCtx,
  billId: Id<"utilityBills">
) {
  await deleteChargesForBillHelper(ctx, billId);
  const bill = await ctx.db.get(billId);
  if (!bill || bill.noTenantCharges) {
    return [];
  }

  return await generateChargesForBillHelper(ctx, billId);
}

/**
 * Delete all charges for a bill (used when removing bills)
 */
export async function deleteChargesForBillInternal(
  ctx: MutationCtx,
  billId: Id<"utilityBills">
) {
  return await deleteChargesForBillHelper(ctx, billId);
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
    await requireBillOwner(ctx, args.billId);
    return await rebuildChargesForBill(ctx, args.billId);
  },
});

/**
 * Get charges for a specific bill
 */
export const getChargesForBill = query({
  args: { billId: v.id("utilityBills") },
  handler: async (ctx, args) => {
    await requireBillOwner(ctx, args.billId);
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
    await requireLeaseOwner(ctx, args.leaseId);
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Get all charges for user's leases with the specified status
    const userLeases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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
    await requireChargeOwner(ctx, args.chargeId);
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
async function deleteChargesForBillHelper(ctx: MutationCtx, billId: Id<"utilityBills">) {
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
    await requireBillOwner(ctx, args.billId);
    return await deleteChargesForBillHelper(ctx, args.billId);
  },
});

/**
 * Helper function to validate charge percentages for a bill
 */
async function validateChargePercentages(ctx: MutationCtx, billId: Id<"utilityBills">) {
  const charges = await ctx.db
    .query("utilityCharges")
    .withIndex("by_bill", (q) => q.eq("utilityBillId", billId))
    .collect();

  return charges.reduce((sum: number, charge: any) => sum + charge.responsibilityPercentage, 0);
}

/**
 * Helper function to validate no duplicate charges exist
 */
async function validateNoDuplicateCharges(ctx: MutationCtx, billId: Id<"utilityBills">) {
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
async function validateChargeAmounts(ctx: MutationCtx, billId: Id<"utilityBills">) {
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
    await requireChargeOwner(ctx, args.chargeId);
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
    await requireChargeOwner(ctx, args.chargeId);
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
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Get user's leases (filtered by property if specified)
    let leases;
    if (args.propertyId) {
      const propertyId = args.propertyId;
      leases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
    } else {
      leases = await ctx.db
        .query("leases")
        .withIndex("by_user", (q) => q.eq("userId", userId))
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
 * Get stored charges for a specific lease within a date range.
 * Used by TenantStatementGenerator to build statements from persisted data
 * instead of recalculating from bill totals × percentages.
 */
export const getChargesForStatement = query({
  args: {
    leaseId: v.id("leases"),
    startMonth: v.string(), // "YYYY-MM"
    endMonth: v.string(),   // "YYYY-MM"
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify ownership through the lease
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== userId) {
      return { charges: [], payments: [], totalCharged: 0, totalPaid: 0 };
    }

    // Get all stored charges for this lease
    const allCharges = await ctx.db
      .query("utilityCharges")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    // For each charge, get the bill details and filter by date range
    const chargesWithDetails = [];
    let totalCharged = 0;

    for (const charge of allCharges) {
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill) continue;

      // Filter by date range (billMonth is "YYYY-MM")
      if (bill.billMonth < args.startMonth || bill.billMonth > args.endMonth) continue;

      // Get payments for this charge
      const chargePayments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q) => q.eq("chargeId", charge._id))
        .collect();

      const paidAmount = chargePayments.reduce((sum, p) => sum + p.amountPaid, 0);

      totalCharged += charge.chargedAmount;

      chargesWithDetails.push({
        _id: charge._id,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        totalBillAmount: bill.totalAmount,
        chargedAmount: charge.chargedAmount,
        responsibilityPercentage: charge.responsibilityPercentage,
        paidAmount,
        remainingAmount: Math.max(0, charge.chargedAmount - paidAmount),
        status: charge.status,
        dueDate: charge.dueDate,
      });
    }

    // Get all payments for this lease in the period (for summary)
    const allPayments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    // Filter payments by date range
    const periodPayments = allPayments.filter(p => {
      const paymentMonth = p.paymentDate.slice(0, 7);
      return paymentMonth >= args.startMonth && paymentMonth <= args.endMonth;
    });

    const totalPaid = periodPayments.reduce((sum, p) => sum + p.amountPaid, 0);

    // Sort charges by bill month
    chargesWithDetails.sort((a, b) => a.billMonth.localeCompare(b.billMonth));

    return {
      charges: chargesWithDetails,
      payments: periodPayments.map(p => ({
        _id: p._id,
        amountPaid: p.amountPaid,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
      })),
      totalCharged,
      totalPaid,
    };
  },
});

/**
 * Get charge summary for a property (useful for dashboards)
 */
export const getPropertyChargeSummary = query({
  args: { 
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Get all bills for the property
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("userId"), userId))
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

/**
 * Backfill stored charges for bills that are missing them
 */
export const backfillUtilityCharges = mutation({
  args: {
    propertyId: v.optional(v.id("properties")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.propertyId) {
      const propertyId = args.propertyId;
      billsQuery = ctx.db
        .query("utilityBills")
        .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
        .filter((q) => q.eq(q.field("userId"), userId));
    }

    const bills = await billsQuery.collect();
    const targetBills = args.limit ? bills.slice(0, args.limit) : bills;

    let regeneratedBills = 0;
    let regeneratedCharges = 0;

    for (const bill of targetBills) {
      if (bill.noTenantCharges) {
        // Ensure old charges are removed if flag is set
        await deleteChargesForBillHelper(ctx, bill._id);
        continue;
      }

      const existing = await ctx.db
        .query("utilityCharges")
        .withIndex("by_bill", (q) => q.eq("utilityBillId", bill._id))
        .first();

      if (existing) {
        continue;
      }

      const generated = await generateChargesForBillHelper(ctx, bill._id);
      if (generated.length > 0) {
        regeneratedBills += 1;
        regeneratedCharges += generated.length;
      }
    }

    return {
      processedBills: targetBills.length,
      regeneratedBills,
      regeneratedCharges,
    };
  },
});