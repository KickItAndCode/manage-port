import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to check property ownership
async function verifyPropertyOwnership(
  ctx: any,
  propertyId: Id<"properties">,
  userId: string
): Promise<boolean> {
  const property = await ctx.db.get(propertyId);
  return property !== null && property.userId === userId;
}

// Helper to check if unit identifier is unique within property
async function isUnitIdentifierUnique(
  ctx: any,
  propertyId: Id<"properties">,
  unitIdentifier: string,
  excludeUnitId?: Id<"units">
): Promise<boolean> {
  const existingUnits = await ctx.db
    .query("units")
    .withIndex("by_property", (q: any) => q.eq("propertyId", propertyId))
    .collect();
  
  return !existingUnits.some(
    (unit: any) => 
      unit.unitIdentifier === unitIdentifier && 
      unit._id !== excludeUnitId
  );
}

// Add a new unit to a property
export const addUnit = mutation({
  args: {
    propertyId: v.id("properties"),
    unitIdentifier: v.string(),
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance")),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    squareFeet: v.optional(v.number()),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to add units to this property");
    }

    // Check if unit identifier is unique
    const isUnique = await isUnitIdentifierUnique(ctx, args.propertyId, args.unitIdentifier);
    if (!isUnique) {
      throw new Error(`Unit "${args.unitIdentifier}" already exists for this property`);
    }

    // Update property type to multi-family if adding units
    const property = await ctx.db.get(args.propertyId);
    if (property && property.propertyType !== "multi-family") {
      await ctx.db.patch(args.propertyId, { propertyType: "multi-family" });
    }

    const unitId = await ctx.db.insert("units", {
      propertyId: args.propertyId,
      unitIdentifier: args.unitIdentifier,
      status: args.status,
      bedrooms: args.bedrooms,
      bathrooms: args.bathrooms,
      squareFeet: args.squareFeet,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    });

    return unitId;
  },
});

// Update an existing unit
export const updateUnit = mutation({
  args: {
    id: v.id("units"),
    unitIdentifier: v.optional(v.string()),
    status: v.optional(v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance"))),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    squareFeet: v.optional(v.number()),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to update this unit");
    }

    // Check if new unit identifier is unique
    if (args.unitIdentifier && args.unitIdentifier !== unit.unitIdentifier) {
      const isUnique = await isUnitIdentifierUnique(
        ctx,
        unit.propertyId,
        args.unitIdentifier,
        args.id
      );
      if (!isUnique) {
        throw new Error(`Unit "${args.unitIdentifier}" already exists for this property`);
      }
    }

    const updates: Partial<Doc<"units">> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.unitIdentifier !== undefined) updates.unitIdentifier = args.unitIdentifier;
    if (args.status !== undefined) updates.status = args.status;
    if (args.bedrooms !== undefined) updates.bedrooms = args.bedrooms;
    if (args.bathrooms !== undefined) updates.bathrooms = args.bathrooms;
    if (args.squareFeet !== undefined) updates.squareFeet = args.squareFeet;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete a unit
export const deleteUnit = mutation({
  args: {
    id: v.id("units"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to delete this unit");
    }

    // Check if unit has active leases
    const activeLeases = await ctx.db
      .query("leases")
      .withIndex("by_unit", (q) => q.eq("unitId", args.id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (activeLeases.length > 0) {
      throw new Error("Cannot delete unit with active leases");
    }

    // Delete the unit
    await ctx.db.delete(args.id);

    // Check if property should revert to single-family
    const remainingUnits = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", unit.propertyId))
      .collect();

    if (remainingUnits.length === 0) {
      await ctx.db.patch(unit.propertyId, { propertyType: "single-family" });
    }

    return { success: true };
  },
});

// Get a single unit by ID
export const getUnit = query({
  args: {
    id: v.id("units"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.id);
    if (!unit) return null;

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, args.userId);
    if (!isOwner) return null;

    return unit;
  },
});

// Get all units for a property
export const getUnitsByProperty = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) return [];

    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Sort by unit identifier
    return units.sort((a, b) => a.unitIdentifier.localeCompare(b.unitIdentifier));
  },
});

// Get unit with current lease information
export const getUnitWithLease = query({
  args: {
    unitId: v.id("units"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unit = await ctx.db.get(args.unitId);
    if (!unit) return null;

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, args.userId);
    if (!isOwner) return null;

    // Get active lease for this unit
    const activeLease = await ctx.db
      .query("leases")
      .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      ...unit,
      activeLease,
    };
  },
});

// Get available units for a property
export const getAvailableUnits = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) return [];

    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("status"), "available"))
      .collect();

    return units.sort((a, b) => a.unitIdentifier.localeCompare(b.unitIdentifier));
  },
});

// Bulk create units for a property
export const bulkCreateUnits = mutation({
  args: {
    propertyId: v.id("properties"),
    units: v.array(v.object({
      unitIdentifier: v.string(),
      bedrooms: v.optional(v.number()),
      bathrooms: v.optional(v.number()),
      squareFeet: v.optional(v.number()),
    })),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) {
      throw new Error("You do not have permission to add units to this property");
    }

    // Check for duplicate identifiers in the batch
    const identifiers = args.units.map(u => u.unitIdentifier);
    const uniqueIdentifiers = new Set(identifiers);
    if (identifiers.length !== uniqueIdentifiers.size) {
      throw new Error("Duplicate unit identifiers in batch");
    }

    // Check against existing units
    const existingUnits = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    
    const existingIdentifiers = new Set(existingUnits.map(u => u.unitIdentifier));
    for (const identifier of identifiers) {
      if (existingIdentifiers.has(identifier)) {
        throw new Error(`Unit "${identifier}" already exists for this property`);
      }
    }

    // Update property type to multi-family
    await ctx.db.patch(args.propertyId, { propertyType: "multi-family" });

    // Create all units
    const createdIds = [];
    for (const unit of args.units) {
      const id = await ctx.db.insert("units", {
        propertyId: args.propertyId,
        unitIdentifier: unit.unitIdentifier,
        status: "available",
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        squareFeet: unit.squareFeet,
        createdAt: new Date().toISOString(),
      });
      createdIds.push(id);
    }

    return createdIds;
  },
});

// Get unit statistics for a property
export const getUnitStats = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, args.userId);
    if (!isOwner) return null;

    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    const stats = {
      totalUnits: units.length,
      availableUnits: 0,
      occupiedUnits: 0,
      maintenanceUnits: 0,
      occupancyRate: 0,
    };

    for (const unit of units) {
      switch (unit.status) {
        case "available":
          stats.availableUnits++;
          break;
        case "occupied":
          stats.occupiedUnits++;
          break;
        case "maintenance":
          stats.maintenanceUnits++;
          break;
      }
    }

    if (stats.totalUnits > 0) {
      stats.occupancyRate = (stats.occupiedUnits / stats.totalUnits) * 100;
    }

    return stats;
  },
});