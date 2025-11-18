/**
 * Convex functions for managing OAuth platform tokens
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Store OAuth tokens for a platform
 */
export const storeTokens = mutation({
  args: {
    userId: v.string(),
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.array(v.string())),
    platformUserId: v.optional(v.string()),
    platformUserEmail: v.optional(v.string()),
    platformAccountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Check if tokens already exist for this user-platform combination
    const existingTokens = await ctx.db
      .query("platformTokens")
      .withIndex("by_user_platform", (q) => 
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();

    if (existingTokens) {
      // Update existing tokens
      await ctx.db.patch(existingTokens._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenType: args.tokenType || "Bearer",
        expiresAt: args.expiresAt,
        scope: args.scope,
        lastRefreshedAt: now,
        isValid: true,
        platformUserId: args.platformUserId,
        platformUserEmail: args.platformUserEmail,
        platformAccountName: args.platformAccountName,
        updatedAt: now,
      });
      
      return existingTokens._id;
    } else {
      // Create new token record
      const tokenId = await ctx.db.insert("platformTokens", {
        userId: args.userId,
        platform: args.platform,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenType: args.tokenType || "Bearer",
        expiresAt: args.expiresAt,
        scope: args.scope,
        issuedAt: now,
        isValid: true,
        platformUserId: args.platformUserId,
        platformUserEmail: args.platformUserEmail,
        platformAccountName: args.platformAccountName,
        createdAt: now,
      });
      
      return tokenId;
    }
  },
});

/**
 * Get tokens for a specific user and platform
 */
export const getTokens = query({
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
 * Get all platform connections for a user
 */
export const getUserConnections = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("platformTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Return safe version without sensitive token data
    return connections.map(conn => ({
      _id: conn._id,
      platform: conn.platform,
      isValid: conn.isValid,
      expiresAt: conn.expiresAt,
      platformUserId: conn.platformUserId,
      platformUserEmail: conn.platformUserEmail,
      platformAccountName: conn.platformAccountName,
      issuedAt: conn.issuedAt,
      lastRefreshedAt: conn.lastRefreshedAt,
    }));
  },
});

/**
 * Update token validity status
 */
export const updateTokenValidity = mutation({
  args: {
    tokenId: v.id("platformTokens"),
    isValid: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      isValid: args.isValid,
      updatedAt: new Date().toISOString(),
    });
  },
});

/**
 * Refresh stored tokens
 */
export const refreshTokens = mutation({
  args: {
    tokenId: v.id("platformTokens"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    
    await ctx.db.patch(args.tokenId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      lastRefreshedAt: now,
      isValid: true,
      updatedAt: now,
    });
  },
});

/**
 * Delete platform connection
 */
export const deleteConnection = mutation({
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

    if (tokens) {
      await ctx.db.delete(tokens._id);
      return true;
    }
    
    return false;
  },
});

/**
 * Get tokens that are about to expire (for background refresh job)
 */
export const getExpiringTokens = query({
  args: {
    hoursBeforeExpiry: v.optional(v.number()), // Default 24 hours
  },
  handler: async (ctx, args) => {
    const hoursBeforeExpiry = args.hoursBeforeExpiry || 24;
    const expiryThreshold = Date.now() + (hoursBeforeExpiry * 60 * 60 * 1000);

    const expiringTokens = await ctx.db
      .query("platformTokens")
      .withIndex("by_expiration")
      .filter((q) => 
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), expiryThreshold),
          q.eq(q.field("isValid"), true)
        )
      )
      .collect();

    return expiringTokens;
  },
});

/**
 * Get all invalid tokens (for cleanup)
 */
export const getInvalidTokens = query({
  handler: async (ctx) => {
    const invalidTokens = await ctx.db
      .query("platformTokens")
      .withIndex("by_validity", (q) => q.eq("isValid", false))
      .collect();

    return invalidTokens;
  },
});

/**
 * Clean up old invalid tokens
 */
export const cleanupInvalidTokens = mutation({
  args: {
    olderThanDays: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, args) => {
    const daysOld = args.olderThanDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISOString = cutoffDate.toISOString();

    const oldInvalidTokens = await ctx.db
      .query("platformTokens")
      .withIndex("by_validity", (q) => q.eq("isValid", false))
      .filter((q) => q.lt(q.field("updatedAt"), cutoffISOString))
      .collect();

    let deletedCount = 0;
    for (const token of oldInvalidTokens) {
      await ctx.db.delete(token._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Get platform statistics for admin dashboard
 */
export const getPlatformStats = query({
  handler: async (ctx) => {
    const allTokens = await ctx.db.query("platformTokens").collect();
    
    const stats = {
      totalConnections: allTokens.length,
      validConnections: allTokens.filter(t => t.isValid).length,
      invalidConnections: allTokens.filter(t => !t.isValid).length,
      platformBreakdown: {} as Record<string, number>,
      expiringIn24Hours: 0,
    };

    // Platform breakdown
    allTokens.forEach(token => {
      stats.platformBreakdown[token.platform] = (stats.platformBreakdown[token.platform] || 0) + 1;
    });

    // Expiring tokens count
    const expiryThreshold = Date.now() + (24 * 60 * 60 * 1000);
    stats.expiringIn24Hours = allTokens.filter(token => 
      token.expiresAt && token.expiresAt < expiryThreshold && token.isValid
    ).length;

    return stats;
  },
});