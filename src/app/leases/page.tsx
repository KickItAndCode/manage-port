"use client";
import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaseForm } from "@/components/LeaseForm";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { Archive, Eye, EyeOff, Layers, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { createLeaseTableConfig, LeaseMobileCard, type Lease, type Property } from "@/lib/table-configs";
import { UtilityResponsibilitySnapshot } from "@/components/UtilityResponsibilitySnapshot";
import { useLeaseStatuses } from "@/hooks/use-lease-status";
import { sortLeasesByStatus } from "@/lib/lease-status";

function LeasesPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const preSelectedPropertyId = searchParams.get('propertyId');
  
  const propertiesResult = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const properties = propertiesResult?.properties || propertiesResult || [];
  
  // State declarations
  const [modalOpen, setModalOpen] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  
  // Determine if we should use pagination (only when not searching)
  const isSearchMode = !!search;
  
  // Query leases with pagination when not searching, or fetch all when searching
  const leasesResult = useQuery(
    api.leases.getLeases,
    user ? {
      userId: user.id,
      propertyId: filterProperty ? (filterProperty as any) : undefined,
      limit: isSearchMode ? 1000 : itemsPerPage,
      offset: isSearchMode ? 0 : (currentPage - 1) * itemsPerPage,
    } : "skip"
  );
  
  // Extract leases and pagination info
  const leasesFromDb = leasesResult?.leases || (Array.isArray(leasesResult) ? leasesResult : []);
  const totalLeases = leasesResult?.total || (Array.isArray(leasesResult) ? leasesResult.length : 0);
  const hasMore = leasesResult?.hasMore || false;
  const totalPages = Math.ceil(totalLeases / itemsPerPage);
  
  // Get all documents (without pagination for lease document filtering)
  const allDocumentsResult = useQuery(api.documents.getDocuments, user ? { userId: user.id, limit: 1000 } : "skip");
  const allDocuments = allDocumentsResult?.documents || (Array.isArray(allDocumentsResult) ? allDocumentsResult : []);
  
  // Compute status for all leases
  const leases = useLeaseStatuses(leasesFromDb || []);
  const addLease = useMutation(api.leases.addLease);
  const updateLease = useMutation(api.leases.updateLease);
  const deleteLease = useMutation(api.leases.deleteLease);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpiredLeases, setShowExpiredLeases] = useState(false);
  const [selectedLeases, setSelectedLeases] = useState<Lease[]>([]);
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Auto-open modal if coming from property page
  useEffect(() => {
    if (preSelectedPropertyId && properties) {
      // Check if the property exists and belongs to the user
      const property = properties.find(p => p._id === preSelectedPropertyId);
      if (property) {
        setEditLease(null);
        setModalOpen(true);
      }
    }
  }, [preSelectedPropertyId, properties]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterProperty]);

  // Days until expiry is now computed in the lease object

  // Filtering (client-side search for tenant name, property filter is server-side)
  const filtered = (leases || []).filter((l: any) => {
    if (search && !l.tenantName.toLowerCase().includes(search.toLowerCase())) return false;
    // filterProperty is already handled server-side, but keep this for safety
    if (filterProperty && l.propertyId !== filterProperty) return false;
    return true;
  });

  // Separate active/pending and expired leases using computed status
  const activeAndPendingLeases = filtered.filter((l: any) => l.computedStatus === "active" || l.computedStatus === "pending");
  const expiredLeases = filtered.filter((l: any) => l.computedStatus === "expired");
  
  // Sort leases by status priority
  const sortedActiveAndPending = sortLeasesByStatus(activeAndPendingLeases);
  const sortedExpired = sortLeasesByStatus(expiredLeases);
  
  // Use sorted arrays for display
  const displayActiveAndPending = sortedActiveAndPending;
  const displayExpired = sortedExpired;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get documents for a specific lease
  const getLeaseDocuments = (leaseId: string) => {
    if (!allDocuments) return [];
    return allDocuments.filter(doc => doc.leaseId === leaseId);
  };

  // Get status badge with computed status and expiry info
  const getStatusBadge = (lease: any) => {
    const status = lease.computedStatus;
    const daysLeft = lease.daysUntilExpiry;
    
    if (status === "active" && daysLeft !== null && daysLeft <= 60 && daysLeft >= 0) {
      return (
        <div className="flex items-center gap-2">
          <StatusBadge status={status} variant="compact" />
          <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">
            {daysLeft}d left
          </Badge>
        </div>
      );
    }
    return <StatusBadge status={status} variant="compact" />;
  };

  // Handlers for ResponsiveTable
  const handleEditLease = (lease: Lease) => {
    setEditLease(lease);
    setModalOpen(true);
  };

  const handleDeleteLease = (lease: Lease) => {
    if (!user) return;
    confirm({
      title: "Delete Lease",
      description: "Delete this lease? This will also delete any associated documents.",
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          await deleteLease({ id: lease._id as any, userId: user.id });
          toast.success("Lease deleted successfully");
        } catch (err: any) {
          const errorMessage = formatErrorForToast(err);
          toast.error(errorMessage);
          console.error("Delete lease error:", err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleViewDocuments = (lease: Lease) => {
    // This will be handled by the mobile card's document viewer
    // The table config already includes document viewing in the dropdown
  };

  const handleSort = (column: keyof Lease, direction: "asc" | "desc") => {
    // Sorting is handled by ResponsiveTable internally
  };

  // Handlers
  async function handleSubmit(form: any) {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (editLease) {
        await updateLease({ 
          ...form, 
          id: editLease._id, 
          userId: user.id, 
          propertyId: form.propertyId as any,
          unitId: form.unitId as any
        });
      } else {
        await addLease({ ...form, userId: user.id, propertyId: form.propertyId as any });
      }
      
      // Document creation is handled by the addLease mutation
      // No need to create documents here to avoid duplicates
      
      setModalOpen(false);
      setEditLease(null);
    } catch (err: any) {
      setError(formatErrorForToast(err));
    } finally {
      setLoading(false);
    }
  }

  // Comprehensive leases page loading skeleton
  const LeasesLoadingSkeleton = () => (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <Skeleton className="h-8 sm:h-9 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 items-start sm:items-end">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-10 w-full sm:w-auto" />
        
        {/* Expired Leases Toggle skeleton */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-sm">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Active & Pending Leases skeleton */}
        <Card className="p-4 sm:p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          
          {/* Mobile Card View skeleton */}
          <div className="lg:hidden space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4 border">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end pt-2 border-t">
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Desktop Table View skeleton */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="space-y-4">
              {/* Table header */}
              <div className="grid grid-cols-7 gap-4 pb-3 border-b">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
              
              {/* Table rows */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-7 gap-4 py-4 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8 rounded" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  // Signed-out state skeleton with overlay
  const SignedOutSkeleton = () => (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <Skeleton className="h-8 sm:h-9 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 items-start sm:items-end">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-10 w-full sm:w-auto" />
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg border border-border">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>

      <Card className="p-4 sm:p-6 relative">
        {/* Authentication overlay */}
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 mx-auto" />
              <Skeleton className="h-4 w-56 mx-auto" />
            </div>
            <Skeleton className="h-10 w-28 mx-auto" />
          </div>
        </div>

        {/* Background content (dimmed) */}
        <div className="opacity-30">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="lg:hidden space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-4 border">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  if (!user) return <SignedOutSkeleton />;
  if (!properties) return <LeasesLoadingSkeleton />;

  // Create table config for leases
  const leaseTableConfig = createLeaseTableConfig(
    handleEditLease,
    handleDeleteLease,
    handleViewDocuments,
    properties as Property[],
    getLeaseDocuments
  );

  const LeaseTable = ({ leases: leaseList, title }: { leases: Lease[], title: string }) => {
    const [selectedItems, setSelectedItems] = useState<Lease[]>([]);
    
    return (
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <ResponsiveTable
          data={leaseList}
          config={leaseTableConfig}
          loading={loading}
          onSort={handleSort}
          onSelect={setSelectedItems}
          selectedItems={selectedItems}
          getItemId={(lease) => lease._id}
          mobileCardRenderer={(lease, { selected, onSelect }) => (
            <LeaseMobileCard
              lease={lease}
              selected={selected}
              onSelect={onSelect}
              onEdit={handleEditLease}
              onDelete={handleDeleteLease}
              onViewDocuments={handleViewDocuments}
              properties={properties as Property[]}
              getLeaseDocuments={getLeaseDocuments}
            />
          )}
          emptyState={
            <EmptyState
              icon={Layers}
              title={`No ${title.toLowerCase()} found`}
              description={
                search || filterProperty
                  ? "Try adjusting your filters"
                  : title.includes("Active") || title.includes("Pending")
                  ? "Add your first lease to get started"
                  : "No expired leases"
              }
              action={
                (title.includes("Active") || title.includes("Pending")) &&
                !search &&
                !filterProperty
                  ? {
                      label: "Add Lease",
                      onClick: () => {
                        setEditLease(null);
                        setModalOpen(true);
                      },
                      icon: Plus,
                    }
                  : undefined
              }
            />
          }
        />
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Leases</h1>
        <Button 
          onClick={() => {
            setEditLease(null);
            setModalOpen(true);
          }} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors duration-200" 
          disabled={!properties || properties.length === 0}
        >
          Add Lease
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 items-start sm:items-end">
        <Input
          placeholder="Search tenant name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs bg-input text-foreground border border-border transition-colors duration-200"
        />
        <select
          className="w-full sm:w-auto bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        
        {/* Expired Leases Toggle */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg border border-border transition-all duration-200 hover:bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Archive className="w-4 h-4" />
            <span>History</span>
            {displayExpired.length > 0 && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {displayExpired.length}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowExpiredLeases(!showExpiredLeases)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              showExpiredLeases ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                showExpiredLeases ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
            showExpiredLeases ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {showExpiredLeases ? (
              <>
                <Eye className="w-3 h-3" />
                <span>Showing</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" />
                <span>Hidden</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {displayActiveAndPending.length > 0 && (
          <LeaseTable leases={displayActiveAndPending} title="Active & Pending Leases" />
        )}
        
        {/* Expired Leases - Only show when toggle is enabled */}
        {showExpiredLeases && displayExpired.length > 0 && (
          <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">Lease History</span>
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <LeaseTable leases={displayExpired} title="Expired Leases" />
            </div>
          </div>
        )}
        
        {/* Show helpful message when history is hidden but expired leases exist */}
        {!showExpiredLeases && displayExpired.length > 0 && (
          <div className="flex items-center justify-center p-8 bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg animate-in fade-in-0 duration-300">
            <div className="text-center space-y-2">
              <Archive className="w-8 h-8 mx-auto text-muted-foreground animate-in zoom-in-50 duration-500" />
              <p className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-500 delay-100">
                {displayExpired.length} expired lease{displayExpired.length !== 1 ? 's' : ''} hidden
              </p>
              <button
                onClick={() => setShowExpiredLeases(true)}
                className="text-sm text-primary hover:underline transition-colors duration-200 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 delay-200"
              >
                Show lease history
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination - Only show when not in search mode and there are multiple pages */}
      {!isSearchMode && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t p-4 mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalLeases)} of {totalLeases} leases
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="min-w-[2.5rem]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || !hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLease ? "Edit Lease" : "Add Lease"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <LeaseForm
                initial={editLease || (preSelectedPropertyId ? { propertyId: preSelectedPropertyId } : undefined)}
                onSubmit={handleSubmit}
                loading={loading}
                userId={user!.id}
                onCancel={() => {
                  setModalOpen(false);
                  setEditLease(null);
                  setError(null);
                }}
                properties={properties || []}
              />
            </div>
            {editLease && editLease._id && (
              <div className="lg:sticky lg:top-4 lg:self-start">
                <UtilityResponsibilitySnapshot
                  leaseId={editLease._id as any}
                  userId={user!.id}
                  showEdit={true}
                  compact={true}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Utility settings moved to universal allocation in property details */}

      {confirmDialog}
    </div>
  );
}

export default function LeasesPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <LeasesPageContent />
    </Suspense>
  );
}