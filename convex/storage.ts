import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Check if user is authenticated (you might want to add user validation here)
    
    // Generate a storage URL that expires in 1 hour
    const uploadUrl = await ctx.storage.generateUploadUrl();
    
    return uploadUrl;
  },
});

// Get download URL for a stored file
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.storageId);
      return url;
    } catch (error) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found"
      });
    }
  },
});

// Delete a file from storage
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.storageId);
    } catch (error) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found"
      });
    }
  },
});