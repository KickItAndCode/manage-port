import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { UTILITY_TYPES } from "../src/lib/constants";

// Helper to verify lease ownership
async function verifyLeaseOwnership(
  ctx: any,
  leaseId: Id<"leases">,
  userId: string
): Promise<boolean> {
  const lease = await ctx.db.get(leaseId);
  return lease !== null && lease.userId === userId;
}

// Set utility responsibilities for a lease
export const setLeaseUtilities = mutation({
  args: {
    leaseId: v.id("leases"),
    utilities: v.array(v.object({
      utilityType: v.string(),
      responsibilityPercentage: v.number(),
      notes: v.optional(v.string()),
    })),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const isOwner = await verifyLeaseOwnership(ctx, args.leaseId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to modify this lease");
    }

    // Validate percentages (0-100)
    for (const utility of args.utilities) {
      if (utility.responsibilityPercentage < 0 || utility.responsibilityPercentage > 100) {
        throw new Error(`Invalid percentage for ${utility.utilityType}: must be between 0 and 100`);
      }
    }

    // Get the lease to validate property-wide allocations
    const lease = await ctx.db.get(args.leaseId);
    if (!lease) {
      throw new Error("Lease not found");
    }

    // Get all active leases for this property
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", lease.propertyId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // For each utility type, validate that total percentages across all leases don't exceed 100%
    for (const utility of args.utilities) {
      let totalPercentage = utility.responsibilityPercentage;
      
      // Add percentages from other active leases
      for (const otherLease of activeLeases) {
        if (otherLease._id === args.leaseId) continue; // Skip current lease
        
        const otherSettings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q) => q.eq("leaseId", otherLease._id))
          .filter((q) => q.eq(q.field("utilityType"), utility.utilityType))
          .first();
          
        if (otherSettings) {
          totalPercentage += otherSettings.responsibilityPercentage;
        }
      }
      
      if (totalPercentage > 100) {
        throw new Error(`Total allocation for ${utility.utilityType} would be ${totalPercentage}%, which exceeds 100%. Please adjust the percentages.`);
      }
    }

    // Delete existing settings for this lease
    const existingSettings = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    for (const setting of existingSettings) {
      await ctx.db.delete(setting._id);
    }

    // Create new settings
    const createdIds = [];
    for (const utility of args.utilities) {
      const id = await ctx.db.insert("leaseUtilitySettings", {
        leaseId: args.leaseId,
        utilityType: utility.utilityType,
        responsibilityPercentage: utility.responsibilityPercentage,
        notes: utility.notes,
        createdAt: new Date().toISOString(),
      });
      createdIds.push(id);
    }

    return createdIds;
  },
});

// Get utility settings for a lease
export const getLeaseUtilities = query({
  args: {
    leaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const isOwner = await verifyLeaseOwnership(ctx, args.leaseId, args.userId);
    if (!isOwner) return [];

    const settings = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .collect();

    return settings.sort((a, b) => a.utilityType.localeCompare(b.utilityType));
  },
});

// Copy utility settings from one lease to another
export const copyLeaseUtilities = mutation({
  args: {
    fromLeaseId: v.id("leases"),
    toLeaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify ownership of both leases
    const [fromOwner, toOwner] = await Promise.all([
      verifyLeaseOwnership(ctx, args.fromLeaseId, args.userId),
      verifyLeaseOwnership(ctx, args.toLeaseId, args.userId),
    ]);

    if (!fromOwner || !toOwner) {
      throw new Error("You do not have permission to access these leases");
    }

    // Get settings from source lease
    const sourceSettings = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.fromLeaseId))
      .collect();

    if (sourceSettings.length === 0) {
      throw new Error("No utility settings found in source lease");
    }

    // Delete existing settings in target lease
    const existingSettings = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.toLeaseId))
      .collect();

    for (const setting of existingSettings) {
      await ctx.db.delete(setting._id);
    }

    // Copy settings to target lease
    const createdIds = [];
    for (const setting of sourceSettings) {
      const id = await ctx.db.insert("leaseUtilitySettings", {
        leaseId: args.toLeaseId,
        utilityType: setting.utilityType,
        responsibilityPercentage: setting.responsibilityPercentage,
        notes: setting.notes,
        createdAt: new Date().toISOString(),
      });
      createdIds.push(id);
    }

    return createdIds;
  },
});

