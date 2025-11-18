"use client";
import React from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Home,
  FileText,
  Zap,
  UserPlus,
  Edit,
  Trash2,
  Upload,
  DollarSign,
  Building2,
  Clock,
  Search,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "../lib/utils";
import { Input } from "./ui/input";

interface ActivityTimelineProps {
  propertyId?: Id<"properties">;
  leaseId?: Id<"leases">;
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

const ACTIVITY_ICONS: Record<string, any> = {
  property: Home,
  lease: FileText,
  document: Upload,
  utility_bill: Zap,
  unit: Building2,
};

const ACTIVITY_COLORS: Record<string, string> = {
  property: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  lease: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  document: "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  utility_bill: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  unit: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
};

const ACTION_COLORS: Record<string, string> = {
  created: "text-green-600 dark:text-green-400",
  updated: "text-blue-600 dark:text-blue-400",
  deleted: "text-red-600 dark:text-red-400",
  uploaded: "text-purple-600 dark:text-purple-400",
  paid: "text-emerald-600 dark:text-emerald-400",
  expired: "text-orange-600 dark:text-orange-400",
};

export function ActivityTimeline({
  propertyId,
  leaseId,
  limit = 50,
  showFilters = true,
  className,
}: ActivityTimelineProps) {
  const { user } = useUser();
  const [dateRange, setDateRange] = React.useState<string>("month");
  const [activityType, setActivityType] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");

  // Determine which query to use
  const activities = useQuery(
    propertyId
      ? api.activityLog.getPropertyActivities
      : leaseId
      ? api.activityLog.getLeaseActivities
      : api.activityLog.getUserActivities,
    user
      ? propertyId
        ? {
            userId: user.id,
            propertyId: propertyId as any,
            limit,
          }
        : leaseId
        ? {
            userId: user.id,
            leaseId: leaseId as any,
            limit,
          }
        : {
            userId: user.id,
            entityType: activityType !== "all" ? activityType : undefined,
            dateRange: dateRange as any,
            limit,
          }
      : "skip"
  );

  // Filter activities client-side for search and additional filters
  const filteredActivities = React.useMemo(() => {
    if (!activities) return [];

    let filtered = [...activities];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.description.toLowerCase().includes(searchLower) ||
          activity.action.toLowerCase().includes(searchLower) ||
          activity.entityType.toLowerCase().includes(searchLower)
      );
    }

    // Apply activity type filter (if not using backend filter)
    if (activityType !== "all" && !propertyId && !leaseId) {
      filtered = filtered.filter((activity) => activity.entityType === activityType);
    }

    return filtered;
  }, [activities, searchTerm, activityType, propertyId, leaseId]);

  if (!user) {
    return null;
  }

  if (activities === undefined) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          {filteredActivities.length > 0 && (
            <Badge variant="secondary">
              {filteredActivities.length} {filteredActivities.length === 1 ? "event" : "events"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {!propertyId && !leaseId && (
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="property">Properties</SelectItem>
                    <SelectItem value="lease">Leases</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="utility_bill">Utility Bills</SelectItem>
                    <SelectItem value="unit">Units</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}

        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activities found</p>
            {searchTerm && (
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const Icon = ACTIVITY_ICONS[activity.entityType] || FileText;
                const activityColor = ACTIVITY_COLORS[activity.entityType] || ACTIVITY_COLORS.unit;
                const actionColor = ACTION_COLORS[activity.action] || "text-muted-foreground";
                const date = new Date(activity.timestamp);
                const isLast = index === filteredActivities.length - 1;

                return (
                  <div key={activity._id} className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background",
                        activityColor
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", activityColor)}
                            >
                              {activity.entityType.replace("_", " ")}
                            </Badge>
                            <span className={cn("text-xs font-medium", actionColor)}>
                              {activity.action}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          <div>{format(date, "MMM d, yyyy")}</div>
                          <div>{formatDistanceToNow(date, { addSuffix: true })}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

