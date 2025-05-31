import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getDocuments = query({
  args: {
    userId: v.string(),
    type: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("documents").filter(q => q.eq(q.field("userId"), args.userId));
    if (args.type) q = q.filter(q => q.eq(q.field("type"), args.type));
    if (args.propertyId) q = q.filter(q => q.eq(q.field("propertyId"), args.propertyId));
    if (args.leaseId) q = q.filter(q => q.eq(q.field("leaseId"), args.leaseId));
    return await q.collect();
  },
});

export const addDocument = mutation({
  args: {
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    type: v.string(),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documents", {
      ...args,
      uploadedAt: new Date().toISOString(),
    });
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.patch(args.id, {
      name: args.name,
      type: args.type,
      propertyId: args.propertyId,
      leaseId: args.leaseId,
      notes: args.notes,
    });
  },
});

export const deleteDocument = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
}); 