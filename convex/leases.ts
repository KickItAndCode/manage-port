import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add a lease for a property (enforce only one active lease per property)
export const addLease = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    status: v.string(), // active, expired
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.status === "active") {
      // Only one active lease per property
      const active = await ctx.db
        .query("leases")
        .filter(q => q.eq(q.field("propertyId"), args.propertyId))
        .filter(q => q.eq(q.field("status"), "active"))
        .collect();
      if (active.length > 0) throw new Error("There is already an active lease for this property.");
    }
    return await ctx.db.insert("leases", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});

// Get all leases for a user (optionally filtered by property)
export const getLeases = query({
  args: { userId: v.string(), propertyId: v.optional(v.id("properties")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("leases").filter(q => q.eq(q.field("userId"), args.userId));
    if (args.propertyId) {
      q = q.filter(q => q.eq(q.field("propertyId"), args.propertyId));
    }
    return await q.collect();
  },
});

// Update a lease (enforce only one active lease per property)
export const updateLease = mutation({
  args: {
    id: v.id("leases"),
    userId: v.string(),
    propertyId: v.id("properties"),
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    status: v.string(),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) throw new Error("Unauthorized");
    if (args.status === "active") {
      // Only one active lease per property
      const active = await ctx.db
        .query("leases")
        .filter(q => q.eq(q.field("propertyId"), args.propertyId))
        .filter(q => q.eq(q.field("status"), "active"))
        .filter(q => q.neq(q.field("_id"), args.id))
        .collect();
      if (active.length > 0) throw new Error("There is already an active lease for this property.");
    }
    await ctx.db.patch(args.id, {
      propertyId: args.propertyId,
      tenantName: args.tenantName,
      tenantEmail: args.tenantEmail,
      tenantPhone: args.tenantPhone,
      startDate: args.startDate,
      endDate: args.endDate,
      rent: args.rent,
      status: args.status,
      leaseDocumentUrl: args.leaseDocumentUrl,
    });
  },
});

// Delete a lease
export const deleteLease = mutation({
  args: { id: v.id("leases"), userId: v.string() },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
}); 