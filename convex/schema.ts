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
    monthlyMortgage: v.optional(v.number()), // Monthly mortgage payment
    monthlyCapEx: v.optional(v.number()), // Capital expenditure reserve (10% of mortgage)
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
    type: v.string(), // lease, utility, property, insurance, tax, maintenance, other
    category: v.optional(v.string()), // financial, legal, maintenance, insurance, tax, other
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    utilityId: v.optional(v.id("utilities")),
    fileSize: v.optional(v.number()), // in bytes
    mimeType: v.optional(v.string()), // application/pdf, image/jpeg, etc.
    uploadedAt: v.string(),
    updatedAt: v.optional(v.string()),
    expiryDate: v.optional(v.string()), // for documents that expire (insurance, licenses)
    tags: v.optional(v.array(v.string())), // searchable tags
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_property", ["propertyId"])
    .index("by_type", ["type"])
    .index("by_category", ["category"]),
}); 