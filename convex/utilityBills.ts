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

  console.log("calculateTenantCharges - Debug info:", {
    billId,
    propertyId: bill.propertyId,
    utilityType: bill.utilityType,
    totalAmount: bill.totalAmount,
    activeLeasesCount: activeLeases.length,
    activeLeases: activeLeases.map((l: any) => ({
      id: l._id,
      tenantName: l.tenantName,
      status: l.status
    }))
  });

  if (activeLeases.length === 0) {
    console.log("calculateTenantCharges - No active leases found");
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

    console.log("calculateTenantCharges - Lease processing:", {
      leaseId: lease._id,
      tenantName: lease.tenantName,
      utilityType: bill.utilityType,
      settingFound: !!setting,
      responsibilityPercentage: setting?.responsibilityPercentage || 0
    });

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
      console.log("calculateTenantCharges - Charge created:", {
        leaseId: lease._id,
        chargedAmount: Math.round(chargedAmount * 100) / 100,
        responsibilityPercentage: setting.responsibilityPercentage
      });
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

  console.log("calculateTenantCharges - Final result:", {
    chargesCount: charges.length,
    totalTenantPercentage,
    charges: charges.map(c => ({
      leaseId: c.leaseId,
      tenantName: c.tenantName,
      chargedAmount: c.chargedAmount,
      responsibilityPercentage: c.responsibilityPercentage
    }))
  });

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
      landlordPaidUtilityCompany: false,
      createdAt: new Date().toISOString(),
    });

    // Note: Tenant charges are now calculated on-demand, not stored

    return billId;
  },
});

// Update a utility bill
export const updateUtilityBill = mutation({
  args: {
    id: v.id("utilityBills"),
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    utilityType: v.optional(v.string()),
    provider: v.optional(v.string()),
    billMonth: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    billDate: v.optional(v.string()),
    billingPeriod: v.optional(v.string()),
    landlordPaidUtilityCompany: v.optional(v.boolean()),
    landlordPaidDate: v.optional(v.string()),
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

    // Validate amount if being updated
    if (args.totalAmount !== undefined && args.totalAmount <= 0) {
      throw new Error("Bill amount must be greater than 0");
    }

    // Update other fields
    const updates: Partial<Doc<"utilityBills">> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.totalAmount !== undefined) updates.totalAmount = args.totalAmount;
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
    if (args.landlordPaidUtilityCompany !== undefined) updates.landlordPaidUtilityCompany = args.landlordPaidUtilityCompany;
    if (args.landlordPaidDate !== undefined) updates.landlordPaidDate = args.landlordPaidDate;
    if (args.billDocumentId !== undefined) updates.billDocumentId = args.billDocumentId;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Seed utility bills for testing/demo purposes
export const seedUtilityBills = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }

    // Get active leases for the property
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    // Get utility settings for all leases
    const leaseSettings = await Promise.all(
      activeLeases.map(async (lease) => {
        const settings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
          .collect();
        return { lease, settings };
      })
    );

    // Utility bill configurations with realistic seasonal variations
    const utilityConfigs = [
      {
        type: "Electric",
        provider: "City Electric Company",
        baseAmount: 120,
        variation: 0.3, // 30% variation
        seasonal: true, // Higher in summer/winter
        period: "monthly",
      },
      {
        type: "Water",
        provider: "Municipal Water Service",
        baseAmount: 45,
        variation: 0.2,
        seasonal: false,
        period: "monthly",
      },
      {
        type: "Gas",
        provider: "Natural Gas Co",
        baseAmount: 80,
        variation: 0.4,
        seasonal: true, // Higher in winter
        period: "monthly",
      },
      {
        type: "Trash",
        provider: "Waste Management",
        baseAmount: 35,
        variation: 0.05,
        seasonal: false,
        period: "monthly",
      },
      {
        type: "Sewer",
        provider: "City Sewer Department",
        baseAmount: 40,
        variation: 0.1,
        seasonal: false,
        period: "bi-monthly",
      },
      {
        type: "Internet",
        provider: "Fiber Internet Co",
        baseAmount: 65,
        variation: 0,
        seasonal: false,
        period: "monthly",
      },
    ];

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let createdBills = 0;
    let createdCharges = 0;

    // Generate bills for each month from January to current month
    for (let month = 0; month <= currentMonth; month++) {
      for (const config of utilityConfigs) {
        // Skip bi-monthly bills on odd months
        if (config.period === "bi-monthly" && month % 2 !== 0) continue;

        // Check if bill already exists for this month
        const billMonth = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
        const existingBill = await ctx.db
          .query("utilityBills")
          .withIndex("by_property_month", (q) => 
            q.eq("propertyId", args.propertyId)
             .eq("billMonth", billMonth)
          )
          .filter(q => q.eq(q.field("utilityType"), config.type))
          .first();

        if (existingBill) continue;

        // Calculate amount with seasonal variation
        let amount = config.baseAmount;
        
        if (config.seasonal) {
          if (config.type === "Electric") {
            // Higher in summer (June-August) and winter (December-February)
            if ([5, 6, 7].includes(month) || [11, 0, 1].includes(month)) {
              amount *= 1.3 + Math.random() * 0.2;
            }
          } else if (config.type === "Gas") {
            // Higher in winter months
            if ([11, 0, 1, 2].includes(month)) {
              amount *= 1.5 + Math.random() * 0.3;
            } else if ([5, 6, 7].includes(month)) {
              amount *= 0.6 + Math.random() * 0.2;
            }
          }
        }

        // Add random variation
        amount = amount * (1 + (Math.random() - 0.5) * config.variation);
        amount = Math.round(amount * 100) / 100;

        // Create the bill
        const billDate = new Date(currentYear, month, 1);
        const dueDate = new Date(currentYear, month + 1, 15);

        const billId = await ctx.db.insert("utilityBills", {
          userId: args.userId,
          propertyId: args.propertyId,
          utilityType: config.type,
          provider: config.provider,
          billMonth,
          totalAmount: amount,
          dueDate: dueDate.toISOString().split('T')[0],
          billDate: billDate.toISOString().split('T')[0],
          landlordPaidUtilityCompany: month < currentMonth - 1, // Mark older bills as paid
          landlordPaidDate: month < currentMonth - 1 
            ? new Date(currentYear, month + 1, Math.floor(Math.random() * 10) + 5).toISOString().split('T')[0]
            : undefined,
          notes: "Auto-generated for testing",
          createdAt: new Date().toISOString(),
        });

        createdBills++;

        // Note: Tenant charges are now calculated on-demand, not stored
        // The seedUtilityBills function now only creates utility bills
      }
    }

    return {
      success: true,
      message: `Created ${createdBills} utility bills for ${currentYear} YTD (tenant charges calculated on-demand)`,
      createdBills,
      createdCharges: 0, // No longer creating stored charges
    };
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

    // Note: No need to delete tenant charges as they're calculated on-demand
    
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
    landlordPaid: v.optional(v.boolean()),
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
    if (args.landlordPaid !== undefined) {
      bills = bills.filter(b => b.landlordPaidUtilityCompany === args.landlordPaid);
    }

    // Sort by bill month descending, then by utility type
    return bills.sort((a, b) => {
      const monthCompare = b.billMonth.localeCompare(a.billMonth);
      if (monthCompare !== 0) return monthCompare;
      return a.utilityType.localeCompare(b.utilityType);
    });
  },
});

