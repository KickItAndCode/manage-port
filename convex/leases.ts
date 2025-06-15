import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { UTILITY_TYPES } from "../src/lib/constants";

// Get a single lease by ID
export const getLease = query({
  args: { 
    id: v.id("leases"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      return null;
    }
    
    // Include unit information if available
    let unit = null;
    if (lease.unitId) {
      unit = await ctx.db.get(lease.unitId);
    }
    
    return { ...lease, unit };
  },
});

// Get all leases for a user (optionally filtered by property)
export const getLeases = query({
  args: { 
    userId: v.string(), 
    propertyId: v.optional(v.id("properties")) 
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    const leases = await q.collect();
    
    // Filter by property if specified
    let filteredLeases = leases;
    if (args.propertyId) {
      filteredLeases = leases.filter(l => l.propertyId === args.propertyId);
    }
    
    // Add unit information to each lease
    const leasesWithUnits = await Promise.all(
      filteredLeases.map(async (lease) => {
        let unit = null;
        if (lease.unitId) {
          unit = await ctx.db.get(lease.unitId);
        }
        return { ...lease, unit };
      })
    );
    
    return leasesWithUnits;
  },
});

// Get leases by property ID
export const getLeasesByProperty = query({
  args: { 
    propertyId: v.id("properties"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    // Filter by userId for security
    return leases.filter(l => l.userId === args.userId);
  },
});

// Get leases by unit ID
export const getLeasesByUnit = query({
  args: { 
    unitId: v.id("units"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    // Verify unit ownership
    const unit = await ctx.db.get(args.unitId);
    if (!unit) return [];
    
    const property = await ctx.db.get(unit.propertyId);
    if (!property || property.userId !== args.userId) return [];
    
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
      .collect();
    
    // Add unit information to each lease
    return leases.map(lease => ({ ...lease, unit }));
  },
});

// Get active leases
export const getActiveLeases = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const userLeases = leases.filter(l => l.userId === args.userId);
    
    // Add unit information to each lease
    const leasesWithUnits = await Promise.all(
      userLeases.map(async (lease) => {
        let unit = null;
        if (lease.unitId) {
          unit = await ctx.db.get(lease.unitId);
        }
        return { ...lease, unit };
      })
    );
    
    return leasesWithUnits;
  },
});

// Helper function to recalculate utility defaults for ALL active leases in a property
async function applyUtilityDefaults(ctx: any, leaseId: string, property: any, unitId?: string) {
  // Skip if property has no utility defaults
  if (!property.utilityDefaults || !property.utilityPreset) {
    return;
  }

  // Get ALL active leases for this property (including the new one)
  const activeLeases = await ctx.db
    .query("leases")
    .withIndex("by_property", (q: any) => q.eq("propertyId", property._id))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  if (activeLeases.length === 0) return;

  // Delete ALL existing utility settings for ALL active leases
  for (const lease of activeLeases) {
    const existingSettings = await ctx.db
      .query("leaseUtilitySettings")
      .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
      .collect();
    
    for (const setting of existingSettings) {
      await ctx.db.delete(setting._id);
    }
  }

  // Recalculate percentages for ALL active leases
  for (const lease of activeLeases) {
    let utilityPercentage = 0;

    if (property.utilityPreset === "owner-pays") {
      utilityPercentage = 0; // Owner pays all utilities
    } else if (property.utilityPreset === "tenant-pays") {
      // Equal split among ALL active leases
      utilityPercentage = Math.floor(100 / activeLeases.length);
      // Give remainder to first lease to ensure exactly 100%
      if (lease._id === activeLeases[0]._id) {
        utilityPercentage += 100 - (Math.floor(100 / activeLeases.length) * activeLeases.length);
      }
    } else if (property.utilityPreset === "custom") {
      // Find the specific unit default if unit-based lease
      if (lease.unitId && property.utilityDefaults.length > 0) {
        const unit = await ctx.db.get(lease.unitId);
        if (unit) {
          const unitDefault = property.utilityDefaults.find(
            (d: any) => d.unitIdentifier === unit.unitIdentifier
          );
          utilityPercentage = unitDefault ? unitDefault.percentage : 0;
        }
      } else if (property.utilityDefaults.length > 0) {
        // Use first available default for non-unit-based leases
        utilityPercentage = property.utilityDefaults[0].percentage;
      }
    }

    // Create utility settings for all utility types for this lease
    for (const utilityType of UTILITY_TYPES) {
      await ctx.db.insert("leaseUtilitySettings", {
        leaseId: lease._id,
        utilityType,
        responsibilityPercentage: utilityPercentage,
        notes: `Auto-applied from property wizard (${property.utilityPreset})`,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// Add a lease for a property (enforce only one active lease per property/unit)
export const addLease = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")), // Optional for backward compatibility
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    securityDeposit: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    // Verify unit if provided
    if (args.unitId) {
      const unit = await ctx.db.get(args.unitId);
      if (!unit || unit.propertyId !== args.propertyId) {
        throw new Error("Invalid unit for this property");
      }
    }
    
    // Validate payment day if provided
    if (args.paymentDay && (args.paymentDay < 1 || args.paymentDay > 31)) {
      throw new Error("Payment day must be between 1 and 31");
    }
    
    // Check for existing active lease if trying to add an active lease
    if (args.status === "active") {
      if (args.unitId) {
        // Check for active lease on the specific unit
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
          .filter(q => q.eq(q.field("status"), "active"))
          .collect();
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this unit.");
        }
      } else {
        // Check for active lease on the property (backward compatibility)
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .filter(q => q.eq(q.field("status"), "active"))
          .filter(q => q.eq(q.field("unitId"), undefined))
          .collect();
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this property.");
        }
      }
    }
    
    // Validate dates
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (end <= start) {
      throw new Error("End date must be after start date");
    }
    
    const lease = await ctx.db.insert("leases", {
      ...args,
      createdAt: new Date().toISOString(),
    });
    
    // Update unit status if unit-based lease
    if (args.unitId && args.status === "active") {
      await ctx.db.patch(args.unitId, { status: "occupied" });
    }
    
    // Create document record if lease document is provided
    if (args.leaseDocumentUrl) {
      await ctx.db.insert("documents", {
        userId: args.userId,
        storageId: args.leaseDocumentUrl,
        name: `${args.tenantName} - Lease Agreement`,
        type: "lease",
        propertyId: args.propertyId,
        leaseId: lease,
        fileSize: 0, // Will be updated when we get file info
        mimeType: "application/pdf", // Default assumption for lease documents
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: "Lease document uploaded during lease creation",
        tags: ["lease", "legal"],
      });
    }
    
    // Auto-apply property utility defaults for active leases
    if (args.status === "active") {
      await applyUtilityDefaults(ctx, lease, property, args.unitId);
    }
    
    return lease;
  },
});

