import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to verify charge ownership
async function verifyChargeOwnership(
  ctx: any,
  chargeId: Id<"tenantUtilityCharges">,
  userId: string
): Promise<boolean> {
  const charge = await ctx.db.get(chargeId);
  if (!charge) return false;
  
  const bill = await ctx.db.get(charge.utilityBillId);
  if (!bill) return false;
  
  return bill.userId === userId;
}

// Mark a utility charge as paid
export const markUtilityPaid = mutation({
  args: {
    chargeId: v.id("tenantUtilityCharges"),
    isPaid: v.boolean(),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const isOwner = await verifyChargeOwnership(ctx, args.chargeId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to update this charge");
    }

    const charge = await ctx.db.get(args.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    // Update the charge
    const updates: Partial<Doc<"tenantUtilityCharges">> = {
      isPaid: args.isPaid,
      paidDate: args.isPaid ? new Date().toISOString() : undefined,
      notes: args.notes,
      updatedAt: new Date().toISOString(),
    };

    await ctx.db.patch(args.chargeId, updates);

    // Check if all charges for the bill are paid
    const allCharges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_bill", (q) => q.eq("utilityBillId", charge.utilityBillId))
      .collect();

    const allPaid = allCharges.every(c => 
      c._id === args.chargeId ? args.isPaid : c.isPaid
    );

    return { 
      success: true, 
      isPaid: args.isPaid,
      allChargesPaid: allPaid 
    };
  },
});

// Mark multiple charges as paid at once
export const markBulkPaid = mutation({
  args: {
    chargeIds: v.array(v.id("tenantUtilityCharges")),
    isPaid: v.boolean(),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];
    const errors = [];

    for (const chargeId of args.chargeIds) {
      try {
        // Verify ownership
        const isOwner = await verifyChargeOwnership(ctx, chargeId, args.userId);
        if (!isOwner) {
          errors.push({
            chargeId,
            error: "Permission denied",
          });
          continue;
        }

        const charge = await ctx.db.get(chargeId);
        if (!charge) {
          errors.push({
            chargeId,
            error: "Charge not found",
          });
          continue;
        }

        // Update the charge
        await ctx.db.patch(chargeId, {
          isPaid: args.isPaid,
          paidDate: args.isPaid ? new Date().toISOString() : undefined,
          notes: args.notes,
          updatedAt: new Date().toISOString(),
        });

        results.push({
          chargeId,
          success: true,
        });
      } catch (error: any) {
        errors.push({
          chargeId,
          error: error.message,
        });
      }
    }

    return {
      results,
      errors,
      success: errors.length === 0,
    };
  },
});

