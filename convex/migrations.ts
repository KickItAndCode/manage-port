import { mutation, query } from "./_generated/server";
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
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const propertiesNeedingUnits = [];
    
    for (const property of properties) {
      // Check if property already has units
      const existingUnits = await ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .collect();
      
      if (existingUnits.length === 0 && !property.defaultUnitCreated) {
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

        // Mark property as having default unit created
        await ctx.db.patch(property._id, {
          defaultUnitCreated: true,
        });

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
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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

// Create default utility responsibilities for a property
export const createDefaultUtilityResponsibilities = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    utilityTypes: v.optional(v.array(v.string())), // Optional specific utilities
  },
  handler: async (ctx, args) => {
    const { userId, propertyId, utilityTypes = ["Electric", "Water", "Gas", "Sewer", "Trash"] } = args;

    // Get property units
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", propertyId))
      .collect();

    if (units.length === 0) {
      throw new Error("Property must have units before setting utility responsibilities");
    }

    const created = [];
    const errors = [];

    // Default: 100% tenant responsibility split equally among units
    const defaultPercentage = 100 / units.length;

    for (const utilityType of utilityTypes) {
      for (const unit of units) {
        try {
          // Check if responsibility already exists
          const existing = await ctx.db
            .query("unitUtilityResponsibilities")
            .filter((q) => 
              q.and(
                q.eq(q.field("propertyId"), propertyId),
                q.eq(q.field("unitId"), unit._id),
                q.eq(q.field("utilityType"), utilityType)
              )
            )
            .first();

          if (!existing) {
            const responsibilityId = await ctx.db.insert("unitUtilityResponsibilities", {
              propertyId,
              unitId: unit._id,
              utilityType,
              responsibilityPercentage: defaultPercentage,
              notes: "Default setting - 100% tenant responsibility",
              createdAt: new Date().toISOString(),
            });
            created.push({ unitId: unit._id, utilityType, responsibilityId });
          }
        } catch (error) {
          errors.push(`Error creating ${utilityType} responsibility for unit ${unit.unitIdentifier}: ${error}`);
        }
      }
    }

    return {
      created: created.length,
      errors,
      message: `Created ${created.length} utility responsibility settings`,
    };
  },
});