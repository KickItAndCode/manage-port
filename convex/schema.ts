import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  properties: defineTable({
    userId: v.string(), // Clerk user ID
    name: v.string(),
    address: v.string(),
    rent: v.number(),
  }),
}); 