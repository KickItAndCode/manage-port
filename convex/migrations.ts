import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Migration: Add default units to existing properties
export const migrateExistingPropertiesToHaveUnits = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { userId, dryRun = true } = args;
    
    // Get all properties for this user that don't have units
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const propertiesNeedingUnits = [];
    
    for (const property of properties) {
      // Check if property already has units
      const existingUnits = await ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      
      if (existingUnits.length === 0) {
        propertiesNeedingUnits.push(property);
      }
    }

    const summary = {
      totalProperties: properties.length,
      propertiesNeedingUnits: propertiesNeedingUnits.length,
      propertiesProcessed: 0,
      unitsCreated: 0,
      errors: [] as string[],
    };

    if (dryRun) {
      return {
        ...summary,
        message: `Dry run complete. ${propertiesNeedingUnits.length} properties would have default units created.`,
        propertiesNeedingUnits: propertiesNeedingUnits.map(p => ({
          id: p._id,
          name: p.name,
          address: p.address
        }))
      };
    }

    // Actually create the units if not a dry run
    for (const property of propertiesNeedingUnits) {
      try {
        // Create default "Main Unit"
        const unitId = await ctx.db.insert("units", {
          propertyId: property._id,
          unitIdentifier: "Main",
          displayName: "Main Unit",
          status: "available",
          isDefault: true,
          createdAt: new Date().toISOString(),
        });

        // Unit created successfully

        summary.propertiesProcessed++;
        summary.unitsCreated++;
      } catch (error) {
        summary.errors.push(`Error processing property ${property.name}: ${error}`);
      }
    }

    return {
      ...summary,
      message: `Migration complete. Created ${summary.unitsCreated} default units for ${summary.propertiesProcessed} properties.`
    };
  },
});

// Query to check migration status
export const checkMigrationStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    let propertiesWithUnits = 0;
    let propertiesWithoutUnits = 0;
    
    for (const property of properties) {
      const units = await ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      
      if (units.length > 0) {
        propertiesWithUnits++;
      } else {
        propertiesWithoutUnits++;
      }
    }

    return {
      totalProperties: properties.length,
      propertiesWithUnits,
      propertiesWithoutUnits,
      migrationComplete: propertiesWithoutUnits === 0,
    };
  },
});

// DEPRECATED: Legacy function for unit utility responsibilities
// This functionality has been replaced by lease-based utility settings
// Keeping as placeholder to avoid breaking existing references
export const createDefaultUtilityResponsibilities = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    utilityTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Legacy function - utility responsibilities are now managed through leases
    return {
      created: 0,
      errors: [],
      message: "Legacy function - utility responsibilities are now managed through lease settings",
    };
  },
});

// Migration: Update tenantUtilityCharges to use new unified payment fields
export const migrateTenantUtilityChargesPaymentFields = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { userId, dryRun = true } = args;
    
    // Get all utility bills for this user
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const billIds = bills.map(b => b._id);
    
    // Get all tenant charges for this user's bills
    const allCharges = await ctx.db
      .query("tenantUtilityCharges")
      .collect();
    
    const userCharges = allCharges.filter(charge => 
      billIds.includes(charge.utilityBillId)
    );

    // Filter charges that need migration (have old fields but not new ones)
    const chargesToMigrate = userCharges.filter(charge => {
      // Check if charge has old fields but missing new required fields
      const hasOldFields = 'isPaid' in charge || 'paidDate' in charge;
      const missingNewFields = !('fullyPaid' in charge) || !('tenantPaidAmount' in charge);
      return hasOldFields || missingNewFields;
    });

    const summary = {
      totalCharges: userCharges.length,
      chargesToMigrate: chargesToMigrate.length,
      chargesProcessed: 0,
      errors: [] as string[],
    };

    if (dryRun) {
      return {
        ...summary,
        message: `Dry run complete. ${chargesToMigrate.length} tenant charges would be migrated.`,
        sampleCharge: chargesToMigrate.length > 0 ? {
          id: chargesToMigrate[0]._id,
          tenantName: chargesToMigrate[0].tenantName,
          hasOldFields: {
            isPaid: 'isPaid' in chargesToMigrate[0],
            paidDate: 'paidDate' in chargesToMigrate[0]
          },
          missingNewFields: {
            fullyPaid: !('fullyPaid' in chargesToMigrate[0]),
            tenantPaidAmount: !('tenantPaidAmount' in chargesToMigrate[0]),
            lastPaymentDate: !('lastPaymentDate' in chargesToMigrate[0])
          }
        } : null
      };
    }

    // Actually migrate the charges if not a dry run
    for (const charge of chargesToMigrate) {
      try {
        const updates: any = {};
        
        // Migrate old isPaid to fullyPaid
        if ('isPaid' in charge && !('fullyPaid' in charge)) {
          updates.fullyPaid = (charge as any).isPaid;
        } else if (!('fullyPaid' in charge)) {
          updates.fullyPaid = false; // Default value
        }

        // Set tenantPaidAmount based on old isPaid status
        if (!('tenantPaidAmount' in charge)) {
          if ((charge as any).isPaid || updates.fullyPaid) {
            updates.tenantPaidAmount = (charge as any).chargedAmount;
          } else {
            updates.tenantPaidAmount = 0;
          }
        }

        // Migrate old paidDate to lastPaymentDate
        if ('paidDate' in charge && !('lastPaymentDate' in charge)) {
          updates.lastPaymentDate = (charge as any).paidDate;
        }

        // Set updatedAt
        updates.updatedAt = new Date().toISOString();

        await ctx.db.patch(charge._id, updates);
        summary.chargesProcessed++;
      } catch (error) {
        summary.errors.push(`Error migrating charge ${charge._id}: ${error}`);
      }
    }

    return {
      ...summary,
      message: `Migration complete. Updated ${summary.chargesProcessed} tenant charges with new payment fields.`
    };
  },
});

