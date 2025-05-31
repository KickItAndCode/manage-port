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
    status: v.string(), // e.g., Active, Inactive
    createdAt: v.string(),
  }),
}); 