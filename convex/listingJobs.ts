/**
 * Background job system for listing operations
 * Handles bulk publishing, status sync, and token refresh
 */

import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Create a background job for bulk listing operations
 */
export const createBulkPublishJob = mutation({
  args: {
    userId: v.string(),
    propertyIds: v.array(v.id("properties")),
    platforms: v.array(v.string()),
    listingData: v.any(),
    scheduledFor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    // Create job record (we'll add this to schema later if needed)
    // For now, just trigger immediate processing for each property
    const results: Record<string, any> = {};
    
    for (const propertyId of args.propertyIds) {
      for (const platform of args.platforms) {
        try {
          // Check if publication already exists
          const existingPublication = await ctx.db
            .query("listingPublications")
            .withIndex("by_property_platform", (q) =>
              q.eq("propertyId", propertyId).eq("platform", platform)
            )
            .first();

          if (!existingPublication) {
            // Create pending publication
            await ctx.db.insert("listingPublications", {
              userId: args.userId,
              propertyId,
              platform,
              status: "pending",
              listingTitle: args.listingData.title,
              listingDescription: args.listingData.description,
              monthlyRent: args.listingData.monthlyRent,
              availableDate: args.listingData.availableDate,
              createdAt: now,
            });

            results[`${propertyId}-${platform}`] = {
              success: true,
              message: "Job queued for background processing",
            };
          } else {
            results[`${propertyId}-${platform}`] = {
              success: false,
              message: "Publication already exists",
            };
          }
        } catch (error) {
          results[`${propertyId}-${platform}`] = {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    }

    // Background processing will be scheduled when platform APIs are connected
    // await ctx.scheduler.runAfter(0, internal.listingJobs.processPendingPublications, {
    //   userId: args.userId,
    // });

    return {
      jobId: `bulk-${Date.now()}`,
      results,
      scheduledAt: now,
    };
  },
});

/**
 * Process pending publications (background action)
 * TODO: Implement when platform APIs are integrated
 */
// export const processPendingPublications = action({
//   args: {
//     userId: v.optional(v.string()),
//     limit: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     // Implementation will be added when real platform APIs are connected
//     return [];
//   },
// });

/**
 * Get pending publications (internal query)
 */
export const getPendingPublications = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    let query = ctx.db
      .query("listingPublications")
      .withIndex("by_status", (q) => q.eq("status", "pending"));

    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }

    return await query.take(limit);
  },
});

/**
 * Get property data for publication (internal query)
 */
export const getPropertyForPublication = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      return null;
    }
    return property;
  },
});

/**
 * Get platform tokens (internal query)
 */
export const getPlatformTokens = query({
  args: {
    userId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("platformTokens")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();

    return tokens;
  },
});

/**
 * Update publication as successful (internal mutation)
 */
export const updatePublicationSuccess = mutation({
  args: {
    publicationId: v.id("listingPublications"),
    externalId: v.string(),
    externalUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(args.publicationId, {
      status: "active",
      externalId: args.externalId,
      externalUrl: args.externalUrl,
      publishedAt: now,
      lastSyncAt: now,
      updatedAt: now,
      errorMessage: undefined,
      errorCode: undefined,
    });
  },
});

/**
 * Update publication as failed (internal mutation)
 */
export const updatePublicationError = mutation({
  args: {
    publicationId: v.id("listingPublications"),
    errorMessage: v.string(),
    errorCode: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(args.publicationId, {
      status: "error",
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
      lastSyncAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Refresh expired tokens (background job)
 * TODO: Implement when platform APIs are integrated
 */
// export const refreshExpiredTokens = action({
//   args: {},
//   handler: async (ctx) => {
//     // Implementation will be added when real platform APIs are connected
//     return [];
//   },
// });


/**
 * Sync listing status with platforms (background job)
 * TODO: Implement when platform APIs are integrated
 */
// export const syncListingStatus = action({
//   args: {
//     hoursStale: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     // Implementation will be added when real platform APIs are connected
//     return [];
//   },
// });

/**
 * Get stale listings (internal query)
 */
export const getStaleListings = query({
  args: {
    hoursStale: v.number(),
  },
  handler: async (ctx, args) => {
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - args.hoursStale);
    const staleThresholdISO = staleThreshold.toISOString();

    const staleListings = await ctx.db
      .query("listingPublications")
      .withIndex("by_sync_date")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.or(
            q.eq(q.field("lastSyncAt"), undefined),
            q.lt(q.field("lastSyncAt"), staleThresholdISO)
          )
        )
      )
      .collect();

    return staleListings;
  },
});

/**
 * Update sync timestamp (internal mutation)
 */
export const updateSyncTimestamp = mutation({
  args: {
    publicationId: v.id("listingPublications"),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(args.publicationId, {
      lastSyncAt: now,
      updatedAt: now,
    });
  },
});