// Update a lease
export const updateLease = mutation({
  args: {
    id: v.id("leases"),
    userId: v.string(),
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")), // Optional for backward compatibility
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    securityDeposit: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    // Validate payment day if provided
    if (args.paymentDay && (args.paymentDay < 1 || args.paymentDay > 31)) {
      throw new Error("Payment day must be between 1 and 31");
    }
    
    // Verify unit if provided
    if (args.unitId) {
      const unit = await ctx.db.get(args.unitId);
      if (!unit || unit.propertyId !== args.propertyId) {
        throw new Error("Invalid unit for this property");
      }
    }
    
    // Check for existing active lease if changing to active
    if (args.status === "active" && lease.status !== "active") {
      if (args.unitId) {
        // Check for active lease on the specific unit
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
          .filter(q => q.eq(q.field("status"), "active"))
          .filter(q => q.neq(q.field("_id"), args.id))
          .collect();
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this unit.");
        }
      } else {
        // Check for active lease on the property (backward compatibility)
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .filter(q => q.eq(q.field("status"), "active"))
          .filter(q => q.eq(q.field("unitId"), undefined))
          .filter(q => q.neq(q.field("_id"), args.id))
          .collect();
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this property.");
        }
      }
    }
    
    // Validate dates
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (end <= start) {
      throw new Error("End date must be after start date");
    }
    
    const { id, userId, ...updateData } = args;
    
    await ctx.db.patch(args.id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
    
    // Update unit status based on lease status changes
    if (args.unitId) {
      if (args.status === "active" && lease.status !== "active") {
        await ctx.db.patch(args.unitId, { status: "occupied" });
      } else if (args.status !== "active" && lease.status === "active") {
        await ctx.db.patch(args.unitId, { status: "available" });
      }
    }
    
    // Auto-apply property utility defaults when lease becomes active
    if (args.status === "active" && lease.status !== "active") {
      await applyUtilityDefaults(ctx, args.id, property, args.unitId);
    }
    
    // Update or create document record if lease document is provided
    if (args.leaseDocumentUrl) {
      const docs = await ctx.db
        .query("documents")
        .filter(q => q.eq(q.field("leaseId"), args.id))
        .collect();
      
      if (docs.length > 0) {
        await ctx.db.patch(docs[0]._id, {
          storageId: args.leaseDocumentUrl,
          propertyId: args.propertyId,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("documents", {
          userId: args.userId,
          storageId: args.leaseDocumentUrl,
          name: `Lease - ${args.tenantName}`,
          type: "lease",
          propertyId: args.propertyId,
          leaseId: args.id,
          fileSize: 0, // Will be updated when we get file info
          mimeType: "application/pdf", // Default assumption for lease documents
          uploadedAt: new Date().toISOString(),
        });
      }
    }
  },
});

// Delete a lease
export const deleteLease = mutation({
  args: { 
    id: v.id("leases"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    // Update unit status if this was an active lease
    if (lease.unitId && lease.status === "active") {
      await ctx.db.patch(lease.unitId, { status: "available" });
    }
    
    // Delete associated documents
    const docs = await ctx.db
      .query("documents")
      .filter(q => q.eq(q.field("leaseId"), args.id))
      .collect();
    
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

// Get lease statistics for a user
export const getLeaseStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const now = new Date();
    const activeLeases = leases.filter(l => l.status === "active");
    const expiredLeases = leases.filter(l => l.status === "expired");
    const pendingLeases = leases.filter(l => l.status === "pending");
    
    // Calculate total monthly income from active leases
    const monthlyIncome = activeLeases.reduce((sum, l) => sum + l.rent, 0);
    
    // Calculate total security deposits held
    const totalDeposits = activeLeases.reduce((sum, l) => sum + (l.securityDeposit || 0), 0);
    
    // Find leases expiring soon (within 60 days)
    const expiringSoon = activeLeases.filter(l => {
      const endDate = new Date(l.endDate);
      const daysUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 60;
    });
    
    return {
      totalLeases: leases.length,
      activeLeases: activeLeases.length,
      expiredLeases: expiredLeases.length,
      pendingLeases: pendingLeases.length,
      monthlyIncome,
      totalDeposits,
      expiringSoon: expiringSoon.length,
      leasesByProperty: {} as Record<string, number>,
    };
  },
});

// Automatically update lease status based on dates
export const updateLeaseStatuses = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const now = new Date();
    let updated = 0;
    
    for (const lease of leases) {
      const startDate = new Date(lease.startDate);
      const endDate = new Date(lease.endDate);
      let newStatus = lease.status;
      
      // Update pending to active if start date has passed
      if (lease.status === "pending" && startDate <= now) {
        // Check if there's already an active lease for this property
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", lease.propertyId))
          .filter(q => q.eq(q.field("status"), "active"))
          .filter(q => q.neq(q.field("_id"), lease._id))
          .collect();
        
        if (activeLeases.length === 0) {
          newStatus = "active";
        }
      }
      
      // Update active to expired if end date has passed
      if (lease.status === "active" && endDate < now) {
        newStatus = "expired";
      }
      
      // Update if status changed
      if (newStatus !== lease.status) {
        await ctx.db.patch(lease._id, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
        
        // Auto-apply utility defaults when lease becomes active
        if (newStatus === "active") {
          const property = await ctx.db.get(lease.propertyId);
          if (property) {
            await applyUtilityDefaults(ctx, lease._id, property, lease.unitId);
          }
        }
        
        updated++;
      }
    }
    
    return { updated };
  },
});

