import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { logActivity, ACTIVITY_TYPES, ACTIVITY_ACTIONS } from "./activityLog";

// Rate limiting for mutations (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  addProperty: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  updateProperty: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  deleteProperty: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
} as const;

// Check rate limit for user
function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): void {
  // Cleanup expired records occasionally (every ~100 calls)
  if (Math.random() < 0.01) {
    cleanupExpiredRateLimits();
  }

  const limit = RATE_LIMITS[operation];
  const now = Date.now();
  const key = `${operation}:${userId}`;

  let record = rateLimitStore.get(key);

  // Reset if window has expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + limit.windowMs };
  }

  // Check if limit exceeded
  if (record.count >= limit.maxRequests) {
    throw new ConvexError({
      code: "RATE_LIMIT_EXCEEDED",
      message: `Too many ${operation} requests. Please wait and try again.`,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
}

// Cleanup expired rate limit records (called on each rate limit check)
function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Validation helpers
const validatePropertyType = (type: string): boolean => {
  const validTypes = [
    "Single Family",
    "Duplex",
    "Apartment",
    "Condo",
    "Townhouse",
    "Other",
  ];
  return validTypes.includes(type);
};

const validatePropertyStatus = (status: string): boolean => {
  const validStatuses = [
    "Available",
    "Occupied",
    "Maintenance",
    "Under Contract",
  ];
  return validStatuses.includes(status);
};

const validatePropertyData = (args: any) => {
  // Name validation
  if (!args.name || args.name.length < 2 || args.name.length > 100) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Property name must be between 2 and 100 characters",
      field: "name",
    });
  }

  // Address validation
  if (!args.address || args.address.length < 5 || args.address.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Address must be between 5 and 200 characters",
      field: "address",
    });
  }

  // Type validation
  if (!validatePropertyType(args.type)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Invalid property type",
      field: "type",
    });
  }

  // Status validation
  if (!validatePropertyStatus(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Invalid property status",
      field: "status",
    });
  }

  // Numeric validations
  if (
    args.bedrooms < 0 ||
    args.bedrooms > 20 ||
    !Number.isInteger(args.bedrooms)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Bedrooms must be a whole number between 0 and 20",
      field: "bedrooms",
    });
  }

  if (args.bathrooms < 0 || args.bathrooms > 20) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Bathrooms must be between 0 and 20",
      field: "bathrooms",
    });
  }

  if (
    args.squareFeet < 50 ||
    args.squareFeet > 50000 ||
    !Number.isInteger(args.squareFeet)
  ) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Square feet must be a whole number between 50 and 50,000",
      field: "squareFeet",
    });
  }

  // Date validation
  const purchaseDate = new Date(args.purchaseDate);
  const now = new Date();
  if (isNaN(purchaseDate.getTime()) || purchaseDate > now) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Purchase date must be a valid date in the past",
      field: "purchaseDate",
    });
  }

  // URL validation (if provided)
  if (args.imageUrl && args.imageUrl !== "") {
    try {
      new URL(args.imageUrl);
    } catch {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Image URL must be a valid URL",
        field: "imageUrl",
      });
    }
  }
};

// Add a property for the signed-in user
export const addProperty = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    type: v.string(),
    status: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    squareFeet: v.number(),
    purchaseDate: v.string(),
    monthlyMortgage: v.optional(v.number()),
    monthlyCapEx: v.optional(v.number()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check rate limit
    checkRateLimit(args.userId, "addProperty");

    // Validate input data
    validatePropertyData(args);

    // Check if property name already exists for this user
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("name"), args.name)
        )
      )
      .first();

    if (existingProperty) {
      throw new ConvexError({
        code: "DUPLICATE_ERROR",
        message: "A property with this name already exists",
        field: "name",
      });
    }

    try {
      const propertyId = await ctx.db.insert("properties", {
        ...args,
        createdAt: new Date().toISOString(),
      });

      // Log activity
      await logActivity(ctx, {
        userId: args.userId,
        entityType: ACTIVITY_TYPES.PROPERTY,
        entityId: propertyId,
        action: ACTIVITY_ACTIONS.CREATED,
        description: `Property "${args.name}" created`,
        metadata: { propertyName: args.name, address: args.address },
      });

      return propertyId;
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to create property",
      });
    }
  },
});

