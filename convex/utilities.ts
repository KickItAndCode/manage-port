import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a utility for a property
export const addUtility = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    name: v.string(),
    provider: v.string(),
    cost: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("utilities", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

// Get all utilities for a user (optionally filtered by property)
export const getUtilities = query({
  args: { userId: v.string(), propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("utilities").filter(q => q.eq(q.field("userId"), args.userId));
    if (args.propertyId) {
      q = q.filter(q => q.eq(q.field("propertyId"), args.propertyId));
    }
    return await q.collect();
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
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const utility = await ctx.db.get(args.id);
    if (!utility || utility.userId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.id, {
      propertyId: args.propertyId,
      name: args.name,
      provider: args.provider,
      cost: args.cost,
      status: args.status,
    });
  },
});

// Delete a utility
export const deleteUtility = mutation({
  args: { id: v.id("utilities"), userId: v.string() },
  handler: async (ctx, args) => {
    const utility = await ctx.db.get(args.id);
    if (!utility || utility.userId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
}); 