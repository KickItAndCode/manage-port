import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Admin function to clear all database data
export const clearAllData = mutation({
  args: {
    userId: v.string(),
    confirmationPhrase: v.string(), // Must match "DELETE ALL DATA" for safety
  },
  handler: async (ctx, args) => {
    // Safety check - only allow if confirmation phrase is correct
    if (args.confirmationPhrase !== "DELETE ALL DATA") {
      throw new Error("Invalid confirmation phrase. Must be 'DELETE ALL DATA'");
    }

    // Get all table data for the user
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const leases = await ctx.db
      .query("leases")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const utilityBills = await ctx.db
      .query("utilityBills")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const userSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Get related data through associations
    const propertyIds = properties.map(p => p._id);
    const leaseIds = leases.map(l => l._id);
    const billIds = utilityBills.map(b => b._id);

    // Get units for user's properties
    const allUnits = await ctx.db.query("units").collect();
    const units = allUnits.filter(unit => propertyIds.includes(unit.propertyId));

    // Get property images for user's properties
    const allPropertyImages = await ctx.db.query("propertyImages").collect();
    const propertyImages = allPropertyImages.filter(img => propertyIds.includes(img.propertyId));

    // Get utility payments for user's bills
    const allUtilityPayments = await ctx.db.query("utilityPayments").collect();
    const utilityPayments = allUtilityPayments.filter(payment => billIds.includes(payment.utilityBillId));

    // Get lease utility settings for user's leases
    const allLeaseUtilitySettings = await ctx.db.query("leaseUtilitySettings").collect();
    const leaseUtilitySettings = allLeaseUtilitySettings.filter(setting => leaseIds.includes(setting.leaseId));

    // Get document folders for user
    const allDocumentFolders = await ctx.db.query("documentFolders").collect();
    const documentFolders = allDocumentFolders.filter(folder => 
      folder.userId === args.userId
    );

    let deletedCount = 0;

    // Delete all data in dependency order (child records first)
    
    // 1. Delete document folders
    for (const folder of documentFolders) {
      await ctx.db.delete(folder._id);
      deletedCount++;
    }

    // 2. Delete documents
    for (const doc of documents) {
      await ctx.db.delete(doc._id);
      deletedCount++;
    }

    // 3. Delete property images
    for (const img of propertyImages) {
      await ctx.db.delete(img._id);
      deletedCount++;
    }

    // 4. Delete utility payments
    for (const payment of utilityPayments) {
      await ctx.db.delete(payment._id);
      deletedCount++;
    }

    // 5. Delete utility bills
    for (const bill of utilityBills) {
      await ctx.db.delete(bill._id);
      deletedCount++;
    }

    // 6. Delete lease utility settings
    for (const setting of leaseUtilitySettings) {
      await ctx.db.delete(setting._id);
      deletedCount++;
    }

    // 7. Delete leases
    for (const lease of leases) {
      await ctx.db.delete(lease._id);
      deletedCount++;
    }

    // 8. Delete units
    for (const unit of units) {
      await ctx.db.delete(unit._id);
      deletedCount++;
    }

    // 9. Delete properties
    for (const property of properties) {
      await ctx.db.delete(property._id);
      deletedCount++;
    }

    // 10. Delete user settings
    for (const setting of userSettings) {
      await ctx.db.delete(setting._id);
      deletedCount++;
    }

    return {
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} records for user ${args.userId}`,
      breakdown: {
        properties: properties.length,
        units: units.length,
        leases: leases.length,
        documents: documents.length,
        documentFolders: documentFolders.length,
        propertyImages: propertyImages.length,
        utilityBills: utilityBills.length,
        utilityPayments: utilityPayments.length,
        leaseUtilitySettings: leaseUtilitySettings.length,
        userSettings: userSettings.length,
      }
    };
  },
});

// Query to get data counts for preview
export const getDataCounts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const properties = await ctx.db
      .query("properties")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const leases = await ctx.db
      .query("leases")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const documents = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const utilityBills = await ctx.db
      .query("utilityBills")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const userSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Get related data through associations
    const propertyIds = properties.map(p => p._id);
    const leaseIds = leases.map(l => l._id);
    const billIds = utilityBills.map(b => b._id);

    // Get units count for user's properties
    const allUnits = await ctx.db.query("units").collect();
    const units = allUnits.filter(unit => propertyIds.includes(unit.propertyId));

    // Get property images count
    const allPropertyImages = await ctx.db.query("propertyImages").collect();
    const propertyImages = allPropertyImages.filter(img => propertyIds.includes(img.propertyId));

    // Get utility payments count
    const allUtilityPayments = await ctx.db.query("utilityPayments").collect();
    const utilityPayments = allUtilityPayments.filter(payment => billIds.includes(payment.utilityBillId));

    // Get lease utility settings count
    const allLeaseUtilitySettings = await ctx.db.query("leaseUtilitySettings").collect();
    const leaseUtilitySettings = allLeaseUtilitySettings.filter(setting => leaseIds.includes(setting.leaseId));

    // Get document folders count
    const allDocumentFolders = await ctx.db.query("documentFolders").collect();
    const documentFolders = allDocumentFolders.filter(folder => 
      folder.userId === args.userId
    );

    const totalCount = properties.length + units.length + leases.length + 
                     documents.length + documentFolders.length + propertyImages.length +
                     utilityBills.length + utilityPayments.length +
                     leaseUtilitySettings.length + userSettings.length;

    return {
      totalCount,
      breakdown: {
        properties: properties.length,
        units: units.length,
        leases: leases.length,
        documents: documents.length,
        documentFolders: documentFolders.length,
        propertyImages: propertyImages.length,
        utilityBills: utilityBills.length,
        utilityPayments: utilityPayments.length,
        leaseUtilitySettings: leaseUtilitySettings.length,
        userSettings: userSettings.length,
      }
    };
  },
});