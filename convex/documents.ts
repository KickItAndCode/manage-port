import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Document type definitions
export const DOCUMENT_TYPES = {
  LEASE: "lease",
  UTILITY: "utility", 
  PROPERTY: "property",
  INSURANCE: "insurance",
  TAX: "tax",
  MAINTENANCE: "maintenance",
  OTHER: "other",
} as const;

export const DOCUMENT_CATEGORIES = {
  FINANCIAL: "financial",
  LEGAL: "legal",
  MAINTENANCE: "maintenance",
  INSURANCE: "insurance",
  TAX: "tax",
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
    utilityId: v.optional(v.id("utilities")),
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
    if (args.category) {
      documents = documents.filter(doc => doc.category === args.category);
    }
    if (args.propertyId) {
      documents = documents.filter(doc => doc.propertyId === args.propertyId);
    }
    if (args.leaseId) {
      documents = documents.filter(doc => doc.leaseId === args.leaseId);
    }
    if (args.utilityId) {
      documents = documents.filter(doc => doc.utilityId === args.utilityId);
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
    url: v.string(),
    name: v.string(),
    type: v.string(),
    category: v.optional(v.string()),
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    utilityId: v.optional(v.id("utilities")),
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

    // Validate category if provided
    if (args.category && !Object.values(DOCUMENT_CATEGORIES).includes(args.category as any)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Invalid document category",
        field: "category"
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

    return await ctx.db.insert("documents", {
      ...args,
      uploadedAt: new Date().toISOString(),
    });
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
    utilityId: v.optional(v.id("utilities")),
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
    if (args.utilityId !== undefined) updates.utilityId = args.utilityId;
    if (args.expiryDate !== undefined) updates.expiryDate = args.expiryDate;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.url !== undefined) updates.url = args.url;
    if (args.fileSize !== undefined) updates.fileSize = args.fileSize;
    if (args.mimeType !== undefined) updates.mimeType = args.mimeType;

    await ctx.db.patch(args.id, updates);
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
    // Find document by storage ID (stored in url field)
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const document = documents.find(doc => doc.url === args.storageId);
    
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
      
      // Count by category
      if (doc.category) {
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
      }
      
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