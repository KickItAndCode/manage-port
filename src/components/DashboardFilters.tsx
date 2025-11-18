"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardFilters {
  propertyId?: Id<"properties">;
  dateRange?: "week" | "month" | "quarter" | "year" | "all";
  status?: "all" | "active" | "expired" | "pending";
}

interface DashboardFiltersProps {
  userId: string;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  compact?: boolean;
}

/**
 * Dashboard Filters Component
 * 
 * Provides quick filtering options for dashboard data:
 * - Property filter
 * - Date range filter
 * - Status filter
 */
export function DashboardFilters({
  userId,
  filters,
  onFiltersChange,
  compact = false,
}: DashboardFiltersProps) {
  const properties = useQuery(
    api.properties.getProperties,
    userId ? { userId } : "skip"
  );

  const hasActiveFilters = useMemo(() => {
    return (
      filters.propertyId !== undefined ||
      filters.dateRange !== undefined ||
      filters.status !== undefined
    );
  }, [filters]);

  const handlePropertyChange = (propertyId: string) => {
    onFiltersChange({
      ...filters,
      propertyId: propertyId ? (propertyId as Id<"properties">) : undefined,
    });
  };

  const handleDateRangeChange = (range: string) => {
    onFiltersChange({
      ...filters,
      dateRange: range === "all" ? undefined : (range as DashboardFilters["dateRange"]),
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === "all" ? undefined : (status as DashboardFilters["status"]),
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  if (!properties || properties.length === 0) {
    return null;
  }

  return (
    <Card className={cn(compact && "p-2")}>
      <CardContent className={cn("p-4 sm:p-6", compact && "p-3")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className={cn("font-medium", compact ? "text-sm" : "text-base")}>
              Quick Filters
            </span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {[
                  filters.propertyId && "1 property",
                  filters.dateRange && filters.dateRange,
                  filters.status && filters.status,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
            {/* Property Filter */}
            <div className="flex-1 min-w-[140px]">
              <Label htmlFor="property-filter" className="sr-only">
                Filter by Property
              </Label>
              <SelectNative
                id="property-filter"
                value={filters.propertyId || ""}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="text-sm"
              >
                <option value="">All Properties</option>
                {properties.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            {/* Date Range Filter */}
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="date-range-filter" className="sr-only">
                Filter by Date Range
              </Label>
              <SelectNative
                id="date-range-filter"
                value={filters.dateRange || "all"}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="text-sm"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </SelectNative>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[120px]">
              <Label htmlFor="status-filter" className="sr-only">
                Filter by Status
              </Label>
              <SelectNative
                id="status-filter"
                value={filters.status || "all"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </SelectNative>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

