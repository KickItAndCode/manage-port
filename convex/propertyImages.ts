import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Get all images for a property
export const getPropertyImages = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("propertyImages")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Sort by order, then by upload date
    return images.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined && b.order === undefined) return -1;
      if (a.order === undefined && b.order !== undefined) return 1;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  },
});

// Get cover image for a property
export const getCoverImage = query({
  args: {
    propertyId: v.id("properties"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const coverImage = await ctx.db
      .query("propertyImages")
      .withIndex("by_cover", (q) => 
        q.eq("propertyId", args.propertyId).eq("isCover", true)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    return coverImage;
  },
});

// Add property image
export const addPropertyImage = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    storageId: v.string(),
    name: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    description: v.optional(v.string()),
    isCover: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to add images to this property"
      });
    }

    // Validate image type
    if (!args.mimeType.startsWith("image/")) {
      throw new ConvexError({
        code: "VALIDATION_ERROR", 
        message: "Only image files are allowed"
      });
    }

    // If this is set as cover image, remove cover status from other images
    if (args.isCover) {
      const existingCover = await ctx.db
        .query("propertyImages")
        .withIndex("by_cover", (q) => 
          q.eq("propertyId", args.propertyId).eq("isCover", true)
        )
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();

      if (existingCover) {
        await ctx.db.patch(existingCover._id, { isCover: false });
      }
    }

    // Get the next order number
    const existingImages = await ctx.db
      .query("propertyImages")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const maxOrder = Math.max(...existingImages.map(img => img.order || 0), 0);

    return await ctx.db.insert("propertyImages", {
      userId: args.userId,
      propertyId: args.propertyId,
      storageId: args.storageId,
      name: args.name,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      description: args.description,
      isCover: args.isCover || false,
      order: maxOrder + 1,
      uploadedAt: new Date().toISOString(),
    });
  },
});

// Set cover image
export const setCoverImage = mutation({
  args: {
    userId: v.string(),
    imageId: v.id("propertyImages"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image || image.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to modify this image"
      });
    }

    // Remove cover status from other images for this property
    const existingCover = await ctx.db
      .query("propertyImages")
      .withIndex("by_cover", (q) => 
        q.eq("propertyId", image.propertyId).eq("isCover", true)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingCover && existingCover._id !== args.imageId) {
      await ctx.db.patch(existingCover._id, { isCover: false });
    }

    // Set this image as cover
    await ctx.db.patch(args.imageId, { 
      isCover: true,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Update image details
export const updatePropertyImage = mutation({
  args: {
    userId: v.string(),
    imageId: v.id("propertyImages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image || image.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to modify this image"
      });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.imageId, updates);
  },
});

// Delete property image
export const deletePropertyImage = mutation({
  args: {
    userId: v.string(),
    imageId: v.id("propertyImages"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image || image.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to delete this image"
      });
    }

    await ctx.db.delete(args.imageId);
    
    // TODO: Also delete from Convex storage
    // Note: Convex doesn't currently have a direct way to delete files from storage
    // This should be handled by a cleanup job or manual process
  },
});

// Reorder images
export const reorderImages = mutation({
  args: {
    userId: v.string(),
    propertyId: v.id("properties"),
    imageOrders: v.array(v.object({
      imageId: v.id("propertyImages"),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Verify the property belongs to the user
    const property = await ctx.db.get(args.propertyId);
    if (!property || property.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to reorder images for this property"
      });
    }

    // Update all image orders
    for (const { imageId, order } of args.imageOrders) {
      const image = await ctx.db.get(imageId);
      if (image && image.userId === args.userId && image.propertyId === args.propertyId) {
        await ctx.db.patch(imageId, { 
          order,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  },
});

// Get property image statistics
export const getImageStats = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("propertyImages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.propertyId) {
      query = query.filter((q) => q.eq(q.field("propertyId"), args.propertyId));
    }

    const images = await query.collect();

    const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
    const imagesByProperty = images.reduce((acc, img) => {
      acc[img.propertyId] = (acc[img.propertyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalImages: images.length,
      totalSize,
      imagesByProperty,
      averageSize: images.length > 0 ? totalSize / images.length : 0,
    };
  },
});