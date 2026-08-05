import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { UTILITY_TYPES } from "../src/lib/constants";
import { createNotification, NOTIFICATION_TYPES } from "./notifications";
import { requireUser } from "./lib/auth";
import { filterActiveLeases, getLeaseStatus } from "./lib/leaseStatus";

// Helper function to compute days until expiration
function getDaysUntilExpiry(endDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}


// Get a single lease by ID
export const getLease = query({
  args: { 
    id: v.id("leases"), 
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) {
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
    propertyId: v.optional(v.id("properties")),
    limit: v.optional(v.number()), // Number of leases to return
    offset: v.optional(v.number()), // Number of leases to skip
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let q = ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", userId));
    
    const leases = await q.collect();
    
    // Filter by property if specified
    let filteredLeases = leases;
    if (args.propertyId) {
      filteredLeases = leases.filter(l => l.propertyId === args.propertyId);
    }
    
    // Sort by start date (newest first)
    filteredLeases.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50; // Default to 50 if not specified
    
    const paginatedLeases = filteredLeases.slice(offset, offset + limit);
    
    // Add unit information to each lease
    const leasesWithUnits = await Promise.all(
      paginatedLeases.map(async (lease) => {
        let unit = null;
        if (lease.unitId) {
          unit = await ctx.db.get(lease.unitId);
        }
        return { ...lease, unit };
      })
    );
    
    return {
      leases: leasesWithUnits,
      total: filteredLeases.length,
      hasMore: offset + limit < filteredLeases.length,
    };
  },
});

// Get leases by property ID
export const getLeasesByProperty = query({
  args: { 
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    // Filter by userId for security
    return leases.filter(l => l.userId === userId);
  },
});

// Get leases by unit ID
export const getLeasesByUnit = query({
  args: { 
    unitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify unit ownership
    const unit = await ctx.db.get(args.unitId);
    if (!unit) return [];
    
    const property = await ctx.db.get(unit.propertyId);
    if (!property || property.userId !== userId) return [];
    
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
  args: {},
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const userLeases = leases.filter(l => l.userId === userId);
    
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
  const allLeases = await ctx.db
    .query("leases")
    .withIndex("by_property", (q: any) => q.eq("propertyId", property._id))
    .collect();
  
  // Filter to only active leases based on computed status
  const activeLeases = allLeases.filter((lease: any) => {
    const status = getLeaseStatus(lease.startDate, lease.endDate);
    return status === "active";
  });

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
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")), // Optional for backward compatibility
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    securityDeposit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("expired"), v.literal("pending"))),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== userId) {
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
    
    // Compute status from dates if not provided
    const computedStatus = args.status || getLeaseStatus(args.startDate, args.endDate);
    
    // Check for existing active lease if trying to add an active lease
    if (computedStatus === "active") {
      if (args.unitId) {
        // Check for active lease on the specific unit
        const activeLeases = filterActiveLeases(await ctx.db
          .query("leases")
          .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
          .collect());
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this unit.");
        }
      } else {
        // Check for active lease on the property (backward compatibility)
        const activeLeases = filterActiveLeases(await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .filter(q => q.eq(q.field("unitId"), undefined))
          .collect());
        
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
      userId,
      status: computedStatus, // Use computed status
      createdAt: new Date().toISOString(),
    });
    
    // Update unit status if unit-based lease
    if (args.unitId && computedStatus === "active") {
      await ctx.db.patch(args.unitId, { status: "occupied" });
    }
    
    // Create document record if lease document is provided
    if (args.leaseDocumentUrl) {
      await ctx.db.insert("documents", {
        userId,
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
    if (computedStatus === "active") {
      await applyUtilityDefaults(ctx, lease, property, args.unitId);
    }
    
    return lease;
  },
});

