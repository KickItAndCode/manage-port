import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to verify property ownership
async function verifyPropertyOwnership(
  ctx: any,
  propertyId: Id<"properties">,
  userId: string
): Promise<boolean> {
  const property = await ctx.db.get(propertyId);
  return property !== null && property.userId === userId;
}

// Calculate tenant charges based on utility bill and lease settings
async function calculateTenantCharges(
  ctx: any,
  billId: Id<"utilityBills">,
  bill: Doc<"utilityBills">
): Promise<Array<{
  leaseId: Id<"leases">;
  unitId?: Id<"units">;
  tenantName: string;
  chargedAmount: number;
  responsibilityPercentage: number;
}>> {
  // Get all active leases for the property
  const activeLeases = await ctx.db
    .query("leases")
    .withIndex("by_property", (q: any) => q.eq("propertyId", bill.propertyId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  if (activeLeases.length === 0) {
    return [];
  }

  const charges = [];
  let totalTenantPercentage = 0;

  // Calculate charges for each lease based on utility settings
  for (const lease of activeLeases) {
    // Get utility setting for this lease and utility type
    const setting = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
      .filter((q: any) => q.eq(q.field("utilityType"), bill.utilityType))
      .first();

    if (setting && setting.responsibilityPercentage > 0) {
      const chargedAmount = (bill.totalAmount * setting.responsibilityPercentage) / 100;
      charges.push({
        leaseId: lease._id,
        unitId: lease.unitId,
        tenantName: lease.tenantName,
        chargedAmount: Math.round(chargedAmount * 100) / 100, // Round to cents
        responsibilityPercentage: setting.responsibilityPercentage,
      });
      totalTenantPercentage += setting.responsibilityPercentage;
    }
  }

  // Validate that tenant percentages don't exceed 100%
  if (totalTenantPercentage > 100) {
    throw new Error(
      `Utility percentages for ${bill.utilityType} sum to ${totalTenantPercentage}%, which exceeds 100%. Please update lease utility settings before adding bills.`
    );
  }

  // Allow partial tenant responsibility - owner covers the remaining percentage
  // This is valid: 50% tenant + 50% owner = 100%
  // No error needed if totalTenantPercentage < 100, as owner covers the difference

  return charges;
}

// Add a monthly utility bill
export const addUtilityBill = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    utilityType: v.string(),
    provider: v.string(),
    billMonth: v.string(), // YYYY-MM format
    totalAmount: v.number(),
    dueDate: v.string(),
    billDate: v.string(),
    billingPeriod: v.optional(v.string()),
    billDocumentId: v.optional(v.id("documents")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to add bills to this property");
    }

    // Validate amount
    if (args.totalAmount <= 0) {
      throw new Error("Bill amount must be greater than 0");
    }

    // Validate bill month format
    if (!args.billMonth.match(/^\d{4}-\d{2}$/)) {
      throw new Error("Bill month must be in YYYY-MM format");
    }

    // Check for duplicate bill
    const existingBill = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .filter((q) => 
        q.and(
          q.eq(q.field("utilityType"), args.utilityType),
          q.eq(q.field("billMonth"), args.billMonth)
        )
      )
      .first();

    if (existingBill) {
      throw new Error(`A ${args.utilityType} bill for ${args.billMonth} already exists`);
    }

    // Create the bill
    const billId = await ctx.db.insert("utilityBills", {
      ...args,
      isPaid: false,
      createdAt: new Date().toISOString(),
    });

    // Calculate and create tenant charges
    const bill = await ctx.db.get(billId);
    if (bill) {
      const charges = await calculateTenantCharges(ctx, billId, bill);
      
      // Create charge records
      for (const charge of charges) {
        await ctx.db.insert("tenantUtilityCharges", {
          leaseId: charge.leaseId,
          unitId: charge.unitId,
          utilityBillId: billId,
          tenantName: charge.tenantName,
          chargedAmount: charge.chargedAmount,
          responsibilityPercentage: charge.responsibilityPercentage,
          dueDate: args.dueDate,
          isPaid: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return billId;
  },
});

// Update a utility bill
export const updateUtilityBill = mutation({
  args: {
    id: v.id("utilityBills"),
    userId: v.string(),
    utilityType: v.optional(v.string()),
    provider: v.optional(v.string()),
    billMonth: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    billDate: v.optional(v.string()),
    billingPeriod: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    paidDate: v.optional(v.string()),
    billDocumentId: v.optional(v.id("documents")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, bill.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to update this bill");
    }

    // If amount is being updated, recalculate charges
    if (args.totalAmount !== undefined && args.totalAmount !== bill.totalAmount) {
      if (args.totalAmount <= 0) {
        throw new Error("Bill amount must be greater than 0");
      }

      // Update bill first
      await ctx.db.patch(args.id, { 
        totalAmount: args.totalAmount,
        updatedAt: new Date().toISOString(),
      });

      // Get updated bill
      const updatedBill = await ctx.db.get(args.id);
      if (updatedBill) {
        // Delete existing charges
        const existingCharges = await ctx.db
          .query("tenantUtilityCharges")
          .withIndex("by_bill", (q: any) => q.eq("utilityBillId", args.id))
          .collect();

        for (const charge of existingCharges) {
          await ctx.db.delete(charge._id);
        }

        // Recalculate and create new charges
        const charges = await calculateTenantCharges(ctx, args.id, updatedBill);
        
        for (const charge of charges) {
          await ctx.db.insert("tenantUtilityCharges", {
            leaseId: charge.leaseId,
            unitId: charge.unitId,
            utilityBillId: args.id,
            tenantName: charge.tenantName,
            chargedAmount: charge.chargedAmount,
            responsibilityPercentage: charge.responsibilityPercentage,
            dueDate: args.dueDate || bill.dueDate,
            isPaid: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Update other fields
    const updates: Partial<Doc<"utilityBills">> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.utilityType !== undefined) updates.utilityType = args.utilityType;
    if (args.provider !== undefined) updates.provider = args.provider;
    
    // If bill month is updated, auto-calculate bill date and due date
    if (args.billMonth !== undefined) {
      updates.billMonth = args.billMonth;
      
      // Set bill date to the first day of the month
      const billDate = new Date(`${args.billMonth}-01`);
      updates.billDate = billDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Set due date to one week after bill date
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + 7);
      updates.dueDate = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.billDate !== undefined) updates.billDate = args.billDate;
    if (args.billingPeriod !== undefined) updates.billingPeriod = args.billingPeriod;
    if (args.isPaid !== undefined) updates.isPaid = args.isPaid;
    if (args.paidDate !== undefined) updates.paidDate = args.paidDate;
    if (args.billDocumentId !== undefined) updates.billDocumentId = args.billDocumentId;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete a utility bill
export const deleteUtilityBill = mutation({
  args: {
    id: v.id("utilityBills"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.id);
    if (!bill) {
      throw new Error("Bill not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, bill.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to delete this bill");
    }

    // Delete associated tenant charges
    const charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_bill", (q: any) => q.eq("utilityBillId", args.id))
      .collect();

    for (const charge of charges) {
      await ctx.db.delete(charge._id);
    }

    // Delete the bill
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Get utility bills with filters
export const getUtilityBills = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    billMonth: v.optional(v.string()),
    utilityType: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    // Apply filters
    if (args.propertyId) {
      bills = bills.filter(b => b.propertyId === args.propertyId);
    }
    if (args.billMonth) {
      bills = bills.filter(b => b.billMonth === args.billMonth);
    }
    if (args.utilityType) {
      bills = bills.filter(b => b.utilityType === args.utilityType);
    }
    if (args.isPaid !== undefined) {
      bills = bills.filter(b => b.isPaid === args.isPaid);
    }

    // Sort by bill month descending, then by utility type
    return bills.sort((a, b) => {
      const monthCompare = b.billMonth.localeCompare(a.billMonth);
      if (monthCompare !== 0) return monthCompare;
      return a.utilityType.localeCompare(b.utilityType);
    });
  },
});

// Get a utility bill with its charges
export const getUtilityBillWithCharges = query({
  args: {
    billId: v.id("utilityBills"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill || bill.userId !== args.userId) {
      return null;
    }

    // Get all charges for this bill
    const charges = await ctx.db
      .query("tenantUtilityCharges")
      .withIndex("by_bill", (q: any) => q.eq("utilityBillId", args.billId))
      .collect();

    // Get unit information for each charge
    const chargesWithUnits = await Promise.all(
      charges.map(async (charge) => {
        let unit = null;
        if (charge.unitId) {
          unit = await ctx.db.get(charge.unitId);
        }
        return { ...charge, unit };
      })
    );

    return {
      ...bill,
      charges: chargesWithUnits.sort((a, b) => {
        // Sort by unit identifier if available, otherwise by tenant name
        if (a.unit && b.unit) {
          return a.unit.unitIdentifier.localeCompare(b.unit.unitIdentifier);
        }
        return a.tenantName.localeCompare(b.tenantName);
      }),
    };
  },
});

// Get unpaid bills summary
export const getUnpaidBills = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    let bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_paid_status", (q: any) => q.eq("isPaid", false))
      .collect();

    // Filter by user
    bills = bills.filter(b => b.userId === args.userId);

    // Filter by property if specified
    if (args.propertyId) {
      bills = bills.filter(b => b.propertyId === args.propertyId);
    }

    // Get property information
    const billsWithProperty = await Promise.all(
      bills.map(async (bill) => {
        const property = await ctx.db.get(bill.propertyId);
        return { ...bill, property };
      })
    );

    // Sort by due date
    return billsWithProperty.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

// Get bills by month for comparison
export const getBillsByMonth = query({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    startMonth: v.string(), // YYYY-MM
    endMonth: v.string(), // YYYY-MM
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      return [];
    }

    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .filter((q) => 
        q.and(
          q.gte(q.field("billMonth"), args.startMonth),
          q.lte(q.field("billMonth"), args.endMonth)
        )
      )
      .collect();

    // Group by month
    const billsByMonth: Record<string, Doc<"utilityBills">[]> = {};
    
    for (const bill of bills) {
      if (!billsByMonth[bill.billMonth]) {
        billsByMonth[bill.billMonth] = [];
      }
      billsByMonth[bill.billMonth].push(bill);
    }

    // Calculate totals by month
    const monthlyTotals = Object.entries(billsByMonth).map(([month, monthBills]) => {
      const totalAmount = monthBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
      const byType = monthBills.reduce((acc, bill) => {
        acc[bill.utilityType] = (acc[bill.utilityType] || 0) + bill.totalAmount;
        return acc;
      }, {} as Record<string, number>);

      return {
        month,
        totalAmount,
        billCount: monthBills.length,
        byType,
        bills: monthBills,
      };
    });

    return monthlyTotals.sort((a, b) => a.month.localeCompare(b.month));
  },
});

// Bulk add utility bills
export const bulkAddUtilityBills = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    billMonth: v.string(),
    bills: v.array(v.object({
      utilityType: v.string(),
      provider: v.string(),
      totalAmount: v.number(),
      dueDate: v.string(),
      billDate: v.string(),
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to add bills to this property");
    }

    // Validate bill month format
    if (!args.billMonth.match(/^\d{4}-\d{2}$/)) {
      throw new Error("Bill month must be in YYYY-MM format");
    }

    const createdBillIds = [];
    const errors = [];

    for (const billData of args.bills) {
      try {
        // Check for duplicate
        const existingBill = await ctx.db
          .query("utilityBills")
          .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
          .filter((q) => 
            q.and(
              q.eq(q.field("utilityType"), billData.utilityType),
              q.eq(q.field("billMonth"), args.billMonth)
            )
          )
          .first();

        if (existingBill) {
          errors.push({
            utilityType: billData.utilityType,
            error: `${billData.utilityType} bill for ${args.billMonth} already exists`,
          });
          continue;
        }

        // Create the bill
        const billId = await ctx.db.insert("utilityBills", {
          userId: args.userId,
          propertyId: args.propertyId,
          utilityType: billData.utilityType,
          provider: billData.provider,
          billMonth: args.billMonth,
          totalAmount: billData.totalAmount,
          dueDate: billData.dueDate,
          billDate: billData.billDate,
          isPaid: false,
          notes: billData.notes,
          createdAt: new Date().toISOString(),
        });

        // Calculate and create tenant charges
        const bill = await ctx.db.get(billId);
        if (bill) {
          const charges = await calculateTenantCharges(ctx, billId, bill);
          
          for (const charge of charges) {
            await ctx.db.insert("tenantUtilityCharges", {
              leaseId: charge.leaseId,
              unitId: charge.unitId,
              utilityBillId: billId,
              tenantName: charge.tenantName,
              chargedAmount: charge.chargedAmount,
              responsibilityPercentage: charge.responsibilityPercentage,
              dueDate: billData.dueDate,
              isPaid: false,
              createdAt: new Date().toISOString(),
            });
          }
        }

        createdBillIds.push(billId);
      } catch (error: any) {
        errors.push({
          utilityType: billData.utilityType,
          error: error.message,
        });
      }
    }

    return {
      createdBillIds,
      errors,
      success: errors.length === 0,
    };
  },
});

// Get utility bills for a property with optional date filtering
export const getUtilityBillsByProperty = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) return [];

    let billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId));

    // Apply date filtering if provided
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

    const bills = await billsQuery
      .order("desc")
      .collect();

    return bills.sort((a, b) => {
      // Sort by bill month desc, then by utility type
      const monthCompare = b.billMonth.localeCompare(a.billMonth);
      if (monthCompare !== 0) return monthCompare;
      return a.utilityType.localeCompare(b.utilityType);
    });
  },
});