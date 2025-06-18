import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper functions for charge management
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

  return charges;
}

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

// Types for aggregated data
export interface UtilityPageData {
  properties: Array<Doc<"properties"> & { monthlyRent: number }>;
  leases: Array<Doc<"leases"> & { unit?: Doc<"units"> }>;
  bills: Array<Doc<"utilityBills">>;
  charges: Array<{
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
  }>;
  stats: {
    totalBills: number;
    unpaidBills: number;
    totalAmount: number;
    unpaidAmount: number;
  };
}

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

    // AUTO-GENERATE TENANT CHARGES
    try {
      const chargeIds = await generateChargesForBillHelper(ctx, billId);
      console.log(`Generated ${chargeIds.length} charges for bill ${billId}`);
    } catch (error) {
      console.error(`Failed to generate charges for bill ${billId}:`, error);
      // Note: We don't throw here to avoid blocking bill creation
      // Charges can be generated manually later if needed
    }

    return billId;
  },
});

// Update a utility bill and regenerate charges
export const updateUtilityBillAndCharges = mutation({
  args: {
    id: v.id("utilityBills"),
    updates: v.object({
      totalAmount: v.optional(v.number()),
      dueDate: v.optional(v.string()),
      billDate: v.optional(v.string()),
      provider: v.optional(v.string()),
      billingPeriod: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify bill exists and get current data
    const existingBill = await ctx.db.get(args.id);
    if (!existingBill) {
      throw new Error("Bill not found");
    }

    // 1. Update the bill
    await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: new Date().toISOString(),
    });

    // 2. Delete existing charges for this bill
    try {
      const deletedChargeIds = await deleteChargesForBillHelper(ctx, args.id);
      console.log(`Deleted ${deletedChargeIds.length} existing charges for bill ${args.id}`);
    } catch (error) {
      console.error(`Failed to delete existing charges for bill ${args.id}:`, error);
    }

    // 3. Regenerate charges with new amounts
    try {
      const newChargeIds = await generateChargesForBillHelper(ctx, args.id);
      console.log(`Regenerated ${newChargeIds.length} charges for updated bill ${args.id}`);
    } catch (error) {
      console.error(`Failed to regenerate charges for bill ${args.id}:`, error);
      // Note: We don't throw here to avoid blocking bill updates
    }

    return args.id;
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

// Get real-time bill split preview calculation
export const getBillSplitPreview = query({
  args: {
    propertyId: v.id("properties"),
    utilityType: v.string(),
    totalAmount: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to access this property");
    }

    // Validate amount
    if (args.totalAmount <= 0) {
      return {
        charges: [],
        ownerPortion: 0,
        totalTenantPercentage: 0,
        isValid: false,
        message: "Total amount must be greater than 0",
      };
    }

    // Get all active leases for the property
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeLeases.length === 0) {
      return {
        charges: [],
        ownerPortion: args.totalAmount,
        totalTenantPercentage: 0,
        isValid: false,
        message: "No active leases found for this property",
      };
    }

    // Get all units for the property to identify vacant ones
    const allUnits = await ctx.db
      .query("units")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    const charges = [];
    let totalTenantPercentage = 0;
    let leasesWithSettings = 0;
    let vacantUnits = [];

    // Identify vacant units (units without active leases)
    const occupiedUnitIds = new Set(activeLeases.map(lease => lease.unitId).filter(Boolean));
    vacantUnits = allUnits.filter(unit => !occupiedUnitIds.has(unit._id));

    // Calculate charges for each lease based on utility settings
    for (const lease of activeLeases) {
      // Get utility setting for this lease and utility type
      const setting = await ctx.db
        .query("leaseUtilitySettings")
        .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
        .filter((q: any) => q.eq(q.field("utilityType"), args.utilityType))
        .first();

      // Get unit information if available
      let unitInfo = null;
      if (lease.unitId) {
        const unit = await ctx.db.get(lease.unitId);
        unitInfo = unit ? {
          unitIdentifier: unit.unitIdentifier,
          displayName: unit.displayName,
        } : null;
      }

      if (setting && setting.responsibilityPercentage > 0) {
        const chargedAmount = (args.totalAmount * setting.responsibilityPercentage) / 100;
        charges.push({
          leaseId: lease._id,
          unitId: lease.unitId,
          tenantName: lease.tenantName,
          chargedAmount: Math.round(chargedAmount * 100) / 100, // Round to cents
          responsibilityPercentage: setting.responsibilityPercentage,
          unit: unitInfo,
          hasUtilitySettings: true,
        });
        totalTenantPercentage += setting.responsibilityPercentage;
        leasesWithSettings++;
      } else {
        // Show lease with no settings
        charges.push({
          leaseId: lease._id,
          unitId: lease.unitId,
          tenantName: lease.tenantName,
          chargedAmount: 0,
          responsibilityPercentage: 0,
          unit: unitInfo,
          hasUtilitySettings: false,
        });
      }
    }

    // Calculate owner portion
    const ownerPortion = args.totalAmount - (args.totalAmount * totalTenantPercentage) / 100;

    // Determine validity and messages
    let isValid = true;
    let message = "";
    
    if (totalTenantPercentage > 100) {
      isValid = false;
      message = `Utility percentages sum to ${totalTenantPercentage}%, which exceeds 100%`;
    } else if (leasesWithSettings === 0) {
      isValid = false;
      message = `No utility responsibility settings found for ${args.utilityType}`;
    } else if (leasesWithSettings < activeLeases.length) {
      message = `${leasesWithSettings} of ${activeLeases.length} leases have ${args.utilityType} settings configured`;
    } else {
      message = "All leases have utility settings configured";
    }

    // Sort charges by unit identifier if available, otherwise by tenant name
    charges.sort((a, b) => {
      if (a.unit?.unitIdentifier && b.unit?.unitIdentifier) {
        return a.unit.unitIdentifier.localeCompare(b.unit.unitIdentifier);
      }
      return a.tenantName.localeCompare(b.tenantName);
    });

    return {
      charges,
      ownerPortion: Math.round(ownerPortion * 100) / 100,
      totalTenantPercentage,
      leasesWithSettings,
      totalLeases: activeLeases.length,
      vacantUnits: vacantUnits.map(unit => ({
        unitId: unit._id,
        unitIdentifier: unit.unitIdentifier,
        displayName: unit.displayName,
      })),
      totalUnits: allUnits.length,
      isValid,
      message,
    };
  },
});

// Helper function to calculate monthly rent from active leases
async function calculateMonthlyRentFromLeases(ctx: any, propertyId: string, userId: string): Promise<number> {
  const activeLeases = await ctx.db
    .query("leases")
    .filter((q: any) => 
      q.and(
        q.eq(q.field("propertyId"), propertyId),
        q.eq(q.field("userId"), userId),
        q.eq(q.field("status"), "active")
      )
    )
    .collect();

  return activeLeases.reduce((total: number, lease: any) => total + (lease.rent || 0), 0);
}

// Helper function to get bills with pre-calculated charges
async function getBillsWithCharges(
  ctx: any,
  userId: string,
  propertyId?: Id<"properties">,
  startMonth?: string,
  endMonth?: string
): Promise<{
  bills: Array<Doc<"utilityBills">>;
  charges: Array<{
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
  }>;
}> {
  // Get bills with optimized query
  let billsQuery = ctx.db
    .query("utilityBills")
    .withIndex("by_user", (q: any) => q.eq("userId", userId));

  if (propertyId && startMonth && endMonth) {
    billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_user_property_date", (q: any) => 
        q.eq("userId", userId).eq("propertyId", propertyId).gte("billMonth", startMonth).lte("billMonth", endMonth)
      );
  } else if (propertyId) {
    billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_property", (q: any) => q.eq("propertyId", propertyId))
      .filter((q: any) => q.eq(q.field("userId"), userId));
  } else if (startMonth && endMonth) {
    billsQuery = ctx.db
      .query("utilityBills")
      .withIndex("by_user_date_range", (q: any) => 
        q.eq("userId", userId).gte("billMonth", startMonth).lte("billMonth", endMonth)
      );
  }

  const bills = await billsQuery.collect();

  // Calculate charges for all bills efficiently
  const allCharges = [];
  
  for (const bill of bills) {
    const charges = await calculateChargesForBill(ctx, bill);
    allCharges.push(...charges);
  }

  return { bills, charges: allCharges };
}

