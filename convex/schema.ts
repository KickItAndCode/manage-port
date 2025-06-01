import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  properties: defineTable({
    userId: v.string(), // Clerk user ID
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
    createdAt: v.string(),
  }),
  utilities: defineTable({
    userId: v.string(), // Clerk user ID
    propertyId: v.id("properties"), // Link to property
    name: v.string(), // Utility name (e.g., Electricity)
    provider: v.string(), // Utility provider
    cost: v.number(), // Monthly cost
    createdAt: v.string(),
  }),
  leases: defineTable({
    userId: v.string(), // Clerk user ID
    propertyId: v.id("properties"), // Link to property
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    rent: v.number(),
    status: v.string(), // active, expired
    leaseDocumentUrl: v.optional(v.string()),
    createdAt: v.string(),
  }),
  documents: defineTable({
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    type: v.string(), // lease, utility, property, other
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    uploadedAt: v.string(),
    notes: v.optional(v.string()),
  }),
}); 