// Migration: Update utilityBills to use new unified payment fields
export const migrateUtilityBillsPaymentFields = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { userId, dryRun = true } = args;
    
    // Get all utility bills for this user
    const bills = await ctx.db
      .query("utilityBills")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter bills that need migration
    const billsToMigrate = bills.filter(bill => {
      const hasOldFields = 'isPaid' in bill || 'paidDate' in bill;
      const missingNewFields = !('landlordPaidUtilityCompany' in bill);
      return hasOldFields || missingNewFields;
    });

    const summary = {
      totalBills: bills.length,
      billsToMigrate: billsToMigrate.length,
      billsProcessed: 0,
      errors: [] as string[],
    };

    if (dryRun) {
      return {
        ...summary,
        message: `Dry run complete. ${billsToMigrate.length} utility bills would be migrated.`,
        sampleBill: billsToMigrate.length > 0 ? {
          id: billsToMigrate[0]._id,
          utilityType: billsToMigrate[0].utilityType,
          hasOldFields: {
            isPaid: 'isPaid' in billsToMigrate[0],
            paidDate: 'paidDate' in billsToMigrate[0]
          },
          missingNewFields: {
            landlordPaidUtilityCompany: !('landlordPaidUtilityCompany' in billsToMigrate[0]),
            landlordPaidDate: !('landlordPaidDate' in billsToMigrate[0])
          }
        } : null
      };
    }

    // Actually migrate the bills if not a dry run
    for (const bill of billsToMigrate) {
      try {
        const updates: any = {};
        
        // Migrate old isPaid to landlordPaidUtilityCompany
        if ('isPaid' in bill && !('landlordPaidUtilityCompany' in bill)) {
          updates.landlordPaidUtilityCompany = (bill as any).isPaid;
        } else if (!('landlordPaidUtilityCompany' in bill)) {
          updates.landlordPaidUtilityCompany = false; // Default value
        }

        // Migrate old paidDate to landlordPaidDate
        if ('paidDate' in bill && !('landlordPaidDate' in bill)) {
          updates.landlordPaidDate = (bill as any).paidDate;
        }

        // Set updatedAt
        updates.updatedAt = new Date().toISOString();

        await ctx.db.patch(bill._id, updates);
        summary.billsProcessed++;
      } catch (error) {
        summary.errors.push(`Error migrating bill ${bill._id}: ${error}`);
      }
    }

    return {
      ...summary,
      message: `Migration complete. Updated ${summary.billsProcessed} utility bills with new payment fields.`
    };
  },
});

// Combined migration for unified payment system
export const migrateToUnifiedPaymentSystem: any = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { userId, dryRun = true } = args;
    
    // TODO: Fix migration function calls
    // const billMigration = await ctx.runMutation(internal.migrations.migrateUtilityBillsPaymentFields, {
    //   userId,
    //   dryRun
    // });
    
    // const chargeMigration = await ctx.runMutation(internal.migrations.migrateTenantUtilityChargesPaymentFields, {
    //   userId,
    //   dryRun
    // });
    
    const billMigration = { totalBills: 0, billsToMigrate: 0, billsProcessed: 0, errors: [] } as any;
    const chargeMigration = { totalCharges: 0, chargesToMigrate: 0, chargesProcessed: 0, errors: [] } as any;

    return {
      billMigration,
      chargeMigration,
      summary: {
        totalItems: billMigration.totalBills + chargeMigration.totalCharges,
        itemsToMigrate: billMigration.billsToMigrate + chargeMigration.chargesToMigrate,
        itemsProcessed: billMigration.billsProcessed + chargeMigration.chargesProcessed,
        totalErrors: billMigration.errors.length + chargeMigration.errors.length,
      }
    };
  },
});