// Migration: Apply utility defaults to existing active leases without utility settings
export const applyDefaultsToExistingLeases = mutation({
  args: { 
    userId: v.string(),
    propertyId: v.optional(v.id("properties")) // Optional - if provided, only process this property
  },
  handler: async (ctx, args) => {
    // Get properties to process
    let properties;
    if (args.propertyId) {
      const property = await ctx.db.get(args.propertyId);
      if (!property || property.userId !== args.userId) {
        throw new Error("Property not found or access denied");
      }
      properties = [property];
    } else {
      properties = await ctx.db
        .query("properties")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
    }

    let leasesProcessed = 0;
    let settingsCreated = 0;

    for (const property of properties) {
      // Skip properties without utility defaults
      if (!property.utilityDefaults || !property.utilityPreset) {
        continue;
      }

      // Get active leases for this property
      const activeLeases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q: any) => q.eq("propertyId", property._id))
        .filter((q: any) => q.eq(q.field("status"), "active"))
        .collect();

      for (const lease of activeLeases) {
        // Check if this lease already has utility settings
        const existingSettings = await ctx.db
          .query("leaseUtilitySettings")
          .withIndex("by_lease", (q: any) => q.eq("leaseId", lease._id))
          .collect();

        // Only apply defaults if no settings exist
        if (existingSettings.length === 0) {
          await applyUtilityDefaults(ctx, lease._id, property, lease.unitId);
          leasesProcessed++;
          settingsCreated += UTILITY_TYPES.length; // One setting per utility type
        }
      }
    }

    return {
      success: true,
      message: `Applied utility defaults to ${leasesProcessed} existing leases`,
      leasesProcessed,
      settingsCreated,
      propertiesProcessed: properties.length,
    };
  },
});