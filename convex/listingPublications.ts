/**
 * Convex functions for managing listing publications
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Create a new listing publication
 */
export const createPublication = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    platform: v.string(),
    listingTitle: v.optional(v.string()),
    listingDescription: v.optional(v.string()),
    monthlyRent: v.optional(v.number()),
    availableDate: v.optional(v.string()),
    platformSettings: v.optional(v.any()),
    autoRenew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Check if publication already exists for this property-platform combination
    const existingPublication = await ctx.db
      .query("listingPublications")
      .withIndex("by_property_platform", (q) =>
        q.eq("propertyId", args.propertyId).eq("platform", args.platform)
      )
      .first();

    if (existingPublication) {
      throw new Error(`Listing already exists for ${args.platform} on this property`);
    }

    // Create the publication
    const publicationId = await ctx.db.insert("listingPublications", {
      userId: args.userId,
      propertyId: args.propertyId,
      platform: args.platform,
      status: "pending",
      listingTitle: args.listingTitle,
      listingDescription: args.listingDescription,
      monthlyRent: args.monthlyRent,
      availableDate: args.availableDate,
      platformSettings: args.platformSettings,
      autoRenew: args.autoRenew,
      createdAt: now,
    });

    return publicationId;
  },
});

/**
 * Update publication status after API call
 */
export const updatePublicationStatus = mutation({
  args: {
    publicationId: v.id("listingPublications"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("expired"),
      v.literal("paused")
    ),
    externalId: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    await ctx.db.patch(args.publicationId, {
      status: args.status,
      externalId: args.externalId,
      externalUrl: args.externalUrl,
      publishedAt: args.publishedAt,
      errorMessage: args.errorMessage,
      errorCode: args.errorCode,
      retryCount: args.retryCount,
      lastSyncAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get all publications for a property
 */
export const getPropertyPublications = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("listingPublications")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    return publications;
  },
});

/**
 * Get all publications for a user
 */
export const getUserPublications = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("listingPublications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return publications;
  },
});

/**
 * Get publications by platform
 */
export const getPlatformPublications = query({
  args: {
    userId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("listingPublications")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .collect();

    return publications;
  },
});

/**
 * Get publications by status
 */
export const getPublicationsByStatus = query({
  args: {
    userId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("expired"),
      v.literal("paused")
    ),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("listingPublications")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    return publications;
  },
});

/**
 * Get publication with property details
 */
export const getPublicationWithProperty = query({
  args: {
    publicationId: v.id("listingPublications"),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (!publication) return null;

    const property = await ctx.db.get(publication.propertyId);
    if (!property) return null;

    return {
      ...publication,
      property,
    };
  },
});

/**
 * Delete a publication
 */
export const deletePublication = mutation({
  args: {
    publicationId: v.id("listingPublications"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (!publication) {
      throw new Error("Publication not found");
    }

    if (publication.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot delete publication");
    }

    await ctx.db.delete(args.publicationId);
    return true;
  },
});

/**
 * Update publication metadata
 */
export const updatePublication = mutation({
  args: {
    publicationId: v.id("listingPublications"),
    userId: v.string(),
    listingTitle: v.optional(v.string()),
    listingDescription: v.optional(v.string()),
    monthlyRent: v.optional(v.number()),
    availableDate: v.optional(v.string()),
    platformSettings: v.optional(v.any()),
    autoRenew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const publication = await ctx.db.get(args.publicationId);
    if (!publication) {
      throw new Error("Publication not found");
    }

    if (publication.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot update publication");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.publicationId, {
      listingTitle: args.listingTitle,
      listingDescription: args.listingDescription,
      monthlyRent: args.monthlyRent,
      availableDate: args.availableDate,
      platformSettings: args.platformSettings,
      autoRenew: args.autoRenew,
      updatedAt: now,
    });

    return true;
  },
});

/**
 * Get listings needing sync (stale listings)
 */
export const getStaleListings = query({
  args: {
    hoursStale: v.optional(v.number()), // Default 24 hours
  },
  handler: async (ctx, args) => {
    const hoursStale = args.hoursStale || 24;
    const staleThreshold = new Date();
    staleThreshold.setHours(staleThreshold.getHours() - hoursStale);
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
 * Get publication statistics for dashboard
 */
export const getPublicationStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const publications = await ctx.db
      .query("listingPublications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      total: publications.length,
      active: publications.filter(p => p.status === "active").length,
      pending: publications.filter(p => p.status === "pending").length,
      error: publications.filter(p => p.status === "error").length,
      expired: publications.filter(p => p.status === "expired").length,
      paused: publications.filter(p => p.status === "paused").length,
      platformBreakdown: {} as Record<string, number>,
    };

    // Platform breakdown
    publications.forEach(pub => {
      stats.platformBreakdown[pub.platform] = (stats.platformBreakdown[pub.platform] || 0) + 1;
    });

    return stats;
  },
});

/**
 * Bulk update publication status
 */
export const bulkUpdateStatus = mutation({
  args: {
    publicationIds: v.array(v.id("listingPublications")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("error"),
      v.literal("expired"),
      v.literal("paused")
    ),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const publicationId of args.publicationIds) {
      const publication = await ctx.db.get(publicationId);
      if (publication && publication.userId === args.userId) {
        await ctx.db.patch(publicationId, {
          status: args.status,
          lastSyncAt: now,
          updatedAt: now,
        });
        updatedCount++;
      }
    }

    return { updatedCount };
  },
});