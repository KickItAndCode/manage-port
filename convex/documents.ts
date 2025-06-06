import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Document type definitions
export const DOCUMENT_TYPES = {
  LEASE: "lease",
  UTILITY_BILL: "utility_bill", 
  PROPERTY: "property",
  INSURANCE: "insurance",
  TAX: "tax",
  MAINTENANCE: "maintenance",
  OTHER: "other",
} as const;

// Get documents with advanced filtering
export const getDocuments = query({
  args: {
    userId: v.string(),
    type: v.optional(v.string()),
    category: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    search: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Apply filters
    if (args.type) {
      documents = documents.filter(doc => doc.type === args.type);
    }
    // Category filtering removed - using type-based classification
    if (args.propertyId) {
      documents = documents.filter(doc => doc.propertyId === args.propertyId);
    }
    if (args.leaseId) {
      documents = documents.filter(doc => doc.leaseId === args.leaseId);
    }
    
    // Search in name and notes
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      documents = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchLower) ||
        (doc.notes && doc.notes.toLowerCase().includes(searchLower)) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      documents = documents.filter(doc => 
        doc.tags && args.tags!.some(tag => doc.tags!.includes(tag))
      );
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return documents;
  },
});

// Get image documents for a property (for quick image access from documents page)
export const getImageDocuments = query({
  args: {
    userId: v.string(),
    propertyId: v.optional(v.id("properties")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    if (args.propertyId) {
      query = query.filter((q) => q.eq(q.field("propertyId"), args.propertyId));
    }

    const documents = await query.collect();

    // Filter for image documents only
    const imageDocuments = documents.filter(doc => 
      doc.mimeType && doc.mimeType.startsWith("image/")
    );

    // Sort by upload date (newest first)
    imageDocuments.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return imageDocuments;
  },
});

// Get documents expiring soon
export const getExpiringDocuments = query({
  args: {
    userId: v.string(),
    daysAhead: v.optional(v.number()), // default 30 days
  },
  handler: async (ctx, args) => {
    const daysAhead = args.daysAhead || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    return documents.filter(doc => {
      if (!doc.expiryDate) return false;
      const expiryDate = new Date(doc.expiryDate);
      return expiryDate <= futureDate && expiryDate >= new Date();
    }).sort((a, b) => 
      new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
    );
  },
});

// Add document with enhanced metadata
export const addDocument = mutation({
  args: {
    userId: v.string(),
    url: v.string(), // Keep url for backward compatibility, will map to storageId
    name: v.string(),
    type: v.string(),
    category: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    utilityBillId: v.optional(v.id("utilityBills")),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate document type
    if (!Object.values(DOCUMENT_TYPES).includes(args.type as any)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Invalid document type",
        field: "type"
      });
    }

    // Validate expiry date if provided
    if (args.expiryDate) {
      const expiry = new Date(args.expiryDate);
      if (isNaN(expiry.getTime())) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "Invalid expiry date",
          field: "expiryDate"
        });
      }
    }

    // Map url to storageId for new schema compatibility
    const documentData = {
      userId: args.userId,
      storageId: args.url, // Map url to storageId
      name: args.name,
      type: args.type,
      propertyId: args.propertyId,
      leaseId: args.leaseId,
      utilityBillId: args.utilityBillId,
      fileSize: args.fileSize || 0,
      mimeType: args.mimeType || "application/octet-stream",
      expiryDate: args.expiryDate,
      tags: args.tags,
      notes: args.notes,
      uploadedAt: new Date().toISOString(),
    };

    return await ctx.db.insert("documents", documentData);
  },
});

// Update document metadata
export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    category: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    expiryDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    url: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to update this document"
      });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Only update provided fields
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.category !== undefined) updates.category = args.category;
    if (args.propertyId !== undefined) updates.propertyId = args.propertyId;
    if (args.leaseId !== undefined) updates.leaseId = args.leaseId;
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.url !== undefined) updates.url = args.url;
    if (args.fileSize !== undefined) updates.fileSize = args.fileSize;
    if (args.mimeType !== undefined) updates.mimeType = args.mimeType;

    await ctx.db.patch(args.id, updates);
  },
});

// Get documents by lease ID
export const getDocumentsByLease = query({
  args: {
    leaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("leaseId"), args.leaseId))
      .collect();
  },
});

// Link document to lease by storage ID
export const linkDocumentToLease = mutation({
  args: {
    storageId: v.string(),
    leaseId: v.id("leases"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find document by storage ID (now stored in storageId field)
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const document = documents.find(doc => doc.storageId === args.storageId);
    
    if (!document) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Document not found"
      });
    }
    
    // Update document to link to lease
    await ctx.db.patch(document._id, {
      leaseId: args.leaseId,
      updatedAt: new Date().toISOString(),
    });
    
    return document._id;
  },
});