// Update a lease
export const updateLease = mutation({
  args: {
    id: v.id("leases"),
    propertyId: v.id("properties"),
    unitId: v.optional(v.id("units")), // Optional for backward compatibility
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    securityDeposit: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("expired"), v.literal("pending"))),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== userId) {
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
    
    // Compute status from dates if not provided
    const computedStatus = args.status || getLeaseStatus(args.startDate, args.endDate);
    
    // Check for existing active lease if changing to active
    if (computedStatus === "active" && getLeaseStatus(lease.startDate, lease.endDate) !== "active") {
      if (args.unitId) {
        // Check for active lease on the specific unit
        const activeLeases = filterActiveLeases(await ctx.db
          .query("leases")
          .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
          .filter(q => q.neq(q.field("_id"), args.id))
          .collect());
        
        if (activeLeases.length > 0) {
          throw new Error("There is already an active lease for this unit.");
        }
      } else {
        // Check for active lease on the property (backward compatibility)
        const activeLeases = filterActiveLeases(await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
          .filter(q => q.eq(q.field("unitId"), undefined))
          .filter(q => q.neq(q.field("_id"), args.id))
          .collect());
        
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
    
    const { id, ...updateData } = args;

    await ctx.db.patch(args.id, {
      ...updateData,
      status: computedStatus, // Use computed status
      updatedAt: new Date().toISOString(),
    });
    
    // Update unit status based on lease status changes
    if (args.unitId) {
      if (computedStatus === "active" && getLeaseStatus(lease.startDate, lease.endDate) !== "active") {
        await ctx.db.patch(args.unitId, { status: "occupied" });
      } else if (computedStatus !== "active" && getLeaseStatus(lease.startDate, lease.endDate) === "active") {
        await ctx.db.patch(args.unitId, { status: "available" });
      }
    }
    
    // Auto-apply property utility defaults when lease becomes active
    if (computedStatus === "active" && getLeaseStatus(lease.startDate, lease.endDate) !== "active") {
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
          userId,
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Update unit status if this was an active lease
    if (lease.unitId && getLeaseStatus(lease.startDate, lease.endDate) === "active") {
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
  args: {},
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const now = new Date();
    const byStatus = (want: string) =>
      leases.filter((l) => getLeaseStatus(l.startDate, l.endDate) === want);
    const activeLeases = byStatus("active");
    const expiredLeases = byStatus("expired");
    const pendingLeases = byStatus("pending");
    
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


// Generate notifications for expiring leases
// This mutation creates notifications for leases expiring within 60 days
export const generateLeaseExpirationNotifications = mutation({
  args: {
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let createdCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDays = 60; // Notify if expiring within 60 days

    // Get all active leases for the user
    const activeLeases = filterActiveLeases(await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect());

    for (const lease of activeLeases) {
      const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
      
      // Only create notifications for leases expiring within the warning period
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= warningDays) {
        const property = await ctx.db.get(lease.propertyId);
        const propertyName = property?.name || "Unknown Property";
        const unit = lease.unitId ? await ctx.db.get(lease.unitId) : null;
        const unitName = unit?.displayName || unit?.unitIdentifier || "";

        // Determine severity based on days until expiration
        let severity: "info" | "warning" | "error" = "info";
        if (daysUntilExpiry <= 7) {
          severity = "error";
        } else if (daysUntilExpiry <= 30) {
          severity = "warning";
        }

        const title =
          daysUntilExpiry === 0
            ? "Lease Expires Today"
            : daysUntilExpiry === 1
            ? "Lease Expires Tomorrow"
            : `Lease Expires in ${daysUntilExpiry} Days`;

        const location = unitName
          ? `${propertyName} - ${unitName}`
          : propertyName;

        try {
          await createNotification(ctx, {
            userId,
            type: NOTIFICATION_TYPES.LEASE_EXPIRATION,
            title,
            message: `${lease.tenantName}'s lease at ${location} expires ${daysUntilExpiry === 0 ? "today" : daysUntilExpiry === 1 ? "tomorrow" : `in ${daysUntilExpiry} days`}`,
            relatedEntityType: "lease",
            relatedEntityId: lease._id as string,
            actionUrl: `/properties/${lease.propertyId}?leaseId=${lease._id}`,
            severity,
            metadata: {
              leaseId: lease._id,
              propertyId: lease.propertyId,
              propertyName,
              unitId: lease.unitId,
              unitName,
              tenantName: lease.tenantName,
              endDate: lease.endDate,
              daysUntilExpiry,
            },
          });
          createdCount++;
        } catch (error) {
          console.error("Error creating lease expiration notification:", error);
        }
      }
    }

    return { created: createdCount };
  },
});

// Migration: Apply utility defaults to existing active leases without utility settings
export const applyDefaultsToExistingLeases = mutation({
  args: { 
    propertyId: v.optional(v.id("properties")) // Optional - if provided, only process this property
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Get properties to process
    let properties;
    if (args.propertyId) {
      const property = await ctx.db.get(args.propertyId);
      if (!property || property.userId !== userId) {
        throw new Error("Property not found or access denied");
      }
      properties = [property];
    } else {
      properties = await ctx.db
        .query("properties")
        .filter((q) => q.eq(q.field("userId"), userId))
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
      const allLeases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q: any) => q.eq("propertyId", property._id))
        .collect();
      
      // Filter to only active leases based on computed status
      const activeLeases = allLeases.filter((lease: any) => {
        const status = getLeaseStatus(lease.startDate, lease.endDate);
        return status === "active";
      });

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