// Enhanced property creation with units and utility setup
export const createPropertyWithUnits = mutation({
  args: {
    // Basic property info
    name: v.string(),
    address: v.string(),
    type: v.string(),
    status: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    squareFeet: v.number(),
    purchaseDate: v.string(),
    monthlyMortgage: v.optional(v.number()),
    monthlyCapEx: v.optional(v.number()),
    userId: v.string(),

    // Property type and units
    propertyType: v.union(
      v.literal("single-family"),
      v.literal("multi-family")
    ),
    units: v.optional(
      v.array(
        v.object({
          identifier: v.string(),
          displayName: v.string(),
          customName: v.boolean(),
        })
      )
    ),

    // Utility setup
    setupUtilities: v.optional(v.boolean()),
    utilityPreset: v.optional(
      v.union(
        v.literal("owner-pays"),
        v.literal("tenant-pays"),
        v.literal("custom")
      )
    ),
    customSplit: v.optional(
      v.array(
        v.object({
          unitId: v.string(),
          unitName: v.string(),
          percentage: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check rate limit
    checkRateLimit(args.userId, "addProperty");

    // Validate basic property data
    validatePropertyData(args);

    // Check if property name already exists for this user
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("name"), args.name)
        )
      )
      .first();

    if (existingProperty) {
      throw new ConvexError({
        code: "DUPLICATE_ERROR",
        message: "A property with this name already exists",
        field: "name",
      });
    }

    try {
      // Create the property
      const propertyId = await ctx.db.insert("properties", {
        userId: args.userId,
        name: args.name,
        address: args.address,
        type: args.type,
        status: args.status,
        bedrooms: args.bedrooms,
        bathrooms: args.bathrooms,
        squareFeet: args.squareFeet,
        purchaseDate: args.purchaseDate,
        monthlyMortgage: args.monthlyMortgage,
        monthlyCapEx: args.monthlyCapEx,
        propertyType: args.propertyType,

        // Save utility wizard settings as property defaults
        utilityPreset: args.utilityPreset,
        utilityDefaults: args.customSplit?.map((split) => ({
          unitIdentifier: split.unitId,
          unitName: split.unitName,
          percentage: split.percentage,
        })),

        createdAt: new Date().toISOString(),
      });

      // Create units
      const units = args.units || [
        {
          identifier: "Main",
          displayName: "Main Unit",
          customName: false,
        },
      ];

      // Log activity
      await logActivity(ctx, {
        userId: args.userId,
        entityType: ACTIVITY_TYPES.PROPERTY,
        entityId: propertyId,
        action: ACTIVITY_ACTIONS.CREATED,
        description: `Property "${args.name}" created with ${units.length} unit${units.length !== 1 ? "s" : ""}`,
        metadata: {
          propertyName: args.name,
          address: args.address,
          unitsCreated: units.length,
          propertyType: args.propertyType,
        },
      });

      const createdUnits = [];
      for (const unit of units) {
        const unitId = await ctx.db.insert("units", {
          propertyId,
          unitIdentifier: unit.identifier,
          displayName: unit.displayName,
          status: "available",
          isDefault:
            unit.identifier === "Main" && args.propertyType === "single-family",
          createdAt: new Date().toISOString(),
        });

        createdUnits.push({
          id: unitId,
          identifier: unit.identifier,
          displayName: unit.displayName,
        });
      }

      // Set up utility responsibilities if requested
      if (args.setupUtilities && args.customSplit) {
        const UTILITY_TYPES = [
          "Electric",
          "Water",
          "Gas",
          "Sewer",
          "Trash",
          "Internet",
        ];

        // Legacy: Unit utility responsibilities are now managed through lease settings
        // Custom utility splits are configured when creating leases for specific units
      }

      return {
        propertyId,
        unitsCreated: createdUnits.length,
        utilitiesConfigured: args.setupUtilities,
        message: `Property created successfully with ${createdUnits.length} unit${createdUnits.length !== 1 ? "s" : ""}`,
      };
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to create property with units",
      });
    }
  },
});