// Validate utility percentages for a property
export const validatePropertyUtilityPercentages = query({
  args: {
    propertyId: v.id("properties"),
    utilityType: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get property to verify ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      return { valid: false, message: "Property not found" };
    }

    // Get all active leases for the property
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeLeases.length === 0) {
      return { valid: true, totalPercentage: 0, message: "No active leases" };
    }

    // Get utility settings for all active leases
    let totalPercentage = 0;
    const leasePercentages = [];

    for (const lease of activeLeases) {
      const settings = await ctx.db
        .query("leaseUtilitySettings")
        .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
        .filter((q) => q.eq(q.field("utilityType"), args.utilityType))
        .first();

      if (settings) {
        totalPercentage += settings.responsibilityPercentage;
        leasePercentages.push({
          leaseId: lease._id,
          tenantName: lease.tenantName,
          percentage: settings.responsibilityPercentage,
          unitId: lease.unitId,
        });
      }
    }

    const valid = totalPercentage === 100;
    return {
      valid,
      totalPercentage,
      leasePercentages,
      message: valid 
        ? "Percentages are valid" 
        : `Total percentage is ${totalPercentage}%, should be 100%`,
    };
  },
});

// Get all properties with incomplete utility settings
export const getPropertiesWithIncompleteUtilities = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all user's properties
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const incompleteProperties = [];

    for (const property of properties) {
      // Skip single-family properties without units
      if (property.propertyType !== "multi-family") {
        continue;
      }

      // Get active leases
      const activeLeases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", property._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      if (activeLeases.length === 0) continue;

      // Check each utility type
      const incompleteUtilities = [];
      for (const utilityType of UTILITY_TYPES) {
        let totalPercentage = 0;

        for (const lease of activeLeases) {
          const setting = await ctx.db
            .query("leaseUtilitySettings")
            .withIndex("by_lease", (q) => q.eq("leaseId", lease._id))
            .filter((q) => q.eq(q.field("utilityType"), utilityType))
            .first();

          if (setting) {
            totalPercentage += setting.responsibilityPercentage;
          }
        }

        if (totalPercentage > 0 && totalPercentage !== 100) {
          incompleteUtilities.push({
            utilityType,
            totalPercentage,
            message: `Total is ${totalPercentage}%, should be 100%`,
          });
        }
      }

      if (incompleteUtilities.length > 0) {
        incompleteProperties.push({
          property,
          incompleteUtilities,
          activeLeaseCount: activeLeases.length,
        });
      }
    }

    return incompleteProperties;
  },
});

