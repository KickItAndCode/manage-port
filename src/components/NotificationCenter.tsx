"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Clock,
  FileText,
  Zap,
  Calendar,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "../lib/utils";
import { Skeleton } from "./ui/skeleton";

interface NotificationCenterProps {
  className?: string;
}

const NOTIFICATION_ICONS: Record<string, any> = {
  lease_expiration: Calendar,
  payment_reminder: FileText,
  utility_bill_reminder: Zap,
  utility_anomaly: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-orange-600 dark:text-orange-400",
  error: "text-red-600 dark:text-red-400",
};

const SEVERITY_BG_COLORS: Record<string, string> = {
  info: "bg-blue-100 dark:bg-blue-900/20",
  warning: "bg-orange-100 dark:bg-orange-900/20",
  error: "bg-red-100 dark:bg-red-900/20",
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const notifications = useQuery(
    api.notifications.getUserNotifications,
    user ? { userId: user.id, limit: 50 } : "skip"
  );

  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    user ? { userId: user.id } : "skip"
  );

  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleNotificationClick = async (
    notification: any,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();

    // Mark as read if unread
    if (!notification.read) {
      try {
        await markAsRead({
          notificationId: notification._id,
          userId: user!.id,
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }

    // Navigate if actionUrl exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await markAllAsRead({ userId: user.id });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (
    notificationId: any,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await deleteNotification({
        notificationId,
        userId: user.id,
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  if (!user) {
    return null;
  }

  const unreadNotifications = notifications?.filter((n) => !n.read) || [];
  const readNotifications = notifications?.filter((n) => n.read) || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount !== undefined && unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            {notifications === undefined ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Unread Notifications */}
                {unreadNotifications.length > 0 && (
                  <div>
                    {unreadNotifications.map((notification) => {
                      const Icon =
                        NOTIFICATION_ICONS[notification.type] || Info;
                      const severity = notification.severity || "info";

                      return (
                        <div
                          key={notification._id}
                          className={cn(
                            "p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                            !notification.read && "bg-muted/30"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-full",
                                SEVERITY_BG_COLORS[severity]
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  SEVERITY_COLORS[severity]
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(
                                      new Date(notification.createdAt),
                                      { addSuffix: true }
                                    )}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) =>
                                    handleDelete(notification._id, e)
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Read Notifications */}
                {readNotifications.length > 0 && (
                  <div>
                    {readNotifications.map((notification) => {
                      const Icon =
                        NOTIFICATION_ICONS[notification.type] || Info;
                      const severity = notification.severity || "info";

                      return (
                        <div
                          key={notification._id}
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group opacity-75"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-full",
                                SEVERITY_BG_COLORS[severity]
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  SEVERITY_COLORS[severity]
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(
                                      new Date(notification.createdAt),
                                      { addSuffix: true }
                                    )}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) =>
                                    handleDelete(notification._id, e)
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

