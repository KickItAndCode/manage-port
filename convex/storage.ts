import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./lib/auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Storage ids are opaque handles, but they are not secret: they appear in
 * document and image records. Anyone holding one could previously mint a
 * download URL or delete the underlying file, so every entry point here
 * confirms the caller owns a row that references the id.
 */
async function requireStorageOwner(
  ctx: QueryCtx | MutationCtx,
  storageId: string
): Promise<void> {
  const userId = await requireUser(ctx);

  const ownedDocument = await ctx.db
    .query("documents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("storageId"), storageId))
    .first();
  if (ownedDocument) return;

  const ownedImage = await ctx.db
    .query("propertyImages")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("storageId"), storageId))
    .first();
  if (ownedImage) return;

  // Same error as a genuinely missing file so ids cannot be probed.
  throw new ConvexError({ code: "NOT_FOUND", message: "File not found" });
}

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireUser(ctx);

    // Generate a storage URL that expires in 1 hour
    const uploadUrl = await ctx.storage.generateUploadUrl();

    return uploadUrl;
  },
});

// Get download URL for a stored file
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireStorageOwner(ctx, args.storageId);

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({ code: "NOT_FOUND", message: "File not found" });
    }
    return url;
  },
});

// Delete a file from storage
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireStorageOwner(ctx, args.storageId);

    try {
      await ctx.storage.delete(args.storageId);
    } catch (error) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "File not found",
      });
    }
  },
});
