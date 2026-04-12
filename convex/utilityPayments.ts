import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Update charge status directly
export const markUtilityPaid = mutation({
  args: {
    chargeId: v.id("utilityCharges"),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("partial")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the charge to verify ownership
    const charge = await ctx.db.get(args.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    // Verify ownership through the bill
    const bill = await ctx.db.get(charge.utilityBillId);
    if (!bill || bill.userId !== args.userId) {
      throw new Error("You do not have permission to update this charge");
    }

    await ctx.db.patch(args.chargeId, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
    return args.chargeId;
  },
});

// Get payment history with detailed payment records
export const getPaymentHistory = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all payments
    let payments = await ctx.db
      .query("utilityPayments")
      .collect();

    // Filter by date range if provided
    if (args.startDate) {
      payments = payments.filter(p => p.paymentDate >= args.startDate!);
    }
    if (args.endDate) {
      payments = payments.filter(p => p.paymentDate <= args.endDate!);
    }

    // Get payment details with bill information
    const paymentDetails = [];

    for (const payment of payments) {
      const bill = await ctx.db.get(payment.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Apply lease filter if specified
      if (args.leaseId && payment.leaseId !== args.leaseId) continue;

      // Get lease information
      const lease = await ctx.db.get(payment.leaseId);
      if (!lease) continue;

      // Get property information
      const property = await ctx.db.get(bill.propertyId);
      if (!property) continue;

      // Get unit information if available
      let unit = null;
      if (lease.unitId) {
        unit = await ctx.db.get(lease.unitId);
      }

      paymentDetails.push({
        ...payment,
        tenantName: lease.tenantName,
        propertyName: property.name,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        unitIdentifier: unit?.unitIdentifier,
      });
    }

    // Sort by payment date (newest first)
    return paymentDetails.sort((a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Record a payment for a utility charge
export const recordUtilityPayment = mutation({
  args: {
    chargeId: v.id("utilityCharges"),
    amountPaid: v.number(),
    paymentDate: v.string(),
    paymentMethod: v.string(),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the charge
    const charge = await ctx.db.get(args.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    // Verify ownership through the bill
    const bill = await ctx.db.get(charge.utilityBillId);
    if (!bill || bill.userId !== args.userId) {
      throw new Error("You do not have permission to record payments for this charge");
    }

    // Validate payment amount
    if (args.amountPaid <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    // Get existing payments for this charge
    const existingPayments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_charge", (q) => q.eq("chargeId", args.chargeId))
      .collect();

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const remainingAmount = charge.chargedAmount - totalPaid;

    if (args.amountPaid > remainingAmount) {
      throw new Error(`Payment amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`);
    }

    // Create payment record
    const paymentId = await ctx.db.insert("utilityPayments", {
      leaseId: charge.leaseId,
      utilityBillId: charge.utilityBillId,
      chargeId: args.chargeId,
      tenantName: charge.tenantName,
      amountPaid: args.amountPaid,
      paymentDate: args.paymentDate,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    });

    // Update charge status based on payment amount
    const newTotalPaid = totalPaid + args.amountPaid;
    let newStatus: "pending" | "paid" | "partial";

    if (newTotalPaid >= charge.chargedAmount) {
      newStatus = "paid";
    } else if (newTotalPaid > 0) {
      newStatus = "partial";
    } else {
      newStatus = "pending";
    }

    await ctx.db.patch(args.chargeId, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return paymentId;
  },
});

// Get payment summary statistics
export const getPaymentSummary = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db
      .query("utilityPayments")
      .collect();

    const paymentDetails = [];

    for (const payment of payments) {
      const bill = await ctx.db.get(payment.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      if (args.propertyId && bill.propertyId !== args.propertyId) continue;
      if (args.leaseId && payment.leaseId !== args.leaseId) continue;

      const lease = await ctx.db.get(payment.leaseId);
      if (!lease) continue;

      paymentDetails.push({
        amountPaid: payment.amountPaid,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      });
    }

    const processedPayments = paymentDetails.sort((a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );

    if (processedPayments.length === 0) {
      return {
        totalCollected: 0,
        paymentCount: 0,
        thisMonthTotal: 0,
        thisMonthCount: 0,
        averagePayment: 0,
        lastPaymentDate: null,
        lastPaymentAmount: null,
        byMethod: {} as Record<string, { total: number; count: number }>,
      };
    }

    const totalCollected = processedPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const paymentCount = processedPayments.length;
    const averagePayment = totalCollected / paymentCount;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPayments = processedPayments.filter(p =>
      p.paymentDate.startsWith(currentMonth)
    );
    const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const thisMonthCount = thisMonthPayments.length;

    const lastPayment = processedPayments[0];
    const lastPaymentDate = lastPayment?.paymentDate || null;
    const lastPaymentAmount = lastPayment?.amountPaid || null;

    const byMethod: Record<string, { total: number; count: number }> = {};
    processedPayments.forEach(payment => {
      if (!byMethod[payment.paymentMethod]) {
        byMethod[payment.paymentMethod] = { total: 0, count: 0 };
      }
      byMethod[payment.paymentMethod].total += payment.amountPaid;
      byMethod[payment.paymentMethod].count += 1;
    });

    return {
      totalCollected,
      paymentCount,
      thisMonthTotal,
      thisMonthCount,
      averagePayment,
      lastPaymentDate,
      lastPaymentAmount,
      byMethod,
    };
  },
});

// Get payments by lease with stored charge amounts
export const getPaymentsByLease = query({
  args: {
    leaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== args.userId) {
      return [];
    }

    // Get all payments for this lease
    const payments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    if (payments.length === 0) return [];

    const allPayments = [];
    for (const payment of payments) {
      // Get bill info for utility type
      const bill = await ctx.db.get(payment.utilityBillId);

      // Get stored charge amount if chargeId is available
      let chargedAmount = payment.amountPaid; // fallback
      if (payment.chargeId) {
        const charge = await ctx.db.get(payment.chargeId);
        if (charge) {
          chargedAmount = charge.chargedAmount;
        }
      }

      allPayments.push({
        ...payment,
        utilityType: bill?.utilityType || "Unknown",
        billMonth: bill?.billMonth || "Unknown",
        chargedAmount,
      });
    }

    // Sort by payment date (newest first)
    return allPayments.sort((a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});
