import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get a single lease by ID
export const getLease = query({
  args: { 
    id: v.id("leases"), 
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      return null;
    }
    return lease;
  },
});

// Get all leases for a user (optionally filtered by property)
export const getLeases = query({
  args: { 
    userId: v.string(), 
    propertyId: v.optional(v.id("properties")) 
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    const leases = await q.collect();
    
    // Filter by property if specified
    if (args.propertyId) {
      return leases.filter(l => l.propertyId === args.propertyId);
    }
    
    return leases;
  },
});

// Get leases by property ID
export const getLeasesByProperty = query({
  args: { 
    propertyId: v.id("properties"),
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    // Filter by userId for security
    return leases.filter(l => l.userId === args.userId);
  },
});

// Get active leases
export const getActiveLeases = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    return leases.filter(l => l.userId === args.userId);
  },
});

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
    securityDeposit: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    // Validate payment day if provided
    if (args.paymentDay && (args.paymentDay < 1 || args.paymentDay > 31)) {
      throw new Error("Payment day must be between 1 and 31");
    }
    
    // Check for existing active lease if trying to add an active lease
    if (args.status === "active") {
      const activeLeases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .filter(q => q.eq(q.field("status"), "active"))
        .collect();
      
      if (activeLeases.length > 0) {
        throw new Error("There is already an active lease for this property.");
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
      createdAt: new Date().toISOString(),
    });
    
    // Create document record if lease document is provided
    if (args.leaseDocumentUrl) {
      await ctx.db.insert("documents", {
        userId: args.userId,
        url: args.leaseDocumentUrl,
        name: `Lease - ${args.tenantName}`,
        type: "lease",
        propertyId: args.propertyId,
        leaseId: lease,
        uploadedAt: new Date().toISOString(),
      });
    }
    
    return lease;
  },
});

// Update a lease
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
    securityDeposit: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")),
    paymentDay: v.optional(v.number()),
    notes: v.optional(v.string()),
    leaseDocumentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new Error("Unauthorized: Property not found or doesn't belong to user");
    }
    
    // Validate payment day if provided
    if (args.paymentDay && (args.paymentDay < 1 || args.paymentDay > 31)) {
      throw new Error("Payment day must be between 1 and 31");
    }
    
    // Check for existing active lease if changing to active
    if (args.status === "active" && lease.status !== "active") {
      const activeLeases = await ctx.db
        .query("leases")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
        .filter(q => q.eq(q.field("status"), "active"))
        .filter(q => q.neq(q.field("_id"), args.id))
        .collect();
      
      if (activeLeases.length > 0) {
        throw new Error("There is already an active lease for this property.");
      }
    }
    
    // Validate dates
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    if (end <= start) {
      throw new Error("End date must be after start date");
    }
    
    const { id, userId, ...updateData } = args;
    
    await ctx.db.patch(args.id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
    
    // Update or create document record if lease document is provided
    if (args.leaseDocumentUrl) {
      const docs = await ctx.db
        .query("documents")
        .filter(q => q.eq(q.field("leaseId"), args.id))
        .collect();
      
      if (docs.length > 0) {
        await ctx.db.patch(docs[0]._id, {
          url: args.leaseDocumentUrl,
          propertyId: args.propertyId,
          uploadedAt: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("documents", {
          userId: args.userId,
          url: args.leaseDocumentUrl,
          name: `Lease - ${args.tenantName}`,
          type: "lease",
          propertyId: args.propertyId,
          leaseId: args.id,
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
    userId: v.string() 
  },
  handler: async (ctx, args) => {
    const lease = await ctx.db.get(args.id);
    if (!lease || lease.userId !== args.userId) {
      throw new Error("Unauthorized");
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const now = new Date();
    const activeLeases = leases.filter(l => l.status === "active");
    const expiredLeases = leases.filter(l => l.status === "expired");
    const pendingLeases = leases.filter(l => l.status === "pending");
    
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

// Automatically update lease status based on dates
export const updateLeaseStatuses = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const now = new Date();
    let updated = 0;
    
    for (const lease of leases) {
      const startDate = new Date(lease.startDate);
      const endDate = new Date(lease.endDate);
      let newStatus = lease.status;
      
      // Update pending to active if start date has passed
      if (lease.status === "pending" && startDate <= now) {
        // Check if there's already an active lease for this property
        const activeLeases = await ctx.db
          .query("leases")
          .withIndex("by_property", (q) => q.eq("propertyId", lease.propertyId))
          .filter(q => q.eq(q.field("status"), "active"))
          .filter(q => q.neq(q.field("_id"), lease._id))
          .collect();
        
        if (activeLeases.length === 0) {
          newStatus = "active";
        }
      }
      
      // Update active to expired if end date has passed
      if (lease.status === "active" && endDate < now) {
        newStatus = "expired";
      }
      
      // Update if status changed
      if (newStatus !== lease.status) {
        await ctx.db.patch(lease._id, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
        updated++;
      }
    }
    
    return { updated };
  },
});