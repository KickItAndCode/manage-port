import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Rate limiting for mutations (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  addProperty: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  updateProperty: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  deleteProperty: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
} as const;

// Check rate limit for user
function checkRateLimit(userId: string, operation: keyof typeof RATE_LIMITS): void {
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
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
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
  const validTypes = ["Single Family", "Duplex", "Apartment", "Condo", "Townhouse", "Other"];
  return validTypes.includes(type);
};

const validatePropertyStatus = (status: string): boolean => {
  const validStatuses = ["Available", "Occupied", "Maintenance", "Under Contract"];
  return validStatuses.includes(status);
};

const validatePropertyData = (args: any) => {
  // Name validation
  if (!args.name || args.name.length < 2 || args.name.length > 100) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Property name must be between 2 and 100 characters",
      field: "name"
    });
  }

  // Address validation
  if (!args.address || args.address.length < 5 || args.address.length > 200) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Address must be between 5 and 200 characters",
      field: "address"
    });
  }

  // Type validation
  if (!validatePropertyType(args.type)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Invalid property type",
      field: "type"
    });
  }

  // Status validation
  if (!validatePropertyStatus(args.status)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Invalid property status",
      field: "status"
    });
  }

  // Numeric validations
  if (args.bedrooms < 0 || args.bedrooms > 20 || !Number.isInteger(args.bedrooms)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Bedrooms must be a whole number between 0 and 20",
      field: "bedrooms"
    });
  }

  if (args.bathrooms < 0 || args.bathrooms > 20) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Bathrooms must be between 0 and 20",
      field: "bathrooms"
    });
  }

  if (args.squareFeet < 50 || args.squareFeet > 50000 || !Number.isInteger(args.squareFeet)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Square feet must be a whole number between 50 and 50,000",
      field: "squareFeet"
    });
  }

  if (args.monthlyRent < 0 || args.monthlyRent > 100000) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Monthly rent must be between $0 and $100,000",
      field: "monthlyRent"
    });
  }

  // Date validation
  const purchaseDate = new Date(args.purchaseDate);
  const now = new Date();
  if (isNaN(purchaseDate.getTime()) || purchaseDate > now) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Purchase date must be a valid date in the past",
      field: "purchaseDate"
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
        field: "imageUrl"
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
    monthlyRent: v.number(),
    purchaseDate: v.string(),
    imageUrl: v.optional(v.string()),
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
        field: "name"
      });
    }

    try {
      return await ctx.db.insert("properties", {
        ...args,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to create property"
      });
    }
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
    monthlyRent: v.number(),
    purchaseDate: v.string(),
    imageUrl: v.optional(v.string()),
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
        message: "Property not found"
      });
    }
    
    if (property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to update this property"
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
        field: "name"
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
        monthlyRent: args.monthlyRent,
        purchaseDate: args.purchaseDate,
        imageUrl: args.imageUrl,
      });
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to update property"
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
        message: "Property not found"
      });
    }
    
    if (property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to delete this property"
      });
    }

    // Check for active leases
    const activeLeases = await ctx.db
      .query("leases")
      .filter((q) => 
        q.and(
          q.eq(q.field("propertyId"), args.id),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    if (activeLeases.length > 0) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Cannot delete property with active leases"
      });
    }

    try {
      // Delete associated utilities first
      const utilities = await ctx.db
        .query("utilities")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();
      
      for (const utility of utilities) {
        await ctx.db.delete(utility._id);
      }

      // Delete associated documents
      const documents = await ctx.db
        .query("documents")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();
      
      for (const document of documents) {
        await ctx.db.delete(document._id);
      }

      // Delete expired leases
      const expiredLeases = await ctx.db
        .query("leases")
        .filter((q) => q.eq(q.field("propertyId"), args.id))
        .collect();
      
      for (const lease of expiredLeases) {
        await ctx.db.delete(lease._id);
      }

      // Finally delete the property
      await ctx.db.delete(args.id);
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to delete property"
      });
    }
  },
});

// Get a single property by ID for the signed-in user
export const getProperty = query({
  args: { id: v.id("properties"), userId: v.string() },
  handler: async (ctx, args) => {
    try {
      const property = await ctx.db.get(args.id);
      if (!property || property.userId !== args.userId) {
        return null;
      }
      return property;
    } catch (error) {
      throw new ConvexError({
        code: "DATABASE_ERROR",
        message: "Failed to retrieve property"
      });
    }
  },
}); 