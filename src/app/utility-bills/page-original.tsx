"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import type { CalculatedTenantCharge } from "@/../convex/utilityCharges";
import { formatErrorForToast } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { UtilityBillForm } from "@/components/UtilityBillForm";
import { BulkUtilityBillEntry } from "@/components/BulkUtilityBillEntry";
import { BillSplitPreview } from "@/components/BillSplitPreview";
import { TenantStatementGenerator } from "@/components/TenantStatementGenerator";
import { LoadingContent } from "@/components/LoadingContent";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ResponsiveTable, BulkActionsToolbar } from "@/components/ui/responsive-table";
import { UnifiedFilterSystem, useUtilityBillFilters } from "@/components/ui/unified-filter-system";
import { 
  createUtilityBillTableConfig, 
  UtilityBillMobileCard, 
  type UtilityBill,
  type Property
} from "@/lib/table-configs";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Receipt, 
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  Building,
  Calendar,
  TrendingUp,
  FileText,
  RotateCcw,
  Download,
  User,
  Home
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

type GroupingOption = "none" | "property" | "utility" | "month" | "status" | "tenant";
type SortOption = "date" | "amount" | "utility" | "status";

export default function UtilityBillsPage() {
  const { user } = useUser();
  
  // State for filtering and searching - using unified filter system
  const [internalFilteredData, setInternalFilteredData] = useState<UtilityBill[]>([]);
  const [internalActiveFilters, setInternalActiveFilters] = useState<Record<string, any>>({});
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  
  // State for grouping and sorting
  const [groupBy, setGroupBy] = useState<GroupingOption>("property");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  
  // Dialog states
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [selectedUtilityBills, setSelectedUtilityBills] = useState<UtilityBill[]>([]);
  const [sortKey, setSortKey] = useState<keyof UtilityBill>("billMonth");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Extract date filters from active filters
  const [startMonth, setStartMonth] = useState<string | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<string | undefined>(undefined);

  // Queries
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const leases = useQuery(api.leases.getActiveLeases,
    user ? { userId: user.id } : "skip"
  );
  
  // Get all calculated charges for the user
  const allUserCharges = useQuery(api.utilityCharges.calculateAllTenantCharges,
    user ? { 
      userId: user.id,
      propertyId: internalActiveFilters.propertyId ? internalActiveFilters.propertyId as any : undefined,
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    } : "skip"
  );
  
  const bills = useQuery(
    internalActiveFilters.propertyId 
      ? api.utilityBills.getUtilityBillsByProperty 
      : api.utilityBills.getUtilityBills, 
    user ? (internalActiveFilters.propertyId ? {
      userId: user.id,
      propertyId: internalActiveFilters.propertyId as any,
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    } : {
      userId: user.id,
    }) : "skip"
  );

  // Mutations
  const addBill = useMutation(api.utilityBills.addUtilityBill);
  const updateBill = useMutation(api.utilityBills.updateUtilityBill);
  const deleteBill = useMutation(api.utilityBills.deleteUtilityBill);
  const bulkAddBills = useMutation(api.utilityBills.bulkAddUtilityBills);

  // Table sort handler
  function handleSort(key: keyof UtilityBill, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDir(direction);
  }

  // Bulk operations handlers
  const handleBulkDelete = async (billsToDelete: UtilityBill[]) => {
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

  const handleBulkMarkPaid = async (billsToUpdate: UtilityBill[]) => {
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

  const handleBulkMarkUnpaid = async (billsToUpdate: UtilityBill[]) => {
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

  // Configure unified filter system
  const { filterConfigs, searchConfig } = useUtilityBillFilters(
    bills || [], 
    properties || []
  );

  // Process filtered data with tenant filtering and sorting
  const processedData = useMemo(() => {
    let data = internalFilteredData;
    
    // Apply tenant-specific filtering if needed
    if (selectedTenant && allUserCharges) {
      data = data.filter(bill =>
        allUserCharges.some(charge => 
          charge.utilityBillId === bill._id && charge.leaseId === selectedTenant
        )
      );
    }

    // Apply table sorting
    const sortedData = [...data].sort((a, b) => {
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

    return sortedData;
  }, [internalFilteredData, selectedTenant, allUserCharges, sortKey, sortDir]);

  // Extract date filters from active filters
  useEffect(() => {
    if (internalActiveFilters.billMonth && Array.isArray(internalActiveFilters.billMonth)) {
      const [start, end] = internalActiveFilters.billMonth;
      setStartMonth(start);
      setEndMonth(end);
    } else {
      setStartMonth(undefined);
      setEndMonth(undefined);
    }
  }, [internalActiveFilters.billMonth]);

  // No need to sync - using activeFilters.propertyId directly

  // Calculate summary stats (tenant-aware when filtering by tenant)
  const stats = useMemo(() => {
    const total = processedData.length;
    const unpaid = processedData.filter(b => !b.landlordPaidUtilityCompany).length;
    
    // If tenant is selected, calculate tenant-specific amounts from charges
    if (selectedTenant && allUserCharges) {
      const tenantBillIds = new Set(processedData.map(b => b._id));
      const relevantCharges = allUserCharges.filter(c => 
        tenantBillIds.has(c.utilityBillId) && c.leaseId === selectedTenant
      );
      
      const totalAmount = relevantCharges.reduce((sum, c) => sum + c.chargedAmount, 0);
      const unpaidAmount = relevantCharges.reduce((sum, c) => sum + c.remainingAmount, 0);
      
      return { total, unpaid, totalAmount, unpaidAmount };
    } else {
      // Standard calculation for all bills
      const totalAmount = processedData.reduce((sum, b) => sum + b.totalAmount, 0);
      const unpaidAmount = processedData.filter(b => !b.landlordPaidUtilityCompany).reduce((sum, b) => sum + b.totalAmount, 0);
      
      return { total, unpaid, totalAmount, unpaidAmount };
    }
  }, [processedData, selectedTenant, allUserCharges]);

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

  // Create table configuration with stable callbacks
  const tableConfig = useMemo(() => {
    const onEdit = (bill: UtilityBill) => {
      setSelectedBill(bill);
      setBillDialogOpen(true);
    };

    const onView = (bill: UtilityBill) => setViewingBill(bill);

    return createUtilityBillTableConfig(
      onEdit,
      handleDeleteBill,
      onView,
      handleTogglePaidStatus,
      properties as Property[] || []
    );
  }, [handleDeleteBill, handleTogglePaidStatus, properties]);

  // Update bulk actions with actual handlers
  tableConfig.bulkActions = [
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


  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Sign in to manage utility bills.
        </div>
      </div>
    );
  }

  const selectedPropertyData = properties?.find(p => p._id === internalActiveFilters.propertyId);

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
            {selectedTenant && internalActiveFilters.propertyId && (
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
                  <p className="text-lg sm:text-2xl font-bold" data-testid="total-bills-count">{stats.total}</p>
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
                  <p className="text-lg sm:text-2xl font-bold text-orange-600" data-testid="unpaid-bills-count">{stats.unpaid}</p>
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
                    {selectedTenant ? "Tenant Charges" : "Total Amount"}
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
                    {selectedTenant ? "Outstanding Balance" : "Unpaid Amount"}
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600" data-testid="unpaid-amount">${stats.unpaidAmount.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unified Filter System */}
        <UnifiedFilterSystem
          searchConfig={searchConfig}
          filterConfigs={filterConfigs}
          data={bills || []}
          onFilteredDataChange={(filteredData, filters) => {
            setInternalFilteredData(filteredData);
            setInternalActiveFilters(filters);
          }}
          defaultCollapsed={false}
          showActiveFilterBadges={true}
          enableQuickFilters={true}
        />

        {/* Additional Tenant Filter - always visible but contextual */}
        {leases && leases.length > 0 && (
          <div className="bg-muted/50 rounded-lg border p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label htmlFor="tenant" className="text-sm font-medium text-muted-foreground min-w-fit">
                Tenant Filter:
              </Label>
              <SelectNative
                id="tenant"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className={cn(
                  "flex-1 sm:max-w-xs text-sm",
                  !internalActiveFilters.propertyId && "opacity-50"
                )}
                disabled={!internalActiveFilters.propertyId}
              >
                <option value="">
                  {!internalActiveFilters.propertyId 
                    ? "Select a property first" 
                    : `All Tenants (${(leases || []).length} available)`}
                </option>
                {internalActiveFilters.propertyId && leases?.map((lease) => (
                  <option key={lease._id} value={lease._id}>
                    {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                  </option>
                ))}
              </SelectNative>
              {!internalActiveFilters.propertyId && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Select a property to filter by tenant
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bills List with ResponsiveTable */}
        <div className="space-y-4">
          <ResponsiveTable
            data={processedData}
            config={tableConfig}
            loading={!bills}
            emptyState={
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bills Found</h3>
                <p className="text-muted-foreground mb-4">
                  {Object.keys(internalActiveFilters).length > 0 || selectedTenant
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
            defaultMonth={endMonth}
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
          {internalActiveFilters.propertyId && (
            <TenantStatementGenerator
              propertyId={internalActiveFilters.propertyId as any}
              userId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {confirmDialog}
      
    </div>
  );
}