// Update a single utility setting
export const updateLeaseUtilitySetting = mutation({
  args: {
    leaseId: v.id("leases"),
    utilityType: v.string(),
    responsibilityPercentage: v.number(),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const isOwner = await verifyLeaseOwnership(ctx, args.leaseId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to modify this lease");
    }

    // Validate percentage
    if (args.responsibilityPercentage < 0 || args.responsibilityPercentage > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    // Find existing setting
    const existingSetting = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q) => q.eq("leaseId", args.leaseId))
      .filter((q) => q.eq(q.field("utilityType"), args.utilityType))
      .first();

    if (existingSetting) {
      // Update existing
      await ctx.db.patch(existingSetting._id, {
        responsibilityPercentage: args.responsibilityPercentage,
        notes: args.notes,
        updatedAt: new Date().toISOString(),
      });
      return existingSetting._id;
    } else {
      // Create new
      return await ctx.db.insert("leaseUtilitySettings", {
        leaseId: args.leaseId,
        utilityType: args.utilityType,
        responsibilityPercentage: args.responsibilityPercentage,
        notes: args.notes,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// Get all utility settings for a property (across all leases)
export const getUtilitySettingsByProperty = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) return [];

    // Get all leases for the property
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    if (leases.length === 0) return [];

    // Get utility settings for all leases
    const allSettings = [];
    for (const lease of leases) {
      const settings = await ctx.db
        .query("leaseUtilitySettings")
        .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
        .collect();
      
      // Add lease information to each setting
      for (const setting of settings) {
        allSettings.push({
          ...setting,
          tenantName: lease.tenantName,
          unitId: lease.unitId,
          leaseStatus: lease.status,
        });
      }
    }

    return allSettings.sort((a, b) => 
      a.utilityType.localeCompare(b.utilityType) || 
      a.tenantName.localeCompare(b.tenantName)
    );
  },
});

// Set utility responsibility for a specific lease and utility type
export const setUtilityResponsibilities = mutation({
  args: {
    leaseId: v.id("leases"),
    utilityType: v.string(),
    responsibilityPercentage: v.number(),
    userId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify lease ownership
    const isOwner = await verifyLeaseOwnership(ctx, args.leaseId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to modify this lease");
    }

    // Validate percentage (0-100)
    if (args.responsibilityPercentage < 0 || args.responsibilityPercentage > 100) {
      throw new Error(`Invalid percentage: must be between 0 and 100`);
    }

    // Check if setting already exists
    const existingSetting = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", args.leaseId))
      .filter((q: any) => q.eq(q.field("utilityType"), args.utilityType))
      .first();

    const settingData = {
      utilityType: args.utilityType,
      responsibilityPercentage: args.responsibilityPercentage,
      notes: args.notes,
      updatedAt: new Date().toISOString(),
    };

    if (existingSetting) {
      // Update existing setting
      await ctx.db.patch(existingSetting._id, settingData);
    } else {
      // Create new setting
      await ctx.db.insert("leaseUtilitySettings", {
        leaseId: args.leaseId,
        ...settingData,
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true };
  },
});

// Set utility responsibilities for all leases in a property atomically
export const setPropertyUtilityAllocations = mutation({
  args: {
    propertyId: v.id("properties"),
    allocations: v.array(v.object({
      leaseId: v.id("leases"),
      percentage: v.number(),
    })),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("You do not have permission to modify this property");
    }

    // Validate all allocations and calculate total
    let totalPercentage = 0;
    for (const allocation of args.allocations) {
      if (allocation.percentage < 0 || allocation.percentage > 100) {
        throw new Error(`Invalid percentage: must be between 0 and 100`);
      }
      
      // Verify lease ownership and that it belongs to this property
      const lease = await ctx.db.get(allocation.leaseId);
      if (!lease || lease.userId !== args.userId || lease.propertyId !== args.propertyId) {
        throw new Error("Invalid lease for this property");
      }
      
      totalPercentage += allocation.percentage;
    }

    // Allow under-allocation but not over-allocation
    if (totalPercentage > 100) {
      throw new Error(`Total allocation is ${totalPercentage}%, which exceeds 100%. Please adjust the percentages.`);
    }

    // Get active leases for the property to verify all are accounted for
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Verify all active leases are included in allocations
    const allocationLeaseIds = new Set(args.allocations.map(a => a.leaseId));
    for (const lease of activeLeases) {
      if (!allocationLeaseIds.has(lease._id)) {
        throw new Error(`Missing allocation for lease: ${lease.tenantName}`);
      }
    }

    // Delete all existing settings for these leases
    for (const allocation of args.allocations) {
      const existingSettings = await ctx.db
        .query("leaseUtilitySettings")
        .withIndex("by_lease", (q) => q.eq("leaseId", allocation.leaseId))
        .collect();

      for (const setting of existingSettings) {
        await ctx.db.delete(setting._id);
      }
    }

    // Create new settings for all utility types and all leases
    const createdIds = [];
    for (const allocation of args.allocations) {
      for (const utilityType of UTILITY_TYPES) {
        const id = await ctx.db.insert("leaseUtilitySettings", {
          leaseId: allocation.leaseId,
          utilityType,
          responsibilityPercentage: allocation.percentage,
          createdAt: new Date().toISOString(),
        });
        createdIds.push(id);
      }
    }

    return {
      success: true,
      totalPercentage,
      ownerPercentage: 100 - totalPercentage,
      createdSettings: createdIds.length,
    };
  },
});

// Apply property utility defaults to existing leases
export const applyPropertyUtilityDefaults = mutation({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Property not found or access denied");
    }

    // Check if property has utility defaults
    if (!property.utilityDefaults || !property.utilityPreset) {
      throw new Error("Property has no utility defaults to apply");
    }

    // Get all active leases for this property
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    if (leases.length === 0) {
      return {
        success: true,
        message: "No active leases found to apply defaults to",
        leasesProcessed: 0,
      };
    }

    // Get all units for mapping
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q: any) => q.eq("propertyId", args.propertyId))
      .collect();

    let leasesProcessed = 0;
    let settingsCreated = 0;

    for (const lease of leases) {
      // Find the utility default for this lease's unit
      let unitDefault = null;
      
      if (lease.unitId) {
        const unit = units.find(u => u._id === lease.unitId);
        if (unit) {
          unitDefault = property.utilityDefaults.find(d => d.unitIdentifier === unit.unitIdentifier);
        }
      }

      // If no specific unit default found, use first available or determine by preset
      if (!unitDefault && property.utilityDefaults.length > 0) {
        if (property.utilityPreset === "owner-pays") {
          unitDefault = { unitIdentifier: "", unitName: "", percentage: 0 };
        } else if (property.utilityPreset === "tenant-pays") {
          // For tenant-pays, split equally among all leases
          const tenantPercentage = Math.round(100 / leases.length);
          unitDefault = { unitIdentifier: "", unitName: "", percentage: tenantPercentage };
        } else {
          // Use first available default for custom
          unitDefault = property.utilityDefaults[0];
        }
      }

      if (unitDefault) {
        // Check if utility settings already exist for this lease
        const existingSettings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
          .collect();

        // Only create settings if none exist
        if (existingSettings.length === 0) {
          // Create utility settings for all utility types
          for (const utilityType of UTILITY_TYPES) {
            await ctx.db.insert("leaseUtilitySettings", {
              leaseId: lease._id,
              utilityType,
              responsibilityPercentage: unitDefault.percentage,
              notes: `Applied from property wizard defaults (${property.utilityPreset})`,
              createdAt: new Date().toISOString(),
            });
            settingsCreated++;
          }
          leasesProcessed++;
        }
      }
    }

    return {
      success: true,
      message: `Applied utility defaults to ${leasesProcessed} leases`,
      leasesProcessed,
      settingsCreated,
      propertyPreset: property.utilityPreset,
    };
  },
});