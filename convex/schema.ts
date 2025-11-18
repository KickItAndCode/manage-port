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
    purchaseDate: v.string(),
    monthlyMortgage: v.optional(v.number()), // Monthly mortgage payment
    monthlyCapEx: v.optional(v.number()), // Capital expenditure reserve (10% of mortgage)
    propertyType: v.optional(
      v.union(v.literal("single-family"), v.literal("multi-family"))
    ), // New field

    // Utility defaults from property wizard
    utilityPreset: v.optional(
      v.union(
        v.literal("owner-pays"),
        v.literal("tenant-pays"),
        v.literal("custom")
      )
    ),
    utilityDefaults: v.optional(
      v.array(
        v.object({
          unitIdentifier: v.string(),
          unitName: v.string(),
          percentage: v.number(),
        })
      )
    ),

    createdAt: v.string(),
  }),
  units: defineTable({
    propertyId: v.id("properties"), // Reference to parent property
    unitIdentifier: v.string(), // e.g., "Unit A", "Apt 1", "Suite 101"
    status: v.union(
      v.literal("available"),
      v.literal("occupied"),
      v.literal("maintenance")
    ),
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
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("pending")
    ), // @deprecated - Use computed status from dates instead
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
    landlordPaidUtilityCompany: v.boolean(), // Landlord paid to utility company
    landlordPaidDate: v.optional(v.string()),
    noTenantCharges: v.optional(v.boolean()), // If true, don't generate tenant charges (for historical/settled bills)
    billDocumentId: v.optional(v.id("documents")), // Reference to uploaded bill
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_user", ["userId"])
    .index("by_month", ["billMonth"])
    .index("by_type", ["utilityType"])
    .index("by_paid_status", ["landlordPaidUtilityCompany"])
    .index("by_property_month", ["propertyId", "billMonth"])
    .index("by_user_property_date", ["userId", "propertyId", "billMonth"])
    .index("by_user_date_range", ["userId", "billMonth"])
    .index("by_property_month_type", [
      "propertyId",
      "billMonth",
      "utilityType",
    ]),
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
  utilityPayments: defineTable({
    leaseId: v.id("leases"), // Reference to lease
    utilityBillId: v.id("utilityBills"), // Reference to utility bill
    tenantName: v.string(), // Denormalized tenant name
    amountPaid: v.number(), // Amount paid in this transaction
    paymentDate: v.string(), // Date of payment
    paymentMethod: v.string(), // cash, check, credit_card, etc.
    referenceNumber: v.optional(v.string()), // Check number, transaction ID, etc.
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_lease", ["leaseId"])
    .index("by_bill", ["utilityBillId"])
    .index("by_date", ["paymentDate"])
    .index("by_method", ["paymentMethod"])
    .index("by_lease_bill", ["leaseId", "utilityBillId"]),
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
    tags: v.optional(v.array(v.string())), // searchable tags
    notes: v.optional(v.string()),
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
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ), // Theme preference
    dashboardComponents: v.optional(
      v.object({
        showMetrics: v.boolean(), // Show stat cards
        showCharts: v.boolean(), // Show analytics charts
        showFinancialSummary: v.boolean(), // Show financial summary
        showOutstandingBalances: v.boolean(), // Show outstanding balances
        showUtilityAnalytics: v.boolean(), // Show utility analytics
        showRecentProperties: v.boolean(), // Show recent properties table
        showQuickActions: v.boolean(), // Show quick action cards
      })
    ),
    notificationPreferences: v.optional(
      v.object({
        emailNotifications: v.boolean(),
        pushNotifications: v.boolean(),
        leaseExpirationAlerts: v.boolean(),
        paymentReminders: v.boolean(),
        utilityBillReminders: v.boolean(), // Overdue bills and missing readings
      })
    ),
    displayPreferences: v.optional(
      v.object({
        dateFormat: v.union(
          v.literal("MM/DD/YYYY"),
          v.literal("DD/MM/YYYY"),
          v.literal("YYYY-MM-DD")
        ),
        currency: v.string(), // USD, EUR, etc.
        timezone: v.string(), // Timezone identifier
        language: v.string(), // Language code
      })
    ),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),
  listingPublications: defineTable({
    userId: v.string(), // Clerk user ID - for security and data isolation
    propertyId: v.id("properties"), // Reference to property being listed
    platform: v.string(), // apartments_com, zillow, rentals_com, etc.
    status: v.union(
      v.literal("pending"), // Publication in progress
      v.literal("active"), // Successfully published
      v.literal("error"), // Failed to publish
      v.literal("expired"), // Listing expired or removed
      v.literal("paused") // Temporarily paused by user
    ),
    externalId: v.optional(v.string()), // Platform's listing ID (when successfully published)
    externalUrl: v.optional(v.string()), // Direct URL to the listing on the platform
    publishedAt: v.optional(v.string()), // When listing went live on platform
    lastSyncAt: v.optional(v.string()), // Last time we checked status with platform
    errorMessage: v.optional(v.string()), // Error details for failed publications
    errorCode: v.optional(v.string()), // Platform-specific error codes
    retryCount: v.optional(v.number()), // Number of retry attempts (for failure recovery)

    // Listing metadata
    listingTitle: v.optional(v.string()), // Custom title for this platform
    listingDescription: v.optional(v.string()), // Custom description
    monthlyRent: v.optional(v.number()), // Rent specific to this listing
    availableDate: v.optional(v.string()), // When property becomes available

    // Platform-specific settings
    platformSettings: v.optional(
      v.object({
        featuredListing: v.optional(v.boolean()), // Paid promotion
        contactMethod: v.optional(v.string()), // phone, email, form
        showExactAddress: v.optional(v.boolean()), // Address privacy setting
        petPolicy: v.optional(v.string()), // Platform-specific pet policies
        smokingPolicy: v.optional(v.string()), // Smoking allowed/not allowed
        leaseDuration: v.optional(v.string()), // month-to-month, 12-month, flexible
      })
    ),

    // Auto-renewal and management
    autoRenew: v.optional(v.boolean()), // Automatically renew expired listings
    renewalPrice: v.optional(v.number()), // Cost of renewal (if paid platform)

    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_property", ["propertyId"])
    .index("by_platform", ["platform"])
    .index("by_status", ["status"])
    .index("by_user_property", ["userId", "propertyId"]) // For efficient property listing queries
    .index("by_user_platform", ["userId", "platform"]) // For platform-specific dashboards
    .index("by_property_platform", ["propertyId", "platform"]) // Ensure unique property-platform pairs
    .index("by_external_id", ["externalId"]) // For webhook and sync operations
    .index("by_published_date", ["publishedAt"]) // For analytics and reporting
    .index("by_sync_date", ["lastSyncAt"]), // For identifying stale listings needing sync
  platformTokens: defineTable({
    userId: v.string(), // Clerk user ID - for security and data isolation
    platform: v.string(), // apartments_com, zillow, rentals_com, etc.
    accessToken: v.string(), // OAuth access token (encrypted in production)
    refreshToken: v.optional(v.string()), // OAuth refresh token (encrypted in production)
    tokenType: v.optional(v.string()), // Usually "Bearer"
    expiresAt: v.optional(v.number()), // Unix timestamp when token expires
    scope: v.optional(v.array(v.string())), // OAuth scopes granted

    // Token metadata
    issuedAt: v.string(), // When token was first obtained
    lastRefreshedAt: v.optional(v.string()), // When token was last refreshed
    isValid: v.boolean(), // Whether token is currently valid

    // Platform connection info
    platformUserId: v.optional(v.string()), // User ID on the external platform
    platformUserEmail: v.optional(v.string()), // Email on the external platform
    platformAccountName: v.optional(v.string()), // Account name on the external platform

    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_platform", ["platform"])
    .index("by_user_platform", ["userId", "platform"]) // Ensure unique user-platform pairs
    .index("by_validity", ["isValid"])
    .index("by_expiration", ["expiresAt"]) // For token cleanup and refresh jobs
    .index("by_platform_user", ["platform", "platformUserId"]), // For platform-specific queries
  activityLog: defineTable({
    userId: v.string(), // Clerk user ID
    entityType: v.string(), // "property", "lease", "document", "utility_bill", "unit"
    entityId: v.string(), // ID of the entity (propertyId, leaseId, etc.)
    action: v.string(), // "created", "updated", "deleted", "uploaded", etc.
    description: v.string(), // Human-readable description
    metadata: v.optional(v.any()), // Additional context (property name, tenant name, etc.)
    timestamp: v.string(), // ISO timestamp
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"]),
  notifications: defineTable({
    userId: v.string(), // Clerk user ID
    type: v.string(), // "lease_expiration", "payment_reminder", "utility_bill_reminder", "utility_anomaly"
    title: v.string(), // Notification title
    message: v.string(), // Notification message/description
    read: v.boolean(), // Whether notification has been read
    relatedEntityType: v.optional(v.string()), // "property", "lease", "utility_bill"
    relatedEntityId: v.optional(v.string()), // ID of related entity
    actionUrl: v.optional(v.string()), // URL to navigate to when clicked
    severity: v.optional(
      v.union(v.literal("info"), v.literal("warning"), v.literal("error"))
    ), // Notification severity
    metadata: v.optional(v.any()), // Additional context
    createdAt: v.string(), // ISO timestamp
    readAt: v.optional(v.string()), // When notification was marked as read
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_type", ["type"]),
});