// Get a utility bill with its calculated charges
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

    // Calculate charges on-demand using the same logic as utilityCharges.ts
    const charges = await calculateTenantCharges(ctx, args.billId, bill);

    // Convert to the format expected by the frontend
    const formattedCharges = await Promise.all(
      charges.map(async (charge) => {
        // Get payments for this lease and bill
        const payments = await ctx.db
          .query("utilityPayments")
          .withIndex("by_lease", (q: any) => q.eq("leaseId", charge.leaseId))
          .filter((q: any) => q.eq(q.field("utilityBillId"), bill._id))
          .collect();

        const paidAmount = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const remainingAmount = Math.max(0, charge.chargedAmount - paidAmount);

        // Get unit information if available
        let unitIdentifier;
        if (charge.unitId) {
          const unit = await ctx.db.get(charge.unitId);
          unitIdentifier = unit?.unitIdentifier;
        }

        return {
          ...charge,
          utilityBillId: bill._id,
          utilityType: bill.utilityType,
          billMonth: bill.billMonth,
          totalBillAmount: bill.totalAmount,
          dueDate: bill.dueDate,
          paidAmount,
          remainingAmount,
          unitIdentifier,
        };
      })
    );

    return {
      ...bill,
      charges: formattedCharges.sort((a, b) => {
        // Sort by unit identifier if available, otherwise by tenant name
        if (a.unitIdentifier && b.unitIdentifier) {
          return a.unitIdentifier.localeCompare(b.unitIdentifier);
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
      .withIndex("by_paid_status", (q: any) => q.eq("landlordPaidUtilityCompany", false))
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
          landlordPaidUtilityCompany: false,
          notes: billData.notes,
          createdAt: new Date().toISOString(),
        });

        // Note: Tenant charges are now calculated on-demand, not stored

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