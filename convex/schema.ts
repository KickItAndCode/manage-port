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
    name: v.string(), // Utility name (e.g., Electricity, Water, Gas, Internet)
    provider: v.string(), // Utility provider company
    cost: v.number(), // Monthly cost
    billingCycle: v.optional(v.string()), // e.g., "monthly", "quarterly"
    startDate: v.optional(v.string()), // Service start date
    endDate: v.optional(v.string()), // Service end date (if terminated)
    notes: v.optional(v.string()), // Additional notes
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"]),
  leases: defineTable({
    userId: v.string(), // Clerk user ID
    propertyId: v.id("properties"), // Link to property
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
    rent: v.number(), // Monthly rent amount
    securityDeposit: v.optional(v.number()), // Security deposit amount
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")), // Lease status
    paymentDay: v.optional(v.number()), // Day of month rent is due (1-31)
    notes: v.optional(v.string()), // Additional lease notes
    leaseDocumentUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_tenant", ["tenantName"]),
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