// Helper function to calculate monthly rent from active leases
async function calculateMonthlyRentFromLeases(
  ctx: any,
  propertyId: string,
  userId: string
): Promise<number> {
  const activeLeases = await ctx.db
    .query("leases")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("propertyId"), propertyId),
        q.eq(q.field("userId"), userId),
        q.eq(q.field("status"), "active")
      )
    )
    .collect();

  return activeLeases.reduce(
    (total: number, lease: any) => total + (lease.rent || 0),
    0
  );
}

// Get all properties for the signed-in user with calculated monthly rent
export const getProperties = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()), // Number of properties to return
    offset: v.optional(v.number()), // Number of properties to skip
  },
  handler: async (ctx, args) => {
    const allProperties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Calculate monthly rent for each property from active leases
    const propertiesWithRent = await Promise.all(
      allProperties.map(async (property) => {
        const monthlyRent = await calculateMonthlyRentFromLeases(
          ctx,
          property._id,
          args.userId
        );
        return {
          ...property,
          monthlyRent,
        };
      })
    );

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 50; // Default to 50 if not specified

    const paginatedProperties = propertiesWithRent.slice(
      offset,
      offset + limit
    );

    return {
      properties: paginatedProperties,
      total: propertiesWithRent.length,
      hasMore: offset + limit < propertiesWithRent.length,
    };
  },
});

// Get property with units and calculated monthly rent
export const getPropertyWithUnits = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      return null;
    }

    // Calculate monthly rent from active leases
    const monthlyRent = await calculateMonthlyRentFromLeases(
      ctx,
      args.propertyId,
      args.userId
    );

    // Get all units for this property
    const units = await ctx.db
      .query("units")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    // Get active leases for each unit
    const unitsWithLeases = await Promise.all(
      units.map(async (unit) => {
        const activeLease = await ctx.db
          .query("leases")
          .withIndex("by_unit", (q) => q.eq("unitId", unit._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();
        return { ...unit, activeLease };
      })
    );

    return {
      ...property,
      monthlyRent,
      units: unitsWithLeases.sort((a, b) =>
        a.unitIdentifier.localeCompare(b.unitIdentifier)
      ),
    };
  },
});

// Convert property to multi-unit
export const convertToMultiUnit = mutation({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Property not found",
      });
    }

    if (property.userId !== args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You don't have permission to modify this property",
      });
    }

    if (property.propertyType === "multi-family") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Property is already multi-family",
      });
    }

    // Update property type
    await ctx.db.patch(args.propertyId, {
      propertyType: "multi-family",
    });

    return { success: true };
  },
});

// Update a property
export const updateProperty = mutation({
  args: {
    id: v.id("properties"),
    name: v.string(),
    address: v.string(),
    type: v.string(),
    status: v.string(),
    bedrooms: v.number(),
    bathrooms: v.number(),
    squareFeet: v.number(),
    purchaseDate: v.string(),
    monthlyMortgage: v.optional(v.number()),
    monthlyCapEx: v.optional(v.number()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check rate limit
    checkRateLimit(args.userId, "updateProperty");

    // Validate input data
    validatePropertyData(args);

    // Check if property exists and user owns it
    const property = await ctx.db.get(args.id);
    if (!property) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Property not found",
      });
    }

    if (property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to update this property",
      });
    }

    // Check for duplicate name (excluding current property)
    const existingProperty = await ctx.db
      .query("properties")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("name"), args.name),
          q.neq(q.field("_id"), args.id)
        )
      )
      .first();

    if (existingProperty) {
      throw new ConvexError({
        code: "DUPLICATE_ERROR",
        message: "A property with this name already exists",
        field: "name",
      });
    }

    try {
      await ctx.db.patch(args.id, {
        name: args.name,
        address: args.address,
        type: args.type,
        status: args.status,
        bedrooms: args.bedrooms,
        bathrooms: args.bathrooms,
        squareFeet: args.squareFeet,
        purchaseDate: args.purchaseDate,
        monthlyMortgage: args.monthlyMortgage,
        monthlyCapEx: args.monthlyCapEx,
      });

      // Log activity
      await logActivity(ctx, {
        userId: args.userId,
        entityType: ACTIVITY_TYPES.PROPERTY,
        entityId: args.id,
        action: ACTIVITY_ACTIONS.UPDATED,
        description: `Property "${args.name}" updated`,
        metadata: { propertyName: args.name, address: args.address },
      });

      return { success: true };
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to update property",
      });
    }
  },
});

