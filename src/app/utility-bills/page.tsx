"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Doc } from "@/../convex/_generated/dataModel";
import { formatErrorForToast } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { UtilityBillForm } from "@/components/UtilityBillForm";
import { BulkUtilityBillEntry } from "@/components/BulkUtilityBillEntry";
import { BillSplitPreview } from "@/components/BillSplitPreview";
import { TenantStatementGenerator } from "@/components/TenantStatementGenerator";
import { LoadingContent } from "@/components/LoadingContent";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ResponsiveTable, BulkActionsToolbar } from "@/components/ui/responsive-table";
import { 
  createUtilityBillTableConfig, 
  UtilityBillMobileCard, 
  type UtilityBill,
  type Property
} from "@/lib/table-configs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Receipt, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Download,
  Trash2,
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import our new hooks and types
import { useUtilityBillsData, useUtilityBillFilterOptions } from "@/hooks/useUtilityBillsData";
import { UtilityBillFilters } from "@/types/utilityBills";

// Comprehensive utility bills page loading skeleton
const UtilityBillsLoadingSkeleton = () => (
  <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="bg-muted/50 rounded-lg border p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Bills Table skeleton */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Mobile Cards skeleton */}
          <div className="lg:hidden space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-4 w-4 mt-1" />
                    <div className="flex-1 space-y-3">
                      {/* Essential info */}
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      
                      {/* Important info grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="space-y-1">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table skeleton */}
          <div className="hidden lg:block">
            <div className="space-y-4">
              {/* Table header */}
              <div className="flex border-b pb-3">
                <div className="w-8 mr-4">
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="flex-1 grid grid-cols-7 gap-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-16" />
                  ))}
                </div>
              </div>
              
              {/* Table rows */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex py-4 border-b border-border/50">
                  <div className="w-8 mr-4">
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Signed-out state skeleton with overlay
const SignedOutSkeleton = () => (
  <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Stats Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content with authentication overlay */}
      <div className="relative">
        {/* Authentication overlay */}
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            <Skeleton className="h-10 w-32 mx-auto" />
          </div>
        </div>

        {/* Background content (dimmed) */}
        <div className="opacity-30 space-y-4">
          {/* Filters skeleton */}
          <div className="bg-muted/50 rounded-lg border p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Bills Table skeleton */}
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="lg:hidden space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-4 w-4 mt-1" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: 4 }).map((_, j) => (
                              <div key={j} className="space-y-1">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-4 w-16" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

export default function UtilityBillsPage() {
  const { user } = useUser();
  
  // Use the new unified data hook
  const {
    data,
    filteredData,
    filters,
    loading,
    error,
    updateFilters,
    resetFilters,
  } = useUtilityBillsData();

  // Get filter options based on current selection
  const { properties, leases, utilityTypes } = useUtilityBillFilterOptions(filters.propertyId);
  
  // Dialog states
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [selectedUtilityBills, setSelectedUtilityBills] = useState<Doc<"utilityBills">[]>([]);
  const [sortKey, setSortKey] = useState<keyof Doc<"utilityBills">>("billMonth");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Mutations
  const addBill = useMutation(api.utilityBills.addUtilityBill);
  const updateBill = useMutation(api.utilityBills.updateUtilityBill);
  const deleteBill = useMutation(api.utilityBills.deleteUtilityBill);
  const bulkAddBills = useMutation(api.utilityBills.bulkAddUtilityBills);

  // Table sort handler
  function handleSort(key: keyof Doc<"utilityBills">, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDir(direction);
  }

  // Bulk operations handlers
  const handleBulkDelete = async (billsToDelete: Doc<"utilityBills">[]) => {
    if (billsToDelete.length === 0 || !user) return;
    confirm({
      title: "Delete Utility Bills",
      description: `Delete ${billsToDelete.length} selected bills? This will also delete all associated tenant charges.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await Promise.all(
            billsToDelete.map(bill => 
              deleteBill({ id: bill._id as any, userId: user.id })
            )
          );
          setSelectedUtilityBills([]);
          toast.success(`${billsToDelete.length} bills deleted successfully`);
        } catch (error: any) {
          toast.error(formatErrorForToast(error));
        }
      }
    });
  };

  const handleBulkMarkPaid = async (billsToUpdate: Doc<"utilityBills">[]) => {
    if (billsToUpdate.length === 0 || !user) return;
    try {
      await Promise.all(
        billsToUpdate.map(bill => 
          updateBill({
            id: bill._id as any,
            userId: user.id,
            landlordPaidUtilityCompany: true,
            landlordPaidDate: new Date().toISOString().split('T')[0],
          })
        )
      );
      setSelectedUtilityBills([]);
      toast.success(`${billsToUpdate.length} bills marked as paid`);
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    }
  };

  const handleBulkMarkUnpaid = async (billsToUpdate: Doc<"utilityBills">[]) => {
    if (billsToUpdate.length === 0 || !user) return;
    try {
      await Promise.all(
        billsToUpdate.map(bill => 
          updateBill({
            id: bill._id as any,
            userId: user.id,
            landlordPaidUtilityCompany: false,
            landlordPaidDate: undefined,
          })
        )
      );
      setSelectedUtilityBills([]);
      toast.success(`${billsToUpdate.length} bills marked as unpaid`);
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    }
  };

  const handleDeleteBill = async (bill: any) => {
    confirm({
      title: "Delete Utility Bill",
      description: `Are you sure you want to delete the ${bill.utilityType} bill for ${bill.billMonth}? This will also delete all associated tenant charges.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteBill({ id: bill._id, userId: user!.id });
          toast.success("Bill deleted successfully");
        } catch (error: any) {
          toast.error(formatErrorForToast(error));
        }
      }
    });
  };

  const handleTogglePaidStatus = async (bill: any) => {
    try {
      await updateBill({
        id: bill._id,
        userId: user!.id,
        landlordPaidUtilityCompany: !bill.landlordPaidUtilityCompany,
        landlordPaidDate: !bill.landlordPaidUtilityCompany ? new Date().toISOString().split('T')[0] : undefined,
      });
      toast.success(`Bill marked as ${!bill.landlordPaidUtilityCompany ? 'paid' : 'unpaid'}`);
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    }
  };

  // Get processed bills for display
  const displayBills = useMemo(() => {
    if (!filteredData) return [];
    
    // Apply table sorting
    const sortedBills = [...filteredData.bills].sort((a, b) => {
      const v1 = a[sortKey];
      const v2 = b[sortKey];
      
      if (typeof v1 === "string" && typeof v2 === "string") {
        return sortDir === "asc"
          ? v1.localeCompare(v2)
          : v2.localeCompare(v1);
      }
      if (typeof v1 === "number" && typeof v2 === "number") {
        return sortDir === "asc" ? v1 - v2 : v2 - v1;
      }
      if (typeof v1 === "boolean" && typeof v2 === "boolean") {
        return sortDir === "asc" 
          ? Number(v1) - Number(v2) 
          : Number(v2) - Number(v1);
      }
      return 0;
    });

    return sortedBills;
  }, [filteredData, sortKey, sortDir]);

  // Create table configuration with stable callbacks
  const tableConfig = useMemo(() => {
    const onEdit = (bill: Doc<"utilityBills">) => {
      setSelectedBill(bill);
      setBillDialogOpen(true);
    };

    const onView = (bill: Doc<"utilityBills">) => setViewingBill(bill);

    const config = createUtilityBillTableConfig(
      onEdit,
      handleDeleteBill,
      onView,
      handleTogglePaidStatus,
      properties as Property[] || []
    );

    // Update bulk actions with actual handlers
    config.bulkActions = [
      {
        id: 'mark-paid',
        label: 'Mark as Paid',
        icon: CheckCircle,
        variant: 'default',
        action: handleBulkMarkPaid
      },
      {
        id: 'mark-unpaid',
        label: 'Mark as Unpaid',
        icon: XCircle,
        variant: 'outline',
        action: handleBulkMarkUnpaid
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        action: handleBulkDelete
      }
    ];

    return config;
  }, [handleDeleteBill, handleTogglePaidStatus, properties]);

  // Handle filter updates
  const handlePropertyChange = useCallback((propertyId: string) => {
    updateFilters({ 
      propertyId: propertyId || undefined,
      tenantId: undefined // Clear tenant when property changes
    });
  }, [updateFilters]);

  const handleTenantChange = useCallback((tenantId: string) => {
    updateFilters({ tenantId: tenantId || undefined });
  }, [updateFilters]);

  const handleDateRangeChange = useCallback((startMonth: string, endMonth: string) => {
    updateFilters({ 
      dateRange: startMonth && endMonth ? [startMonth, endMonth] : undefined 
    });
  }, [updateFilters]);

  const handleUtilityTypesChange = useCallback((types: string[]) => {
    updateFilters({ utilityTypes: types });
  }, [updateFilters]);

  const handlePaidStatusChange = useCallback((status: 'all' | 'paid' | 'unpaid') => {
    updateFilters({ paidStatus: status });
  }, [updateFilters]);

  if (!user) {
    return <SignedOutSkeleton />;
  }

  if (loading) {
    return <UtilityBillsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-destructive">
          Error loading utility bills: {error}
        </div>
      </div>
    );
  }

  const stats = filteredData?.stats || {
    totalBills: 0,
    unpaidBills: 0,
    totalAmount: 0,
    unpaidAmount: 0,
  };

  const selectedPropertyData = properties.find(p => p._id === filters.propertyId);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Utility Bill Management</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Comprehensive bill tracking, payments, and tenant charge management
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {filters.tenantId && filters.propertyId && (
              <Button 
                variant="outline" 
                onClick={() => setStatementDialogOpen(true)} 
                data-testid="generate-statement-btn"
                className="w-full sm:w-auto justify-center sm:justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Generate Statement</span>
                <span className="sm:hidden">Statement</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setBulkDialogOpen(true)} 
              data-testid="bulk-entry-btn"
              className="w-full sm:w-auto justify-center sm:justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Bulk Entry</span>
              <span className="sm:hidden">Bulk</span>
            </Button>
            <Button 
              onClick={() => setBillDialogOpen(true)} 
              data-testid="add-bill-btn"
              className="w-full sm:w-auto justify-center sm:justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Card data-testid="stat-card-total">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Bills</p>
                  <p className="text-lg sm:text-2xl font-bold" data-testid="total-bills-count">{stats.totalBills}</p>
                </div>
                <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-unpaid">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Unpaid Bills</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600" data-testid="unpaid-bills-count">{stats.unpaidBills}</p>
                </div>
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-amount" className="col-span-2 lg:col-span-1">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {filters.tenantId ? "Tenant Charges" : "Total Amount"}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold" data-testid="total-amount">${stats.totalAmount.toFixed(2)}</p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-card-outstanding" className="col-span-2 lg:col-span-1">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {filters.tenantId ? "Outstanding Balance" : "Unpaid Amount"}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600" data-testid="unpaid-amount">${stats.unpaidAmount.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simplified Filter System */}
        <div className="bg-muted/50 rounded-lg border p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Property Filter */}
            <div>
              <Label htmlFor="property" className="text-sm font-medium">Property</Label>
              <SelectNative
                id="property"
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

            {/* Tenant Filter */}
            <div>
              <Label htmlFor="tenant" className="text-sm font-medium">Tenant</Label>
              <SelectNative
                id="tenant"
                value={filters.tenantId || ""}
                onChange={(e) => handleTenantChange(e.target.value)}
                className={cn("text-sm", !filters.propertyId && "opacity-50")}
                disabled={!filters.propertyId}
              >
                <option value="">
                  {!filters.propertyId 
                    ? "Select a property first" 
                    : `All Tenants (${leases.length} available)`}
                </option>
                {filters.propertyId && leases.map((lease) => (
                  <option key={lease._id} value={lease._id}>
                    {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                  </option>
                ))}
              </SelectNative>
            </div>

            {/* Paid Status Filter */}
            <div>
              <Label htmlFor="paidStatus" className="text-sm font-medium">Payment Status</Label>
              <SelectNative
                id="paidStatus"
                value={filters.paidStatus || 'all'}
                onChange={(e) => handlePaidStatusChange(e.target.value as 'all' | 'paid' | 'unpaid')}
                className="text-sm"
              >
                <option value="all">All Bills</option>
                <option value="paid">Paid Bills</option>
                <option value="unpaid">Unpaid Bills</option>
              </SelectNative>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="w-full text-sm"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Bills List with ResponsiveTable */}
        <div className="space-y-4">
          <ResponsiveTable
            data={displayBills}
            config={tableConfig}
            loading={false}
            emptyState={
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bills Found</h3>
                <p className="text-muted-foreground mb-4">
                  {Object.values(filters).some(v => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0))
                    ? "Try adjusting your filters"
                    : "Start by adding your first utility bill"}
                </p>
                <Button onClick={() => setBillDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Bill
                </Button>
              </div>
            }
            onSort={handleSort}
            onSelect={setSelectedUtilityBills}
            selectedItems={selectedUtilityBills}
            getItemId={(bill) => bill._id}
            mobileCardRenderer={(bill, config) => (
              <UtilityBillMobileCard
                bill={bill}
                selected={config.selected}
                onSelect={config.onSelect}
                onEdit={(bill) => {
                  setSelectedBill(bill);
                  setBillDialogOpen(true);
                }}
                onDelete={handleDeleteBill}
                onView={(bill) => setViewingBill(bill)}
                onTogglePaid={handleTogglePaidStatus}
                properties={properties as Property[] || []}
              />
            )}
            className="bg-card rounded-lg border"
          />
          
          {/* Bulk Actions Toolbar */}
          <BulkActionsToolbar
            selectedItems={selectedUtilityBills}
            actions={tableConfig.bulkActions || []}
            onClearSelection={() => setSelectedUtilityBills([])}
          />
        </div>
      </div>

      {/* Add/Edit Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={(open) => {
        setBillDialogOpen(open);
        if (!open) setSelectedBill(null);
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{selectedBill ? "Edit Bill" : "Add Utility Bill"}</DialogTitle>
          </DialogHeader>
          <UtilityBillForm
            defaultMonth={filters.dateRange?.[1]}
            initial={selectedBill}
            onSubmit={async (data) => {
              try {
                if (selectedBill) {
                  await updateBill({
                    id: selectedBill._id,
                    userId: user.id,
                    ...data,
                    propertyId: data.propertyId as any,
                  });
                  toast.success("Bill updated successfully");
                } else {
                  await addBill({
                    userId: user.id,
                    ...data,
                    propertyId: data.propertyId as any,
                  });
                  toast.success("Bill added successfully");
                }
                setBillDialogOpen(false);
                setSelectedBill(null);
              } catch (error: any) {
                toast.error(formatErrorForToast(error));
              }
            }}
            onCancel={() => {
              setBillDialogOpen(false);
              setSelectedBill(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Entry Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Bulk Utility Bill Entry</DialogTitle>
          </DialogHeader>
          {selectedPropertyData ? (
            <BulkUtilityBillEntry
              propertyId={selectedPropertyData._id as any}
              propertyName={selectedPropertyData.name}
              onSubmit={async (billMonth, billsData) => {
                const result = await bulkAddBills({
                  userId: user.id,
                  propertyId: selectedPropertyData._id as any,
                  billMonth: billMonth,
                  bills: billsData,
                });
                if (result.createdBillIds.length > 0) {
                  setBulkDialogOpen(false);
                  toast.success(`Successfully added ${result.createdBillIds.length} bills`);
                }
                return result;
              }}
              onCancel={() => setBulkDialogOpen(false)}
            />
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Please select a property from the filters first.
              </p>
              <Button onClick={() => setBulkDialogOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Charges Dialog */}
      <Dialog open={!!viewingBill} onOpenChange={(open) => !open && setViewingBill(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Bill Charges & Tenant Responsibilities</DialogTitle>
          </DialogHeader>
          {viewingBill && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{viewingBill.utilityType} - {viewingBill.billMonth}</h3>
                  <span className="text-lg font-semibold">${viewingBill.totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{viewingBill.provider}</p>
              </div>
              
              <BillSplitPreview
                propertyId={viewingBill.propertyId}
                utilityType={viewingBill.utilityType}
                totalAmount={viewingBill.totalAmount}
                billId={viewingBill._id}
                userId={user.id}
              />
              
              <div className="flex justify-end">
                <Button onClick={() => setViewingBill(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tenant Statement Generator Dialog */}
      <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Generate Tenant Statement</DialogTitle>
          </DialogHeader>
          {filters.propertyId && (
            <TenantStatementGenerator
              propertyId={filters.propertyId as any}
              userId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {confirmDialog}
      
    </div>
  );
}