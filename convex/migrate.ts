import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration: Move legacy lease documents to relational document system
export const migrateLegacyLeaseDocuments = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean()) // Set to true to see what would be migrated without doing it
  },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    let migrated = 0;
    let skipped = 0;
    let errors: Array<{ leaseId: string; tenantName: string; error: string }> = [];
    
    for (const lease of leases) {
      // Skip if no legacy document URL
      if (!lease.leaseDocumentUrl) {
        continue;
      }
      
      // Check if document already exists in new system
      const existingDoc = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("leaseId"), lease._id))
        .first();
      
      if (existingDoc) {
        skipped++;
        continue; // Already migrated
      }
      
      try {
        if (!args.dryRun) {
          // Create document record from legacy URL/storageId
          await ctx.db.insert("documents", {
            userId: args.userId,
            storageId: lease.leaseDocumentUrl, // This could be URL or storageId
            name: `${lease.tenantName} - Lease Agreement`,
            type: "lease",
            propertyId: lease.propertyId,
            leaseId: lease._id,
            fileSize: 0, // We don't have this info from legacy
            mimeType: "application/pdf", // Assume PDF
            uploadedAt: lease.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: "Migrated from legacy lease document field",
            tags: ["lease", "legal", "migrated"],
          });
        }
        migrated++;
      } catch (error) {
        errors.push({ 
          leaseId: lease._id, 
          tenantName: lease.tenantName,
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
    
    return { 
      summary: {
        totalLeases: leases.length,
        withLegacyDocs: leases.filter(l => l.leaseDocumentUrl).length,
        migrated,
        skipped,
        errors: errors.length
      },
      errors,
      dryRun: args.dryRun || false
    };
  },
});

// Cleanup: Remove legacy leaseDocumentUrl field after migration
export const cleanupLegacyLeaseDocuments = mutation({
  args: { 
    userId: v.string(),
    confirmCleanup: v.boolean() // Safety check
  },
  handler: async (ctx, args) => {
    if (!args.confirmCleanup) {
      throw new Error("Must confirm cleanup by setting confirmCleanup to true");
    }
    
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("leaseDocumentUrl"), undefined))
      .collect();
    
    let cleaned = 0;
    
    for (const lease of leases) {
      // Verify document exists in new system before removing legacy reference
      const newDoc = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("leaseId"), lease._id))
        .first();
      
      if (newDoc) {
        // Remove the leaseDocumentUrl field
        await ctx.db.patch(lease._id, {
          leaseDocumentUrl: undefined
        });
        cleaned++;
      }
    }
    
    return { cleaned };
  },
});

// Cleanup: Remove duplicate lease documents
export const cleanupDuplicateLeaseDocuments = mutation({
  args: { 
    userId: v.string(),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "lease"))
      .collect();
    
    // Group documents by leaseId
    const documentsByLease: Record<string, any[]> = {};
    documents.forEach(doc => {
      if (doc.leaseId) {
        if (!documentsByLease[doc.leaseId]) {
          documentsByLease[doc.leaseId] = [];
        }
        documentsByLease[doc.leaseId].push(doc);
      }
    });
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    const duplicates = [];
    
    // Find leases with multiple documents
    for (const [leaseId, docs] of Object.entries(documentsByLease)) {
      if (docs.length > 1) {
        duplicatesFound += docs.length - 1;
        
        // Sort by creation date, keep the most recent one
        docs.sort((a, b) => 
          new Date(b.uploadedAt || b._creationTime).getTime() - 
          new Date(a.uploadedAt || a._creationTime).getTime()
        );
        
        const [keepDoc, ...removeDocs] = docs;
        
        for (const removeDoc of removeDocs) {
          duplicates.push({
            leaseId,
            documentId: removeDoc._id,
            name: removeDoc.name,
            storageId: removeDoc.storageId
          });
          
          if (!args.dryRun) {
            await ctx.db.delete(removeDoc._id);
            duplicatesRemoved++;
          }
        }
      }
    }
    
    return {
      duplicatesFound,
      duplicatesRemoved,
      duplicates,
      dryRun: args.dryRun || false
    };
  },
});

// Validation: Check migration status
export const validateMigration = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const leases = await ctx.db
      .query("leases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("type"), "lease"))
      .collect();
    
    const leasesWithLegacyDocs = leases.filter(l => l.leaseDocumentUrl);
    const leasesWithNewDocs = leases.filter(l => 
      documents.some(d => d.leaseId === l._id)
    );
    
    return {
      totalLeases: leases.length,
      leasesWithLegacyDocs: leasesWithLegacyDocs.length,
      leasesWithNewDocs: leasesWithNewDocs.length,
      legacyDocuments: leasesWithLegacyDocs.map(l => ({
        leaseId: l._id,
        tenantName: l.tenantName,
        documentUrl: l.leaseDocumentUrl
      })),
      migrationComplete: leasesWithLegacyDocs.length === 0
    };
  },
});