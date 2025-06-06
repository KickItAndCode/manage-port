import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new folder
export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("documentFolders")),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Build the path based on parent folder
    let path = args.name;
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) throw new Error("Parent folder not found");
      if (parent.userId !== identity.subject) throw new Error("Unauthorized");
      path = `${parent.path}/${args.name}`;
    }

    // Check for duplicate folder names at the same level
    const existing = await ctx.db
      .query("documentFolders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => 
        q.and(
          q.eq(q.field("name"), args.name),
          q.eq(q.field("parentId"), args.parentId ?? null)
        )
      )
      .first();

    if (existing) {
      throw new Error("A folder with this name already exists at this location");
    }

    // Get the next order number
    const siblings = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId ?? undefined))
      .collect();
    
    const maxOrder = siblings.reduce((max, folder) => 
      Math.max(max, folder.order ?? 0), 0
    );

    return await ctx.db.insert("documentFolders", {
      userId: identity.subject,
      name: args.name,
      parentId: args.parentId,
      path,
      color: args.color,
      icon: args.icon,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
  },
});

// Get all folders for the current user
export const getFolders = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return folders;
  },
});

// Get folders by parent (for tree structure)
export const getFoldersByParent = query({
  args: {
    parentId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("parentId"), args.parentId ?? null))
      .collect();

    return folders.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

// Update folder
export const updateFolder = mutation({
  args: {
    id: v.id("documentFolders"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const folder = await ctx.db.get(args.id);
    if (!folder) throw new Error("Folder not found");
    if (folder.userId !== identity.subject) throw new Error("Unauthorized");

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
      // Update path if name changes
      updates.path = folder.parentId 
        ? folder.path.replace(/\/[^\/]+$/, `/${args.name}`)
        : args.name;
    }
    if (args.color !== undefined) updates.color = args.color;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.id, updates);

    // If name changed, update paths of all descendant folders
    if (args.name !== undefined && args.name !== folder.name) {
      await updateDescendantPaths(ctx, args.id, folder.path, updates.path);
    }
  },
});

// Delete folder (and optionally its contents)
export const deleteFolder = mutation({
  args: {
    id: v.id("documentFolders"),
    deleteContents: v.boolean(), // If true, delete all documents in folder
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const folder = await ctx.db.get(args.id);
    if (!folder) throw new Error("Folder not found");
    if (folder.userId !== identity.subject) throw new Error("Unauthorized");

    // Check if folder has subfolders
    const subfolders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    if (subfolders.length > 0) {
      throw new Error("Cannot delete folder with subfolders");
    }

    // Check if folder has documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();

    if (documents.length > 0 && !args.deleteContents) {
      throw new Error("Folder contains documents. Set deleteContents to true to delete them.");
    }

    // Delete documents if requested
    if (args.deleteContents) {
      for (const doc of documents) {
        await ctx.db.delete(doc._id);
        // Note: You may want to also delete the storage file here
      }
    }

    await ctx.db.delete(args.id);
  },
});

// Helper function to update descendant folder paths
async function updateDescendantPaths(
  ctx: any,
  folderId: any,
  oldPath: string,
  newPath: string
) {
  const children = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q: any) => q.eq("parentId", folderId))
    .collect();

  for (const child of children) {
    const updatedPath = child.path.replace(oldPath, newPath);
    await ctx.db.patch(child._id, { 
      path: updatedPath,
      updatedAt: new Date().toISOString(),
    });
    await updateDescendantPaths(ctx, child._id, child.path, updatedPath);
  }
}