// This function can be removed since markUtilityPaid handles both marking paid and unpaid
// Keeping it for specific use case of reversing with a reason
export const reversePayment = mutation({
  args: {
    chargeId: v.id("tenantUtilityCharges"),
    reason: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const isOwner = await verifyChargeOwnership(ctx, args.chargeId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to reverse payments for this charge");
    }

    const charge = await ctx.db.get(args.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    if (!charge.isPaid) {
      throw new Error("This charge is not marked as paid");
    }

    // Reverse the payment
    await ctx.db.patch(args.chargeId, {
      isPaid: false,
      paidDate: undefined,
      notes: `Payment reversed: ${args.reason}. Previous notes: ${charge.notes || 'None'}`,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Get outstanding charges by tenant
export const getOutstandingCharges = query({
  args: {
    userId: v.string(),
    leaseId: v.optional(v.id("leases")),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    // Get all unpaid charges
    let charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_payment_status", (q) => q.eq("isPaid", false))
      .collect();

    // Filter by user's bills
    const validCharges = [];
    for (const charge of charges) {
      const bill = await ctx.db.get(charge.utilityBillId);
      if (bill && bill.userId === args.userId) {
        // Apply additional filters
        if (args.leaseId && charge.leaseId !== args.leaseId) continue;
        if (args.propertyId && bill.propertyId !== args.propertyId) continue;
        
        validCharges.push({
          ...charge,
          bill,
        });
      }
    }

    // Group by lease/tenant
    const byTenant: Record<string, typeof validCharges> = {};
    for (const charge of validCharges) {
      const key = `${charge.leaseId}_${charge.tenantName}`;
      if (!byTenant[key]) {
        byTenant[key] = [];
      }
      byTenant[key].push(charge);
    }

    // Calculate totals
    const tenantSummaries = await Promise.all(
      Object.entries(byTenant).map(async ([key, tenantCharges]) => {
        const firstCharge = tenantCharges[0];
        const lease = await ctx.db.get(firstCharge.leaseId);
        let unit = null;
        if (firstCharge.unitId) {
          unit = await ctx.db.get(firstCharge.unitId);
        }

        const totalOwed = tenantCharges.reduce((sum, c) => sum + c.chargedAmount, 0);
        const oldestDueDate = tenantCharges.reduce((oldest, c) => 
          !oldest || c.dueDate < oldest ? c.dueDate : oldest, 
          null as string | null
        );

        return {
          leaseId: firstCharge.leaseId,
          lease,
          unit,
          tenantName: firstCharge.tenantName,
          totalOwed: Math.round(totalOwed * 100) / 100,
          chargeCount: tenantCharges.length,
          oldestDueDate,
          charges: tenantCharges.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        };
      })
    );

    return tenantSummaries.sort((a, b) => {
      // Sort by unit if available, otherwise by tenant name
      if (a.unit && b.unit) {
        return a.unit.unitIdentifier.localeCompare(b.unit.unitIdentifier);
      }
      return a.tenantName.localeCompare(b.tenantName);
    });
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

    // Get payment details with charge and bill information
    const paymentDetails = [];
    
    for (const payment of payments) {
      // Get the charge
      const charge = await ctx.db.get(payment.chargeId);
      if (!charge) continue;

      // Get the bill
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
      let unit = null;
      if (charge.unitId) {
        unit = await ctx.db.get(charge.unitId);
      }

      paymentDetails.push({
        ...payment,
        tenantName: lease.tenantName,
        propertyName: property.name,
        utilityType: bill.utilityType,
        billMonth: bill.billMonth,
        chargedAmount: charge.chargedAmount,
        unitIdentifier: unit?.unitIdentifier,
      });
    }

    // Sort by payment date (newest first)
    return paymentDetails.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});

// Get utility balance summary
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

    // Get all charges for this lease
    const charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    // Get bill information for each charge
    const chargesWithBills = await Promise.all(
      charges.map(async (charge) => {
        const bill = await ctx.db.get(charge.utilityBillId);
        return { ...charge, bill };
      })
    );

    // Calculate totals
    const totalCharged = charges.reduce((sum, c) => sum + c.chargedAmount, 0);
    const totalPaid = charges.filter(c => c.isPaid).reduce((sum, c) => sum + c.chargedAmount, 0);
    const totalOwed = totalCharged - totalPaid;

    // Group by utility type
    const byUtilityType: Record<string, {
      charged: number;
      paid: number;
      owed: number;
      charges: typeof chargesWithBills;
    }> = {};

    for (const charge of chargesWithBills) {
      if (!charge.bill) continue;
      
      const type = charge.bill.utilityType;
      if (!byUtilityType[type]) {
        byUtilityType[type] = {
          charged: 0,
          paid: 0,
          owed: 0,
          charges: [],
        };
      }

      byUtilityType[type].charged += charge.chargedAmount;
      if (charge.isPaid) {
        byUtilityType[type].paid += charge.chargedAmount;
      } else {
        byUtilityType[type].owed += charge.chargedAmount;
      }
      byUtilityType[type].charges.push(charge);
    }

    return {
      lease,
      totalCharged: Math.round(totalCharged * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      byUtilityType,
      recentCharges: chargesWithBills
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    };
  },
});

// Generate tenant utility statement
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

    // Get all charges for this lease within date range
    const allCharges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    // Filter by date range based on bill date
    const charges = [];
    for (const charge of allCharges) {
      const bill = await ctx.db.get(charge.utilityBillId);
      if (bill && bill.billDate >= args.startDate && bill.billDate <= args.endDate) {
        charges.push({ ...charge, bill });
      }
    }

    // Sort by bill date and utility type
    charges.sort((a, b) => {
      const dateCompare = a.bill!.billDate.localeCompare(b.bill!.billDate);
      if (dateCompare !== 0) return dateCompare;
      return a.bill!.utilityType.localeCompare(b.bill!.utilityType);
    });

    // Calculate totals
    const totalCharged = charges.reduce((sum, c) => sum + c.chargedAmount, 0);
    const totalPaid = charges.filter(c => c.isPaid).reduce((sum, c) => sum + c.chargedAmount, 0);
    const totalOwed = totalCharged - totalPaid;

    return {
      lease,
      property,
      unit,
      statementPeriod: {
        startDate: args.startDate,
        endDate: args.endDate,
      },
      charges,
      summary: {
        totalCharged: Math.round(totalCharged * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        chargeCount: charges.length,
      },
      generatedAt: new Date().toISOString(),
    };
  },
});

// Record a payment for a utility charge
export const recordUtilityPayment = mutation({
  args: {
    chargeId: v.id("tenantUtilityCharges"),
    amountPaid: v.number(),
    paymentDate: v.string(),
    paymentMethod: v.string(),
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const isOwner = await verifyChargeOwnership(ctx, args.chargeId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to record payments for this charge");
    }

    const charge = await ctx.db.get(args.chargeId);
    if (!charge) {
      throw new Error("Charge not found");
    }

    // Validate payment amount
    if (args.amountPaid <= 0) {
      throw new Error("Payment amount must be greater than 0");
    }

    // Get existing payments for this charge
    const existingPayments = await ctx.db
      .query("utilityPayments")
      .withIndex("by_charge", (q: any) => q.eq("chargeId", args.chargeId))
      .collect();

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const remainingAmount = charge.chargedAmount - totalPaid;

    if (args.amountPaid > remainingAmount) {
      throw new Error(`Payment amount cannot exceed remaining balance of $${remainingAmount.toFixed(2)}`);
    }

    // Create payment record
    const paymentId = await ctx.db.insert("utilityPayments", {
      chargeId: args.chargeId,
      amountPaid: args.amountPaid,
      paymentDate: args.paymentDate,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    });

    // Update charge if fully paid
    const newTotalPaid = totalPaid + args.amountPaid;
    const isFullyPaid = newTotalPaid >= charge.chargedAmount;

    if (isFullyPaid) {
      await ctx.db.patch(args.chargeId, {
        isPaid: true,
        paidDate: args.paymentDate,
        updatedAt: new Date().toISOString(),
      });
    }

    // Check if all charges for the bill are paid
    const allCharges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_bill", (q: any) => q.eq("utilityBillId", charge.utilityBillId))
      .collect();

    let allChargesPaid = true;
    for (const c of allCharges) {
      if (c._id === args.chargeId) {
        if (!isFullyPaid) {
          allChargesPaid = false;
          break;
        }
      } else if (!c.isPaid) {
        allChargesPaid = false;
        break;
      }
    }

    // Update bill if all charges are paid
    if (allChargesPaid) {
      await ctx.db.patch(charge.utilityBillId, {
        isPaid: true,
        paidDate: args.paymentDate,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      paymentId,
      amountPaid: args.amountPaid,
      remainingBalance: Math.max(0, charge.chargedAmount - newTotalPaid),
      isFullyPaid,
      allChargesPaid,
    };
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
    // Get payment history by reusing the same logic
    let payments = await ctx.db
      .query("utilityPayments")
      .collect();

    // Get payment details with charge and bill information
    const paymentDetails = [];
    
    for (const payment of payments) {
      // Get the charge
      const charge = await ctx.db.get(payment.chargeId);
      if (!charge) continue;

      // Get the bill
      const bill = await ctx.db.get(charge.utilityBillId);
      if (!bill || bill.userId !== args.userId) continue;

      // Apply property filter if specified
      if (args.propertyId && bill.propertyId !== args.propertyId) continue;

      // Apply lease filter if specified
      if (args.leaseId && charge.leaseId !== args.leaseId) continue;

      // Get lease information
      const lease = await ctx.db.get(charge.leaseId);
      if (!lease) continue;

      paymentDetails.push({
        ...payment,
        amountPaid: payment.amountPaid,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
      });
    }

    const processedPayments = paymentDetails;

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

    // Get all charges for this lease
    const charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    if (charges.length === 0) return [];

    // Get all payments for these charges
    const allPayments = [];
    for (const charge of charges) {
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_charge", (q: any) => q.eq("chargeId", charge._id))
        .collect();

      // Get bill info for utility type
      const bill = await ctx.db.get(charge.utilityBillId);
      
      for (const payment of payments) {
        allPayments.push({
          ...payment,
          utilityType: bill?.utilityType || "Unknown",
          billMonth: bill?.billMonth || "Unknown",
          chargedAmount: charge.chargedAmount,
        });
      }
    }

    // Sort by payment date (newest first)
    return allPayments.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
  },
});