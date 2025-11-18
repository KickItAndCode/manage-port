import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

// Default dashboard component settings
const DEFAULT_DASHBOARD_COMPONENTS = {
  showMetrics: true,
  showCharts: true, 
  showFinancialSummary: true,
  showOutstandingBalances: true,
  showUtilityAnalytics: true,
  showRecentProperties: true,
  showQuickActions: true,
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailNotifications: true,
  pushNotifications: true,
  leaseExpirationAlerts: true,
  paymentReminders: true,
  utilityBillReminders: true,
};

const DEFAULT_DISPLAY_PREFERENCES = {
  dateFormat: "MM/DD/YYYY" as const,
  currency: "USD",
  timezone: "America/New_York",
  language: "en",
};

// Get user settings
export const getUserSettings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Return settings with defaults if none exist
    if (!settings) {
      return {
        userId: args.userId,
        theme: "system" as const,
        dashboardComponents: DEFAULT_DASHBOARD_COMPONENTS,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
        displayPreferences: DEFAULT_DISPLAY_PREFERENCES,
        createdAt: new Date().toISOString(),
      };
    }

    // Merge with defaults for any missing fields
    return {
      ...settings,
      dashboardComponents: {
        ...DEFAULT_DASHBOARD_COMPONENTS,
        ...(settings.dashboardComponents || {}),
      },
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(settings.notificationPreferences || {}),
      },
      displayPreferences: {
        ...DEFAULT_DISPLAY_PREFERENCES,
        ...(settings.displayPreferences || {}),
      },
    };
  },
});

// Helper function for updating user settings (shared logic)
async function updateUserSettingsHelper(
  ctx: MutationCtx,
  args: {
    userId: string;
    theme?: "light" | "dark" | "system";
    dashboardComponents?: {
      showMetrics?: boolean;
      showCharts?: boolean;
      showFinancialSummary?: boolean;
      showOutstandingBalances?: boolean;
      showUtilityAnalytics?: boolean;
      showRecentProperties?: boolean;
      showQuickActions?: boolean;
    };
    notificationPreferences?: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      leaseExpirationAlerts?: boolean;
      paymentReminders?: boolean;
      utilityBillReminders?: boolean;
    };
    displayPreferences?: {
      dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
      currency?: string;
      timezone?: string;
      language?: string;
    };
  }
) {
  const existingSettings = await ctx.db
    .query("userSettings")
    .filter((q) => q.eq(q.field("userId"), args.userId))
    .first();

  const now = new Date().toISOString();

  if (existingSettings) {
    // Update existing settings
    const updatedData: any = {
      updatedAt: now,
    };

    if (args.theme !== undefined) {
      updatedData.theme = args.theme;
    }

    if (args.dashboardComponents) {
      updatedData.dashboardComponents = {
        ...(existingSettings.dashboardComponents || DEFAULT_DASHBOARD_COMPONENTS),
        ...args.dashboardComponents,
      };
    }

    if (args.notificationPreferences) {
      updatedData.notificationPreferences = {
        ...(existingSettings.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES),
        ...args.notificationPreferences,
      };
    }

    if (args.displayPreferences) {
      updatedData.displayPreferences = {
        ...(existingSettings.displayPreferences || DEFAULT_DISPLAY_PREFERENCES),
        ...args.displayPreferences,
      };
    }

    await ctx.db.patch(existingSettings._id, updatedData);
    return existingSettings._id;
  } else {
    // Create new settings
    const newSettings = {
      userId: args.userId,
      theme: args.theme || "system",
      dashboardComponents: {
        ...DEFAULT_DASHBOARD_COMPONENTS,
        ...(args.dashboardComponents || {}),
      },
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(args.notificationPreferences || {}),
      },
      displayPreferences: {
        ...DEFAULT_DISPLAY_PREFERENCES,
        ...(args.displayPreferences || {}),
      },
      createdAt: now,
    };

    return await ctx.db.insert("userSettings", newSettings);
  }
}

// Update user settings
export const updateUserSettings = mutation({
  args: {
    userId: v.string(),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    dashboardComponents: v.optional(v.object({
      showMetrics: v.optional(v.boolean()),
      showCharts: v.optional(v.boolean()),
      showFinancialSummary: v.optional(v.boolean()),
      showOutstandingBalances: v.optional(v.boolean()),
      showUtilityAnalytics: v.optional(v.boolean()),
      showRecentProperties: v.optional(v.boolean()),
      showQuickActions: v.optional(v.boolean()),
    })),
    notificationPreferences: v.optional(v.object({
      emailNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      leaseExpirationAlerts: v.optional(v.boolean()),
      paymentReminders: v.optional(v.boolean()),
      utilityBillReminders: v.optional(v.boolean()),
    })),
    displayPreferences: v.optional(v.object({
      dateFormat: v.optional(v.union(v.literal("MM/DD/YYYY"), v.literal("DD/MM/YYYY"), v.literal("YYYY-MM-DD"))),
      currency: v.optional(v.string()),
      timezone: v.optional(v.string()),
      language: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await updateUserSettingsHelper(ctx, args);
  },
});

// Update dashboard component visibility
export const updateDashboardComponents = mutation({
  args: {
    userId: v.string(),
    componentUpdates: v.object({
      showMetrics: v.optional(v.boolean()),
      showCharts: v.optional(v.boolean()),
      showFinancialSummary: v.optional(v.boolean()),
      showOutstandingBalances: v.optional(v.boolean()),
      showUtilityAnalytics: v.optional(v.boolean()),
      showRecentProperties: v.optional(v.boolean()),
      showQuickActions: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    return await updateUserSettingsHelper(ctx, {
      userId: args.userId,
      dashboardComponents: args.componentUpdates,
    });
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    userId: v.string(),
    notificationUpdates: v.object({
      emailNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      leaseExpirationAlerts: v.optional(v.boolean()),
      paymentReminders: v.optional(v.boolean()),
      utilityBillReminders: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    return await updateUserSettingsHelper(ctx, {
      userId: args.userId,
      notificationPreferences: args.notificationUpdates,
    });
  },
});

// Update theme preference
export const updateTheme = mutation({
  args: {
    userId: v.string(),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  },
  handler: async (ctx, args) => {
    return await updateUserSettingsHelper(ctx, {
      userId: args.userId,
      theme: args.theme,
    });
  },
});