// Delete document
export const deleteDocument = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You don't have permission to delete this document"
      });
    }
    await ctx.db.delete(args.id);
  },
});

// Get document statistics
export const getDocumentStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = {
      totalDocuments: documents.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      totalSize: 0,
      expiringThisMonth: 0,
    };

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    documents.forEach(doc => {
      // Count by type
      stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;
      
      // Category tracking removed - using type-based classification
      
      // Sum file sizes
      if (doc.fileSize) {
        stats.totalSize += doc.fileSize;
      }
      
      // Count expiring documents
      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        if (expiryDate <= nextMonth && expiryDate >= new Date()) {
          stats.expiringThisMonth++;
        }
      }
    });

    return stats;
  },
});

// ========== NEW DOCUMENT MANAGEMENT FUNCTIONS ==========

// Create document with new schema
export const createDocument = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    folderId: v.optional(v.id("documentFolders")),
    type: v.string(),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    utilityBillId: v.optional(v.id("utilityBills")),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must be authenticated to upload documents"
      });
    }

    // Verify folder exists and belongs to user if folderId is provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new Error("Folder not found");
      if (folder.userId !== identity.subject) throw new Error("Unauthorized");
    }

    // Verify property exists and belongs to user if propertyId is provided
    if (args.propertyId) {
      const property = await ctx.db.get(args.propertyId);
      if (!property) throw new Error("Property not found");
      if (property.userId !== identity.subject) throw new Error("Unauthorized");
    }

    // Verify lease exists and belongs to user if leaseId is provided
    if (args.leaseId) {
      const lease = await ctx.db.get(args.leaseId);
      if (!lease) throw new Error("Lease not found");
      if (lease.userId !== identity.subject) throw new Error("Unauthorized");
    }

    // Verify utility bill exists and belongs to user if utilityBillId is provided
    if (args.utilityBillId) {
      const utilityBill = await ctx.db.get(args.utilityBillId);
      if (!utilityBill) throw new Error("Utility bill not found");
      if (utilityBill.userId !== identity.subject) throw new Error("Unauthorized");
    }

    return await ctx.db.insert("documents", {
      userId: identity.subject,
      storageId: args.storageId,
      name: args.name,
      folderId: args.folderId,
      type: args.type,
      propertyId: args.propertyId,
      leaseId: args.leaseId,
      utilityBillId: args.utilityBillId,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedAt: new Date().toISOString(),
      expiryDate: args.expiryDate,
      tags: args.tags,
      notes: args.notes,
      thumbnailUrl: args.thumbnailUrl,
    });
  },
});

// Get documents by folder (for tree structure)
export const getDocumentsByFolder = query({
  args: {
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId ?? undefined))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    return documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },
});

// Get documents by utility bill
export const getDocumentsByUtilityBill = query({
  args: {
    utilityBillId: v.id("utilityBills"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_utility_bill", (q) => q.eq("utilityBillId", args.utilityBillId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

// Get documents by property
export const getDocumentsByProperty = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

// Move document to folder
export const moveDocument = mutation({
  args: {
    id: v.id("documents"),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== identity.subject) throw new Error("Unauthorized");

    // Verify folder exists and belongs to user if folderId is provided
    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      if (!folder) throw new Error("Folder not found");
      if (folder.userId !== identity.subject) throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      folderId: args.folderId,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Search documents with new schema
export const searchDocuments = query({
  args: {
    searchTerm: v.string(),
    type: v.optional(v.string()),
    folderId: v.optional(v.id("documentFolders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    // Filter by type if provided
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }

    // Filter by folder if provided
    if (args.folderId !== undefined) {
      query = query.filter((q) => q.eq(q.field("folderId"), args.folderId));
    }

    const documents = await query.collect();

    // Filter by search term (simple text search)
    const searchTerm = args.searchTerm.toLowerCase();
    const filteredDocuments = documents.filter((doc) => {
      const nameMatch = doc.name.toLowerCase().includes(searchTerm);
      const notesMatch = doc.notes?.toLowerCase().includes(searchTerm) || false;
      const tagsMatch = doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) || false;
      
      return nameMatch || notesMatch || tagsMatch;
    });

    return filteredDocuments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },
});

// Bulk delete documents
export const bulkDeleteDocuments = mutation({
  args: {
    documentIds: v.array(v.id("documents")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const deletedCount = { success: 0, failed: 0 };
    
    for (const docId of args.documentIds) {
      try {
        const doc = await ctx.db.get(docId);
        if (!doc || doc.userId !== args.userId) {
          deletedCount.failed++;
          continue;
        }
        
        await ctx.db.delete(docId);
        deletedCount.success++;
      } catch (error) {
        deletedCount.failed++;
      }
    }
    
    return deletedCount;
  },
});