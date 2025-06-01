import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get a single utility by ID
export const getUtility = query({
  args: { 
    id: v.id("utilities"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const utility = await ctx.db.get(args.id);
    if (!utility || utility.userId !== args.userId) {
      return null;
    }
    return utility;
  },
});

// Get all utilities for a user (optionally filtered by property)
export const getUtilities = query({
  args: { 
    userId: v.string(), 
    propertyId: v.optional(v.id("properties")) 
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("utilities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    const utilities = await q.collect();
    
    // Filter by property if specified
    if (args.propertyId) {
      return utilities.filter(u => u.propertyId === args.propertyId);
    }
    
    return utilities;
  },
});

// Get utilities by property ID
export const getUtilitiesByProperty = query({
  args: { 
    propertyId: v.id("properties"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const utilities = await ctx.db
      .query("utilities")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    // Filter by userId for security
    return utilities.filter(u => u.userId === args.userId);
  },
});

// Get all utilities (with pagination)
export const getAllUtilities = query({
  args: { 
    userId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    let q = ctx.db
      .query("utilities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    // Simple pagination using cursor
    const utilities = await q.take(limit + 1);
    
    const hasMore = utilities.length > limit;
    const items = hasMore ? utilities.slice(0, -1) : utilities;
    
    return {
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : null
    };
  },
});

// Add a utility for a property
export const addUtility = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    name: v.string(),
    provider: v.string(),
    cost: v.number(),
    billingCycle: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    // Check for duplicate utility
    const existingUtilities = await ctx.db
      .query("utilities")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    const duplicate = existingUtilities.find(
      u => u.name === args.name && u.provider === args.provider
    );
    
    if (duplicate) {
      throw new Error("A utility with this name and provider already exists for this property");
    }
    
    return await ctx.db.insert("utilities", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

// Update a utility
export const updateUtility = mutation({
  args: {
    id: v.id("utilities"),
    userId: v.string(),
    propertyId: v.id("properties"),
    name: v.string(),
    provider: v.string(),
    cost: v.number(),
    billingCycle: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const utility = await ctx.db.get(args.id);
    if (!utility || utility.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    // Verify the new property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    const { id, userId, ...updateData } = args;
    
    await ctx.db.patch(args.id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete a utility
export const deleteUtility = mutation({
  args: { 
    id: v.id("utilities"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const utility = await ctx.db.get(args.id);
    if (!utility || utility.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

// Get utility statistics for a user
export const getUtilityStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const utilities = await ctx.db
      .query("utilities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const stats = {
      totalUtilities: utilities.length,
      totalMonthlyCost: utilities.reduce((sum, u) => sum + u.cost, 0),
      byType: {} as Record<string, { count: number; totalCost: number }>,
      byProperty: {} as Record<string, { count: number; totalCost: number }>,
    };
    
    // Group by utility type
    utilities.forEach(u => {
      if (!stats.byType[u.name]) {
        stats.byType[u.name] = { count: 0, totalCost: 0 };
      }
      stats.byType[u.name].count++;
      stats.byType[u.name].totalCost += u.cost;
    });
    
    // Group by property
    utilities.forEach(u => {
      if (!stats.byProperty[u.propertyId]) {
        stats.byProperty[u.propertyId] = { count: 0, totalCost: 0 };
      }
      stats.byProperty[u.propertyId].count++;
      stats.byProperty[u.propertyId].totalCost += u.cost;
    });
    
    return stats;
  },
});