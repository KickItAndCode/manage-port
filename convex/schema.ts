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
    propertyType: v.optional(v.union(v.literal("single-family"), v.literal("multi-family"))), // New field
    defaultUnitCreated: v.optional(v.boolean()), // Track if we've created a default unit
    createdAt: v.string(),
  }),
  units: defineTable({
    propertyId: v.id("properties"), // Reference to parent property
    unitIdentifier: v.string(), // e.g., "Unit A", "Apt 1", "Suite 101"
    status: v.union(v.literal("available"), v.literal("occupied"), v.literal("maintenance")),
    bedrooms: v.optional(v.number()), // Optional unit-specific details
    bathrooms: v.optional(v.number()),
    squareFeet: v.optional(v.number()),
    notes: v.optional(v.string()),
    displayName: v.optional(v.string()), // Custom unit names like "Garage Unit", "Basement"
    isDefault: v.optional(v.boolean()), // Identify auto-created units for single-family properties
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_status", ["status"]),
  leases: defineTable({
    userId: v.string(), // Clerk user ID
    propertyId: v.id("properties"), // Link to property
    unitId: v.optional(v.id("units")), // Link to specific unit (optional for backward compatibility)
    tenantName: v.string(),
    tenantEmail: v.optional(v.string()),
    tenantPhone: v.optional(v.string()),
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
    rent: v.number(), // Monthly rent amount
    securityDeposit: v.optional(v.number()), // Security deposit amount
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("pending")), // Lease status
    notes: v.optional(v.string()), // Additional lease notes
    leaseDocumentUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_tenant", ["tenantName"])
    .index("by_unit", ["unitId"]),
  utilityBills: defineTable({
    userId: v.string(), // Clerk user ID  
    propertyId: v.id("properties"), // Reference to property
    utilityType: v.string(), // Electric, Water, Gas, Sewer, Trash, Internet, etc.
    provider: v.string(), // Utility provider company
    billMonth: v.string(), // YYYY-MM format
    totalAmount: v.number(), // Full bill amount
    dueDate: v.string(), // ISO date string
    billDate: v.string(), // Date on the bill
    billingPeriod: v.optional(v.string()), // monthly, bi-monthly, quarterly, etc.
    isPaid: v.boolean(), // Landlord paid to utility company
    paidDate: v.optional(v.string()),
    billDocumentId: v.optional(v.id("documents")), // Reference to uploaded bill
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"])
    .index("by_month", ["billMonth"])
    .index("by_type", ["utilityType"])
    .index("by_paid_status", ["isPaid"])
    .index("by_property_month", ["propertyId", "billMonth"]),
  leaseUtilitySettings: defineTable({
    leaseId: v.id("leases"), // Reference to lease
    utilityType: v.string(), // Must match utilityBills.utilityType
    responsibilityPercentage: v.number(), // 0-100
    notes: v.optional(v.string()), // e.g., "Includes common area usage"
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_lease", ["leaseId"])
    .index("by_utility_type", ["utilityType"]),
  unitUtilityResponsibilities: defineTable({
    propertyId: v.id("properties"), // Reference to property
    unitId: v.id("units"), // Reference to unit
    utilityType: v.string(), // Must match utilityBills.utilityType
    responsibilityPercentage: v.number(), // 0-100
    notes: v.optional(v.string()), // e.g., "Default setting - 100% tenant responsibility"
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_unit", ["unitId"])
    .index("by_utility_type", ["utilityType"])
    .index("by_property_utility", ["propertyId", "utilityType"]),
  tenantUtilityCharges: defineTable({
    leaseId: v.id("leases"), // Reference to lease
    unitId: v.optional(v.id("units")), // Reference to unit
    utilityBillId: v.id("utilityBills"), // Reference to utilityBill
    tenantName: v.string(), // Denormalized for history
    chargedAmount: v.number(), // Calculated: bill * percentage
    responsibilityPercentage: v.number(), // Snapshot of percentage used
    dueDate: v.string(), // Inherited from utilityBill
    isPaid: v.boolean(), // Tenant paid to landlord
    paidDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_lease", ["leaseId"])
    .index("by_bill", ["utilityBillId"])
    .index("by_payment_status", ["isPaid"])
    .index("by_unit", ["unitId"]),
  utilityPayments: defineTable({
    chargeId: v.id("tenantUtilityCharges"), // Reference to charge
    amountPaid: v.number(), // Amount paid in this transaction
    paymentDate: v.string(), // Date of payment
    paymentMethod: v.string(), // cash, check, credit_card, etc.
    referenceNumber: v.optional(v.string()), // Check number, transaction ID, etc.
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_charge", ["chargeId"])
    .index("by_date", ["paymentDate"])
    .index("by_method", ["paymentMethod"]),
  documentFolders: defineTable({
    userId: v.string(),
    name: v.string(),
    parentId: v.optional(v.id("documentFolders")), // For nested folders
    path: v.string(), // Full path for easy breadcrumb navigation
    color: v.optional(v.string()), // Optional folder color
    icon: v.optional(v.string()), // Optional folder icon
    order: v.optional(v.number()), // Display order
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_parent", ["parentId"])
    .index("by_path", ["path"]),
  documents: defineTable({
    userId: v.string(),
    storageId: v.string(), // Convex storage ID for the file
    name: v.string(),
    folderId: v.optional(v.id("documentFolders")), // Optional folder assignment
    type: v.string(), // lease, utility_bill, property, insurance, tax, maintenance, other
    propertyId: v.optional(v.id("properties")),
    leaseId: v.optional(v.id("leases")),
    utilityBillId: v.optional(v.id("utilityBills")), // Link to utility bill
    fileSize: v.number(), // in bytes
    mimeType: v.string(), // application/pdf, image/jpeg, etc.
    uploadedAt: v.string(),
    updatedAt: v.optional(v.string()),
    expiryDate: v.optional(v.string()), // for documents that expire (insurance, licenses)
    tags: v.optional(v.array(v.string())), // searchable tags
    notes: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()), // For document previews
  })
    .index("by_user", ["userId"])
    .index("by_folder", ["folderId"])
    .index("by_property", ["propertyId"])
    .index("by_lease", ["leaseId"])
    .index("by_utility_bill", ["utilityBillId"])
    .index("by_type", ["type"])
    .index("by_upload_date", ["uploadedAt"]),
  propertyImages: defineTable({
    userId: v.string(),
    propertyId: v.id("properties"),
    storageId: v.string(), // Convex storage ID
    name: v.string(), // Original filename
    fileSize: v.number(), // in bytes
    mimeType: v.string(), // image/jpeg, image/png, etc.
    isCover: v.boolean(), // true if this is the cover image
    description: v.optional(v.string()), // Optional image description
    order: v.optional(v.number()), // Display order in gallery
    uploadedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"])
    .index("by_cover", ["propertyId", "isCover"])
    .index("by_order", ["propertyId", "order"]),
  userSettings: defineTable({
    userId: v.string(), // Clerk user ID
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))), // Theme preference
    dashboardComponents: v.optional(v.object({
      showMetrics: v.boolean(), // Show stat cards
      showCharts: v.boolean(), // Show analytics charts
      showFinancialSummary: v.boolean(), // Show financial summary
      showOutstandingBalances: v.boolean(), // Show outstanding balances
      showUtilityAnalytics: v.boolean(), // Show utility analytics
      showRecentProperties: v.boolean(), // Show recent properties table
      showQuickActions: v.boolean(), // Show quick action cards
    })),
    notificationPreferences: v.optional(v.object({
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      leaseExpirationAlerts: v.boolean(),
      paymentReminders: v.boolean(),
    })),
    displayPreferences: v.optional(v.object({
      dateFormat: v.union(v.literal("MM/DD/YYYY"), v.literal("DD/MM/YYYY"), v.literal("YYYY-MM-DD")),
      currency: v.string(), // USD, EUR, etc.
      timezone: v.string(), // Timezone identifier
      language: v.string(), // Language code
    })),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"]),
}); 