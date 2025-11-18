import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Activity types
export const ACTIVITY_TYPES = {
  PROPERTY: "property",
  LEASE: "lease",
  DOCUMENT: "document",
  UTILITY_BILL: "utility_bill",
  UNIT: "unit",
} as const;

// Activity actions
export const ACTIVITY_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  UPLOADED: "uploaded",
  PAID: "paid",
  EXPIRED: "expired",
} as const;

// Log an activity
export const logActivity = mutation({
  args: {
    userId: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLog", {
      userId: args.userId,
      entityType: args.entityType,
      entityId: args.entityId,
      action: args.action,
      description: args.description,
      metadata: args.metadata,
      timestamp: new Date().toISOString(),
    });
  },
});

// Get activities for a user (with filters)
export const getUserActivities = query({
  args: {
    userId: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    dateRange: v.optional(v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year"),
      v.literal("all")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let activities = await ctx.db
      .query("activityLog")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by entity type if provided
    if (args.entityType) {
      activities = activities.filter(a => a.entityType === args.entityType);
    }

    // Filter by entity ID if provided
    if (args.entityId) {
      activities = activities.filter(a => a.entityId === args.entityId);
    }

    // Filter by date range
    if (args.dateRange && args.dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (args.dateRange) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      activities = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return activityDate >= startDate;
      });
    }

    // Sort by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit if provided
    if (args.limit) {
      activities = activities.slice(0, args.limit);
    }

    return activities;
  },
});

// Get activities for a specific property
export const getPropertyActivities = query({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get activities directly related to the property
    // Use by_user_timestamp index and filter by entityType and entityId
    const propertyActivities = await ctx.db
      .query("activityLog")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter for property-related activities
    // entityId is stored as string, propertyId is Id<"properties"> (which is also a string)
    const propertyIdStr = args.propertyId as string;
    const filtered = propertyActivities.filter(a => 
      (a.entityType === ACTIVITY_TYPES.PROPERTY && a.entityId === propertyIdStr) ||
      (a.metadata && typeof a.metadata === "object" && "propertyId" in a.metadata && a.metadata.propertyId === propertyIdStr)
    );

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit if provided
    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

// Get activities for a specific lease
export const getLeaseActivities = query({
  args: {
    userId: v.string(),
    leaseId: v.id("leases"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter for lease-related activities
    // entityId is stored as string, leaseId is Id<"leases"> (which is also a string)
    const leaseIdStr = args.leaseId as string;
    const filtered = activities.filter(a => 
      (a.entityType === ACTIVITY_TYPES.LEASE && a.entityId === leaseIdStr) ||
      (a.metadata && typeof a.metadata === "object" && "leaseId" in a.metadata && a.metadata.leaseId === leaseIdStr)
    );

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply limit if provided
    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

