import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to verify bill ownership
async function verifyBillOwnership(
  ctx: any,
  utilityBillId: Id<"utilityBills">,
  userId: string
): Promise<boolean> {
  const bill = await ctx.db.get(utilityBillId);
  if (!bill) return false;
  
  return bill.userId === userId;
}

// These functions are now deprecated since we're using on-demand calculations
// Keeping them as placeholders for backward compatibility but they will return empty results

// Update charge status (linked to new charge system)
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

    // Update charge status using our new utilityCharges function
    const { updateChargeStatus } = await import("./utilityCharges");
    return await updateChargeStatus(ctx, {
      chargeId: args.chargeId,
      status: args.status,
    });
  },
});

// Mark multiple charges as paid at once - DEPRECATED
export const markBulkPaid = mutation({
  args: {
    chargeIds: v.array(v.string()), // Changed to string to avoid schema errors
    isPaid: v.boolean(),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    throw new Error("This function is deprecated. Use recordUtilityPayment instead.");
  },
});

// Reverse payment - DEPRECATED
export const reversePayment = mutation({
  args: {
    chargeId: v.string(), // Changed to string to avoid schema errors
    reason: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    throw new Error("This function is deprecated. Payments should be managed through utilityPayments table.");
  },
});

// Get outstanding charges by tenant - NOW USES ON-DEMAND CALCULATION
export const getOutstandingCharges = query({
  args: {
    userId: v.string(),
    leaseId: v.optional(v.id("leases")),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // This now redirects to the on-demand calculation
    // Import the calculateAllTenantCharges function logic here or call it
    throw new Error("This function is deprecated. Use calculateAllTenantCharges from utilityCharges instead.");
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
    // Get all payments for user's bills
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
      // Get the bill directly using utilityBillId
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

// Get utility balance summary - NOW USES ON-DEMAND CALCULATION
export const getUtilityBalance = query({
  args: {
    userId: v.string(),
    leaseId: v.id("leases"),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== args.userId) {
      return null;
    }

    // This function is deprecated and should use the on-demand calculation
    // For now, return a basic structure to avoid breaking existing code
    return {
      lease,
      totalCharged: 0,
      totalPaid: 0,
      totalOwed: 0,
      byUtilityType: {},
      recentCharges: [],
      _deprecated: true,
      _message: "This function is deprecated. Use calculateTenantChargesForLease from utilityCharges instead."
    };
  },
});

// Generate tenant utility statement - NOW USES ON-DEMAND CALCULATION
export const getTenantStatement = query({
  args: {
    userId: v.string(),
    leaseId: v.id("leases"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const lease = await ctx.db.get(args.leaseId);
    if (!lease || lease.userId !== args.userId) {
      return null;
    }

    // Get property and unit information
    const property = await ctx.db.get(lease.propertyId);
    let unit = null;
    if (lease.unitId) {
      unit = await ctx.db.get(lease.unitId);
    }

    // This function is deprecated and should use the on-demand calculation
    // For now, return a basic structure to avoid breaking existing code
    return {
      lease,
      property,
      unit,
      statementPeriod: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      charges: [],
      summary: {
        totalCharged: 0,
        totalPaid: 0,
        totalOwed: 0,
        chargeCount: 0,
      },
      generatedAt: new Date().toISOString(),
      _deprecated: true,
      _message: "This function is deprecated. Use calculateTenantChargesForLease from utilityCharges instead."
    };
  },
});

// Record a payment for a utility charge (updated for stored charges)
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
      .filter((q: any) => q.eq(q.field("chargeId"), args.chargeId))
      .collect();

    const totalPaid = existingPayments.reduce((sum: number, p: any) => sum + p.amountPaid, 0);
    const remainingAmount = charge.chargedAmount - totalPaid;

    if (args.amountPaid > remainingAmount) {
      throw new Error(`Payment amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`);
    }

    // Create payment record
    const paymentId = await ctx.db.insert("utilityPayments", {
      leaseId: charge.leaseId,
      utilityBillId: charge.utilityBillId,
      chargeId: args.chargeId,  // Link to specific charge
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

    // Update charge status
    const { updateChargeStatus } = await import("./utilityCharges");
    await updateChargeStatus(ctx, {
      chargeId: args.chargeId,
      status: newStatus,
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
    // Get payment history using the updated logic
    let payments = await ctx.db
      .query("utilityPayments")
      .collect();

    // Get payment details with bill information
    const paymentDetails = [];
    
    for (const payment of payments) {
      // Get the bill directly using utilityBillId
      const bill = await ctx.db.get(payment.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Apply lease filter if specified
      if (args.leaseId && payment.leaseId !== args.leaseId) continue;

      // Get lease information
      const lease = await ctx.db.get(payment.leaseId);
      if (!lease) continue;

      paymentDetails.push({
        ...payment,
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
        byMethod: {},
      };
    }

    // Calculate totals
    const totalCollected = processedPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const paymentCount = processedPayments.length;
    const averagePayment = totalCollected / paymentCount;

    // This month's payments
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthPayments = processedPayments.filter(p => 
      p.paymentDate.startsWith(currentMonth)
    );
    const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const thisMonthCount = thisMonthPayments.length;

    // Last payment
    const lastPayment = processedPayments[0]; // Already sorted by date
    const lastPaymentDate = lastPayment?.paymentDate || null;
    const lastPaymentAmount = lastPayment?.amountPaid || null;

    // By payment method
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

// Get payments by lease for statement generation
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

    // Get all payments for this lease directly
    const payments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", args.leaseId))
      .collect();

    if (payments.length === 0) return [];

    // Get bill info for each payment
    const allPayments = [];
    for (const payment of payments) {
      // Get bill info for utility type
      const bill = await ctx.db.get(payment.utilityBillId);
      
      allPayments.push({
        ...payment,
        utilityType: bill?.utilityType || "Unknown",
        billMonth: bill?.billMonth || "Unknown",
        // Note: chargedAmount would need to be calculated from lease utility settings + bill
        chargedAmount: payment.amountPaid, // Using payment amount as fallback
      });
    }

    // Sort by payment date (newest first)
    return allPayments.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});