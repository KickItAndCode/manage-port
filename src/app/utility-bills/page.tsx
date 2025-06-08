"use client";
import React, { useState, useMemo } from "react";
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
import { UtilityBillForm } from "@/components/UtilityBillForm";
import { BulkUtilityBillEntry } from "@/components/BulkUtilityBillEntry";
import { BillSplitPreview } from "@/components/BillSplitPreview";
import { TenantStatementGenerator } from "@/components/TenantStatementGenerator";
import { LoadingContent } from "@/components/LoadingContent";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
  Edit,
  Eye,
  MoreHorizontal,
  Building,
  Calendar,
  TrendingUp,
  FileText,
  RotateCcw,
  Download,
  User
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
  
  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedUtilityType, setSelectedUtilityType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [startMonth, setStartMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-01`; // January of current year
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // Current month
  });
  
  // State for grouping and sorting
  const [groupBy, setGroupBy] = useState<GroupingOption>("property");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  
  // Dialog states
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [viewingBill, setViewingBill] = useState<any>(null);
  
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

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
      propertyId: selectedProperty ? selectedProperty as any : undefined,
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    } : "skip"
  );
  
  const bills = useQuery(
    selectedProperty 
      ? api.utilityBills.getUtilityBillsByProperty 
      : api.utilityBills.getUtilityBills, 
    user ? (selectedProperty ? {
      userId: user.id,
      propertyId: selectedProperty as any,
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

  // Utility helper functions
  const getUtilityIcon = (type: string) => {
    switch (type) {
      case "Electric": return Zap;
      case "Water": return Droplets;
      case "Gas": return Flame;
      case "Internet": case "Cable": return Wifi;
      case "Trash": return Trash;
      default: return Receipt;
    }
  };

  const getUtilityColor = (type: string) => {
    switch (type) {
      case "Electric": return "text-yellow-600 bg-yellow-50";
      case "Water": return "text-blue-600 bg-blue-50";
      case "Gas": return "text-orange-600 bg-orange-50";
      case "Internet": case "Cable": return "text-purple-600 bg-purple-50";
      case "Trash": return "text-gray-600 bg-gray-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  // Filter and sort bills with tenant-specific logic
  const filteredAndSortedBills = useMemo(() => {
    if (!bills) return [];
    
    let filtered = bills.filter(bill => {
      const matchesSearch = searchTerm === "" || 
        bill.utilityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesUtilityType = selectedUtilityType === "" || bill.utilityType === selectedUtilityType;
      const matchesStatus = selectedStatus === "" || 
        (selectedStatus === "paid" && bill.landlordPaidUtilityCompany) ||
        (selectedStatus === "unpaid" && !bill.landlordPaidUtilityCompany);
      
      const matchesDateRange = (!startMonth || bill.billMonth >= startMonth) &&
        (!endMonth || bill.billMonth <= endMonth);
      
      // Tenant filtering: only show bills where the selected tenant has responsibility
      let matchesTenant = true;
      if (selectedTenant && allUserCharges) {
        matchesTenant = allUserCharges.some(charge => 
          charge.utilityBillId === bill._id && charge.leaseId === selectedTenant
        );
      }
      
      return matchesSearch && matchesUtilityType && matchesStatus && matchesDateRange && matchesTenant;
    });

    // Sort bills
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return b.billMonth.localeCompare(a.billMonth);
        case "amount":
          return b.totalAmount - a.totalAmount;
        case "utility":
          return a.utilityType.localeCompare(b.utilityType);
        case "status":
          return Number(a.landlordPaidUtilityCompany) - Number(b.landlordPaidUtilityCompany);
        default:
          return 0;
      }
    });

    return filtered;
  }, [bills, searchTerm, selectedUtilityType, selectedStatus, startMonth, endMonth, sortBy]);

  // Group bills based on groupBy option
  const groupedBills = useMemo(() => {
    if (groupBy === "none") {
      return { "All Bills": filteredAndSortedBills };
    }

    const groups: Record<string, any[]> = {};
    
    filteredAndSortedBills.forEach(bill => {
      let groupKey = "";
      
      switch (groupBy) {
        case "property":
          const property = properties?.find(p => p._id === bill.propertyId);
          groupKey = property?.name || "Unknown Property";
          break;
        case "utility":
          groupKey = bill.utilityType;
          break;
        case "month":
          groupKey = bill.billMonth;
          break;
        case "status":
          groupKey = bill.landlordPaidUtilityCompany ? "Paid" : "Unpaid";
          break;
        case "tenant":
          // Find tenant name from charges
          const charge = allUserCharges?.find(c => c.utilityBillId === bill._id);
          groupKey = charge?.tenantName || "No Tenant Assigned";
          break;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(bill);
    });

    return groups;
  }, [filteredAndSortedBills, groupBy, properties]);

  // Calculate summary stats (tenant-aware when filtering by tenant)
  const stats = useMemo(() => {
    const total = filteredAndSortedBills.length;
    const unpaid = filteredAndSortedBills.filter(b => !b.landlordPaidUtilityCompany).length;
    
    // If tenant is selected, calculate tenant-specific amounts from charges
    if (selectedTenant && allUserCharges) {
      const tenantBillIds = new Set(filteredAndSortedBills.map(b => b._id));
      const relevantCharges = allUserCharges.filter(c => 
        tenantBillIds.has(c.utilityBillId) && c.leaseId === selectedTenant
      );
      
      const totalAmount = relevantCharges.reduce((sum, c) => sum + c.chargedAmount, 0);
      const unpaidAmount = relevantCharges.reduce((sum, c) => sum + c.remainingAmount, 0);
      
      return { total, unpaid, totalAmount, unpaidAmount };
    } else {
      // Standard calculation for all bills
      const totalAmount = filteredAndSortedBills.reduce((sum, b) => sum + b.totalAmount, 0);
      const unpaidAmount = filteredAndSortedBills.filter(b => !b.landlordPaidUtilityCompany).reduce((sum, b) => sum + b.totalAmount, 0);
      
      return { total, unpaid, totalAmount, unpaidAmount };
    }
  }, [filteredAndSortedBills, selectedTenant, allUserCharges]);

  // Get unique utility types for filter
  const utilityTypes = useMemo(() => {
    if (!bills) return [];
    return [...new Set(bills.map(b => b.utilityType))].sort();
  }, [bills]);

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

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedProperty("");
    setSelectedUtilityType("");
    setSelectedStatus("");
    setSelectedTenant("");
    const today = new Date();
    setStartMonth(`${today.getFullYear()}-01`);
    setEndMonth(today.toISOString().slice(0, 7));
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Sign in to manage utility bills.
        </div>
      </div>
    );
  }

  const selectedPropertyData = properties?.find(p => p._id === selectedProperty);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Utility Bill Management</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Comprehensive bill tracking, payments, and tenant charge management
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedTenant && selectedProperty && (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card data-testid="stat-card-total">
            <CardContent className="p-3 md:p-4">
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
            <CardContent className="p-3 md:p-4">
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
            <CardContent className="p-3 md:p-4">
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
            <CardContent className="p-3 md:p-4">
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

        {/* Filters and Controls */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">Filters & Search</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Quick Filters */}
            <div className="space-y-4">
              {/* Search - Full Width */}
              <div>
                <Label htmlFor="search" className="text-sm font-medium">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search bills, providers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Main Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="property" className="text-sm font-medium">Property</Label>
                  <select
                    id="property"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                  >
                    <option value="">All Properties</option>
                    {properties?.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="utilityType" className="text-sm font-medium">Utility Type</Label>
                  <select
                    id="utilityType"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={selectedUtilityType}
                    onChange={(e) => setSelectedUtilityType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {utilityTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <select
                    id="status"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="tenant" className="text-sm font-medium">Tenant</Label>
                  <select
                    id="tenant"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                  >
                    <option value="">All Tenants</option>
                    {leases?.map((lease) => (
                      <option key={lease._id} value={lease._id}>
                        {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range and Display Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startMonth" className="text-sm font-medium">From Month</Label>
                  <Input
                    id="startMonth"
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endMonth" className="text-sm font-medium">To Month</Label>
                  <Input
                    id="endMonth"
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="groupBy" className="text-sm font-medium">Group By</Label>
                  <select
                    id="groupBy"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupingOption)}
                  >
                    <option value="none">No Grouping</option>
                    <option value="property">Property</option>
                    <option value="utility">Utility Type</option>
                    <option value="month">Month</option>
                    <option value="status">Payment Status</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="sortBy" className="text-sm font-medium">Sort By</Label>
                  <select
                    id="sortBy"
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="amount">Amount (Highest First)</option>
                    <option value="utility">Utility Type</option>
                    <option value="status">Payment Status</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills List */}
        <LoadingContent loading={!bills} skeletonRows={6}>
          {Object.entries(groupedBills).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bills Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedProperty || selectedUtilityType || selectedStatus
                    ? "Try adjusting your filters"
                    : "Start by adding your first utility bill"}
                </p>
                <Button onClick={() => setBillDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBills).map(([groupName, groupBills]) => (
                <Card key={groupName}>
                  {groupBy !== "none" && (
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {groupBy === "property" && <Building className="w-5 h-5" />}
                          {groupBy === "utility" && React.createElement(getUtilityIcon(groupName), { className: "w-5 h-5" })}
                          {groupBy === "month" && <Calendar className="w-5 h-5" />}
                          {groupBy === "status" && (groupName === "Paid" ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-orange-600" />)}
                          {groupBy === "tenant" && <User className="w-5 h-5" />}
                          {groupName}
                        </CardTitle>
                        <Badge variant="outline">
                          {groupBills.length} bill{groupBills.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                  )}
                  <CardContent className={groupBy !== "none" ? "pt-0" : "pt-6"}>
                    <div className="space-y-2">
                      {groupBills.map((bill) => {
                        const Icon = getUtilityIcon(bill.utilityType);
                        const colorClasses = getUtilityColor(bill.utilityType);
                        const property = properties?.find(p => p._id === bill.propertyId);
                        
                        return (
                          <div key={bill._id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors" data-testid="bill-item">
                            {/* Mobile Layout */}
                            <div className="block md:hidden space-y-3">
                              {/* Header Row */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={cn("p-2 rounded-lg flex-shrink-0", colorClasses)}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm truncate">{bill.utilityType}</h3>
                                    <p className="text-xs text-muted-foreground truncate">{bill.provider}</p>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" data-testid="bill-actions" className="flex-shrink-0">
                                      <MoreHorizontal className="w-4 h-4" data-testid="more-horizontal" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setViewingBill(bill)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Charges
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleTogglePaidStatus(bill)}>
                                      {bill.landlordPaidUtilityCompany ? (
                                        <>
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Mark Unpaid
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark Paid
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedBill(bill);
                                      setBillDialogOpen(true);
                                    }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteBill(bill)}
                                      className="text-destructive"
                                    >
                                      <Trash className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                      {bill.billMonth}
                                    </Badge>
                                  </div>
                                  {groupBy !== "property" && property && (
                                    <p className="flex items-center gap-1 text-muted-foreground">
                                      <Building className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{property.name}</span>
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">Due: {bill.dueDate}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold" data-testid="bill-amount">${bill.totalAmount.toFixed(2)}</p>
                                  <div className="flex justify-end mb-1">
                                    {bill.landlordPaidUtilityCompany ? (
                                      <Badge className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Unpaid
                                      </Badge>
                                    )}
                                  </div>
                                  {bill.landlordPaidUtilityCompany && bill.landlordPaidDate && (
                                    <p className="text-xs text-muted-foreground">
                                      Paid: {bill.landlordPaidDate}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Desktop Layout */}
                            <div className="hidden md:flex items-center justify-between">
                              {/* Bill Info */}
                              <div className="flex items-center gap-4 flex-1">
                                <div className={cn("p-2 rounded-lg", colorClasses)}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium">{bill.utilityType}</h3>
                                    <Badge variant="outline" className="text-xs">
                                      {bill.billMonth}
                                    </Badge>
                                    {bill.landlordPaidUtilityCompany ? (
                                      <Badge className="text-xs bg-green-100 text-green-800">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Unpaid
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <p>{bill.provider}</p>
                                    {groupBy !== "property" && property && (
                                      <p className="flex items-center gap-1">
                                        <Building className="w-3 h-3" />
                                        {property.name}
                                      </p>
                                    )}
                                    <p>Due: {bill.dueDate}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Amount and Actions */}
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-lg font-semibold" data-testid="bill-amount">${bill.totalAmount.toFixed(2)}</p>
                                  {bill.landlordPaidUtilityCompany && bill.landlordPaidDate && (
                                    <p className="text-xs text-muted-foreground">
                                      Paid: {bill.landlordPaidDate}
                                    </p>
                                  )}
                                </div>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" data-testid="bill-actions">
                                      <MoreHorizontal className="w-4 h-4" data-testid="more-horizontal" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setViewingBill(bill)}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Charges
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleTogglePaidStatus(bill)}>
                                      {bill.landlordPaidUtilityCompany ? (
                                        <>
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Mark Unpaid
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark Paid
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedBill(bill);
                                      setBillDialogOpen(true);
                                    }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteBill(bill)}
                                      className="text-destructive"
                                    >
                                      <Trash className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </LoadingContent>
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
          {selectedProperty && (
            <TenantStatementGenerator
              propertyId={selectedProperty as any}
              userId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {confirmDialog}
      
    </div>
  );
}