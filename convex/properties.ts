import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a property for the signed-in user
export const addProperty = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    rent: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("properties", args);
  },
});

// Get all properties for the signed-in user
export const getProperties = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
}); 