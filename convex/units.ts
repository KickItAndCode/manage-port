import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { filterActiveLeases } from "./lib/leaseStatus";

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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, userId);
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
    propertyId: v.optional(v.id("properties")), // Optional since we get it from the existing unit
    unitIdentifier: v.optional(v.string()),
    status: v.optional(v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance"))),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    squareFeet: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, userId);
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const unit = await ctx.db.get(args.id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, userId);
    if (!isOwner) {
      throw new Error("You do not have permission to delete this unit");
    }

    // Check if unit has active leases
    const activeLeases = filterActiveLeases(await ctx.db
      .query("leases")
      .withIndex("by_unit", (q) => q.eq("unitId", args.id))
      .collect());

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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const unit = await ctx.db.get(args.id);
    if (!unit) return null;

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, userId);
    if (!isOwner) return null;

    return unit;
  },
});

// Get all units for a property
export const getUnitsByProperty = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, userId);
    if (!isOwner) return [];

    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Report occupancy derived from active leases rather than the stored
    // unit.status, which only changes when a lease is written and therefore
    // still reads "occupied" for units whose leases have ended. "maintenance"
    // is a real manual state and is preserved.
    const propertyLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const occupiedUnitIds = new Set(
      filterActiveLeases(propertyLeases)
        .map((lease) => lease.unitId)
        .filter(Boolean)
    );

    return units
      .map((unit) => ({
        ...unit,
        status:
          unit.status === "maintenance"
            ? ("maintenance" as const)
            : occupiedUnitIds.has(unit._id)
              ? ("occupied" as const)
              : ("available" as const),
      }))
      .sort((a, b) => a.unitIdentifier.localeCompare(b.unitIdentifier));
  },
});

// Get unit with current lease information
export const getUnitWithLease = query({
  args: {
    unitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const unit = await ctx.db.get(args.unitId);
    if (!unit) return null;

    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, unit.propertyId, userId);
    if (!isOwner) return null;

    // Get active lease for this unit
    const activeLease = (filterActiveLeases(await ctx.db
      .query("leases")
      .withIndex("by_unit", (q) => q.eq("unitId", args.unitId))
      .collect()))[0] ?? null;

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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, userId);
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, userId);
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
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Verify property ownership
    const isOwner = await verifyPropertyOwnership(ctx, args.propertyId, userId);
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

    // Occupancy is derived from whether a unit has a lease that is active
    // today, not from the stored unit.status. That column is only updated when
    // a lease is created or edited, so it kept reporting "occupied" for units
    // whose leases had long since ended. "maintenance" stays a real manual
    // state — it is a decision about the unit, not a consequence of a lease.
    const propertyLeases = await ctx.db
      .query("leases")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();
    const occupiedUnitIds = new Set(
      filterActiveLeases(propertyLeases)
        .map((lease) => lease.unitId)
        .filter(Boolean)
    );

    for (const unit of units) {
      if (unit.status === "maintenance") {
        stats.maintenanceUnits++;
      } else if (occupiedUnitIds.has(unit._id)) {
        stats.occupiedUnits++;
      } else {
        stats.availableUnits++;
      }
    }

    if (stats.totalUnits > 0) {
      stats.occupancyRate = (stats.occupiedUnits / stats.totalUnits) * 100;
    }

    return stats;
  },
});