// Helper function to calculate charges for a single bill (optimized)
async function calculateChargesForBill(
  ctx: any,
  bill: Doc<"utilityBills">
): Promise<Array<{
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

      // Get payments for this lease and bill using optimized index
      const payments = await ctx.db
        .query("utilityPayments")
        .withIndex("by_lease_bill", (q: any) => q.eq("leaseId", lease._id).eq("utilityBillId", bill._id))
        .collect();

      const paidAmount = payments.reduce((sum: number, payment: any) => sum + payment.amountPaid, 0);
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

// Main aggregated query for utility bills page
export const getUtilityPageData = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
    startMonth: v.optional(v.string()),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<UtilityPageData> => {
    // Get properties with calculated monthly rent
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const propertiesWithRent = await Promise.all(
      properties.map(async (property) => {
        const monthlyRent = await calculateMonthlyRentFromLeases(ctx, property._id, args.userId);
        return {
          ...property,
          monthlyRent
        };
      })
    );

    // Get active leases with unit information
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const leasesWithUnits = await Promise.all(
      leases.map(async (lease) => {
        let unit = undefined;
        if (lease.unitId) {
          unit = await ctx.db.get(lease.unitId);
        }
        return { ...lease, unit: unit || undefined };
      })
    );

    // Get bills and charges efficiently
    const { bills, charges } = await getBillsWithCharges(
      ctx,
      args.userId,
      args.propertyId,
      args.startMonth,
      args.endMonth
    );

    // Calculate aggregate stats
    const stats = {
      totalBills: bills.length,
      unpaidBills: bills.filter(b => !b.landlordPaidUtilityCompany).length,
      totalAmount: bills.reduce((sum, b) => sum + b.totalAmount, 0),
      unpaidAmount: bills.filter(b => !b.landlordPaidUtilityCompany).reduce((sum, b) => sum + b.totalAmount, 0),
    };

    return {
      properties: propertiesWithRent,
      leases: leasesWithUnits,
      bills: bills.sort((a, b) => {
        const monthCompare = b.billMonth.localeCompare(a.billMonth);
        if (monthCompare !== 0) return monthCompare;
        return a.utilityType.localeCompare(b.utilityType);
      }),
      charges: charges.sort((a, b) => b.billMonth.localeCompare(a.billMonth)),
      stats,
    };
  },
});