// Delete a property
export const deleteProperty = mutation({
  args: { id: v.id("properties"), userId: v.string() },
  handler: async (ctx, args) => {
    // Check rate limit
    checkRateLimit(args.userId, "deleteProperty");

    // Check if property exists and user owns it
    const property = await ctx.db.get(args.id);
    if (!property) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Property not found",
      });
    }

    if (property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to delete this property",
      });
    }

    try {
      // Log activity before deletion
      await logActivity(ctx, {
        userId: args.userId,
        entityType: ACTIVITY_TYPES.PROPERTY,
        entityId: args.id,
        action: ACTIVITY_ACTIONS.DELETED,
        description: `Property "${property.name}" deleted`,
        metadata: { propertyName: property.name, address: property.address },
      });

      // Delete all associated data in correct order to maintain referential integrity

      // 1. Delete all leases (including documents associated with leases)
      const leases = await ctx.db
        .query("leases")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();

      for (const lease of leases) {
        // Delete lease documents
        const leaseDocuments = await ctx.db
          .query("documents")
          .filter((q) => q.eq(q.field("leaseId"), lease._id))
          .collect();

        for (const doc of leaseDocuments) {
          if (doc.userId === args.userId) {
            // Only delete user's documents
            await ctx.db.delete(doc._id);
          }
        }

        // Delete utility payments for this lease (no longer delete charges since they're calculated on-demand)
        const utilityPayments = await ctx.db
          .query("utilityPayments")
          .filter((q) => q.eq(q.field("leaseId"), lease._id))
          .collect();

        for (const payment of utilityPayments) {
          await ctx.db.delete(payment._id);
        }

        // Delete lease utility settings for this lease
        const leaseUtilitySettings = await ctx.db
          .query("leaseUtilitySettings")
          .filter((q) => q.eq(q.field("leaseId"), lease._id))
          .collect();

        for (const setting of leaseUtilitySettings) {
          await ctx.db.delete(setting._id);
        }

        // Delete the lease itself
        if (lease.userId === args.userId) {
          // Only delete user's leases
          await ctx.db.delete(lease._id);
        }
      }

      // 2. Delete property images
      const propertyImages = await ctx.db
        .query("propertyImages")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();

      for (const image of propertyImages) {
        if (image.userId === args.userId) {
          // Only delete user's images
          await ctx.db.delete(image._id);
        }
      }

      // 3. Delete property documents
      const documents = await ctx.db
        .query("documents")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();

      for (const document of documents) {
        if (document.userId === args.userId) {
          // Only delete user's documents
          await ctx.db.delete(document._id);
        }
      }

      // 4. Delete utility bills for this property
      const utilityBills = await ctx.db
        .query("utilityBills")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();

      for (const bill of utilityBills) {
        if (bill.userId === args.userId) {
          // Only delete user's bills
          await ctx.db.delete(bill._id);
        }
      }

      // 5. Delete lease utility settings for this property
      // Lease utility settings are deleted through lease deletion above

      // 6. Delete units for this property
      const units = await ctx.db
        .query("units")
        .withIndex("by_property", (q) => q.eq("propertyId", args.id))
        .collect();

      for (const unit of units) {
        await ctx.db.delete(unit._id);
      }

      // 7. Finally delete the property itself
      await ctx.db.delete(args.id);

      return {
        success: true,
        message: `Property "${property.name}" and all associated data have been deleted successfully.`,
      };
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to delete property",
      });
    }
  },
});

// Get a single property by ID for the signed-in user with calculated monthly rent
export const getProperty = query({
  args: { id: v.id("properties"), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const property = await ctx.db.get(args.id);
      if (!property || property.userId !== args.userId) {
        return null;
      }

      // Calculate monthly rent from active leases
      const monthlyRent = await calculateMonthlyRentFromLeases(
        ctx,
        args.id,
        args.userId
      );

      return {
        ...property,
        monthlyRent,
      };
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to retrieve property",
      });
    }
  },
});
