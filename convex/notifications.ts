import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";

// Notification types
export const NOTIFICATION_TYPES = {
  LEASE_EXPIRATION: "lease_expiration",
  PAYMENT_REMINDER: "payment_reminder",
  UTILITY_BILL_REMINDER: "utility_bill_reminder",
  UTILITY_ANOMALY: "utility_anomaly",
} as const;

// Notification severity levels
export const NOTIFICATION_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

// Internal helper — callable from other mutations directly
export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    actionUrl?: string;
    severity?: "info" | "warning" | "error";
    metadata?: unknown;
  }
) {
  // Check if a similar notification already exists (prevent duplicates)
  let existingQuery = ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .filter((q) =>
      q.and(
        q.eq(q.field("type"), args.type),
        q.eq(q.field("read"), false)
      )
    );

  if (args.relatedEntityId) {
    const entityId = args.relatedEntityId;
    existingQuery = existingQuery.filter((q) =>
      q.eq(q.field("relatedEntityId"), entityId)
    );
  }

  const existing = await existingQuery.first();

  // If similar unread notification exists, don't create duplicate
  if (existing) {
    return existing._id;
  }

  return await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    read: false,
    relatedEntityType: args.relatedEntityType,
    relatedEntityId: args.relatedEntityId,
    actionUrl: args.actionUrl,
    severity: args.severity || NOTIFICATION_SEVERITY.INFO,
    metadata: args.metadata,
    createdAt: new Date().toISOString(),
  });
}

// Public mutation — callable from the client API
export const createNotificationMutation = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedEntityType: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    severity: v.optional(v.union(v.literal("info"), v.literal("warning"), v.literal("error"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await createNotification(ctx, { ...args, userId });
  },
});

// Get notifications for a user
export const getUserNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();

    // Filter by read status if specified
    if (args.unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    // Sort by createdAt (newest first)
    notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit if provided
    if (args.limit) {
      notifications = notifications.slice(0, args.limit);
    }

    return notifications;
  },
});

// Get unread notification count
export const getUnreadNotificationCount = query({
  args: {
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    return notifications.length;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
      readAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllNotificationsAsRead = mutation({
  args: {
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", userId).eq("read", false)
      )
      .collect();

    const now = new Date().toISOString();
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
      });
    }

    return { count: unreadNotifications.length };
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or unauthorized");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

