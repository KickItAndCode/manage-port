"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationWizard, type PropertyWizardData } from "@/components/PropertyCreationWizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon, Wand2, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ResponsiveTable, BulkActionsToolbar } from "@/components/ui/responsive-table";
import { createPropertyTableConfig, PropertyMobileCard, type Property } from "@/lib/table-configs";


function PropertiesContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const updateProperty = useMutation(api.properties.updateProperty);
  const deleteProperty = useMutation(api.properties.deleteProperty);
  const createPropertyWithUnits = useMutation(api.properties.createPropertyWithUnits);

  const [edit, setEdit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Handle URL parameters on mount
  useEffect(() => {
    if (!searchParams) return;
    
    // Check for type filter from URL
    const urlType = searchParams.get('type');
    if (urlType && propertyTypes.includes(urlType)) {
      setTypeFilter(urlType);
    }
    
    // Check for status filter from URL
    const urlStatus = searchParams.get('status');
    if (urlStatus && statusOptions.includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    
    // Check for search query from URL
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
    }
    
    // Scroll to top when page loads from navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);
  const [sortKey, setSortKey] = useState<keyof Property>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  const propertyTypes = [
    "Apartment",
    "Condo",
    "Single Family",
    "Townhouse",
    "Multi-Family",
    "Duplex",
    "Other",
  ];
  const statusOptions = ["Vacant", "Occupied", "Under Maintenance", "Other"];

  function handleSort(key: keyof Property, direction: "asc" | "desc") {
    setSortKey(key);
    setSortDir(direction);
  }

  const filtered = useMemo(() => {
    return (properties || [])
      .filter((p) =>
        (!search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.address.toLowerCase().includes(search.toLowerCase()) ||
          p.type.toLowerCase().includes(search.toLowerCase())) &&
        (!typeFilter || p.type === typeFilter) &&
        (!statusFilter || p.status === statusFilter)
      )
      .sort((a, b) => {
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
        return 0;
      });
  }, [properties, search, typeFilter, statusFilter, sortKey, sortDir]);

  const handleBulkDelete = async (propertiesToDelete: Property[]) => {
    if (propertiesToDelete.length === 0 || !user) return;
    confirm({
      title: "Delete Properties",
      description: `Delete ${propertiesToDelete.length} selected properties? This will also delete associated leases, utilities, and documents.`,
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        try {
          const results = await Promise.all(
            propertiesToDelete.map(property => 
              deleteProperty({ id: property._id as any, userId: user.id })
            )
          );
          setSelectedProperties([]);
          
          // Show success toast for bulk deletion
          if (results.length === 1) {
            toast.success(results[0].message);
          } else {
            toast.success(`Successfully deleted ${results.length} properties and all associated data.`);
          }
        } catch (err: any) {
          console.error("Bulk delete error:", err);
          toast.error("Some properties could not be deleted: " + formatErrorForToast(err));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteProperty = async (property: Property) => {
    if (!user) return;
    confirm({
      title: "Delete Property",
      description: "Delete this property? This will also delete associated leases, utilities, and documents.",
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await deleteProperty({ id: property._id as any, userId: user.id });
          toast.success(result.message);
        } catch (err: any) {
          console.error("Delete property error:", err);
          toast.error(formatErrorForToast(err));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleWizardSubmit = async (data: PropertyWizardData) => {
    if (!user) {
      toast.error("You must be signed in to create a property");
      return;
    }

    setLoading(true);
    try {
      const result = await createPropertyWithUnits({
        // Basic property info
        userId: user.id,
        name: data.name,
        address: data.address,
        type: data.type,
        status: data.status,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        purchaseDate: data.purchaseDate,
        monthlyMortgage: data.monthlyMortgage,
        monthlyCapEx: data.monthlyCapEx,
        
        // Property type and units
        propertyType: data.propertyType,
        units: data.units,
        
        // Utility setup
        utilityPreset: data.utilityPreset,
        customSplit: data.customSplit,
      });

      toast.success(result.message);
      setWizardOpen(false);
      
      // Navigate to the new property
      router.push(`/properties/${result.propertyId}`);
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error(formatErrorForToast(error));
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive properties page loading skeleton
  const PropertiesLoadingSkeleton = () => (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <Skeleton className="h-8 sm:h-9 w-32" />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-6">
        {/* Search and Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-1">
          <Skeleton className="h-10 w-full sm:w-64" />
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <Skeleton className="h-10 flex-1 sm:w-32" />
            <Skeleton className="h-10 flex-1 sm:w-32" />
          </div>
        </div>
      </div>

      {/* Properties List skeleton */}
      <Card className="p-3 sm:p-6">
        {/* Mobile Cards skeleton */}
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-3">
                    {/* Essential info */}
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    
                    {/* Important info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-18" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Skeleton className="h-8 w-16" />
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
        <div className="hidden lg:block overflow-x-auto">
          <div className="w-full">
            {/* Table header */}
            <div className="flex border-b pb-3 mb-4">
              <div className="w-8 mr-4">
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="flex-1 grid grid-cols-7 gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-18" />
                <Skeleton className="h-4 w-16" />
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
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  // Signed-out state skeleton - shows page structure with subtle auth hint
  const SignedOutSkeleton = () => (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <Skeleton className="h-8 sm:h-9 w-32" />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-6">
        {/* Search and Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-1">
          <Skeleton className="h-10 w-full sm:w-64" />
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <Skeleton className="h-10 flex-1 sm:w-32" />
            <Skeleton className="h-10 flex-1 sm:w-32" />
          </div>
        </div>
      </div>

      {/* Properties List skeleton with sign-in overlay */}
      <Card className="p-3 sm:p-6 relative">
        {/* Subtle overlay to indicate authentication needed */}
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

        {/* Background content skeleton (dimmed) */}
        <div className="opacity-30">
          {/* Mobile Cards skeleton */}
          <div className="lg:hidden space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-4 w-4 mt-1" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="space-y-1">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Skeleton className="h-8 w-16" />
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
          <div className="hidden lg:block overflow-x-auto">
            <div className="w-full">
              <div className="flex border-b pb-3 mb-4">
                <div className="w-8 mr-4">
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="flex-1 grid grid-cols-7 gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-18" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex py-4 border-b border-border/50">
                  <div className="w-8 mr-4">
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!user) return <SignedOutSkeleton />;
  if (!properties) return <PropertiesLoadingSkeleton />;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Properties</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Wand2 className="w-4 h-4" />
                Property Wizard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[95vh] p-0 overflow-hidden">
              <PropertyCreationWizard
                isModal={true}
                onSubmit={handleWizardSubmit}
                onCancel={() => setWizardOpen(false)}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-1">
          <input
            type="text"
            placeholder="Search by name, address, or type..."
            className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64 transition-colors duration-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200 flex-1 sm:flex-none"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {propertyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200 flex-1 sm:flex-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Properties List */}
      <Card className="p-3 sm:p-6">
        {/* Properties Table */}
        <ResponsiveTable
          data={filtered}
          config={createPropertyTableConfig(
            (property) => setEdit(property),
            handleDeleteProperty,
            (property) => router.push(`/properties/${property._id}`)
          )}
          loading={loading}
          onSort={handleSort}
          onSelect={setSelectedProperties}
          selectedItems={selectedProperties}
          getItemId={(property) => property._id}
          mobileCardRenderer={(property, { selected, onSelect }) => (
            <Card className={selected ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary" : ""}>
              <PropertyMobileCard
                property={property}
                selected={selected}
                onSelect={onSelect}
                onEdit={(p) => setEdit(p)}
                onDelete={handleDeleteProperty}
                onView={(p) => router.push(`/properties/${p._id}`)}
              />
            </Card>
          )}
          emptyState={
            <div className="text-center text-muted-foreground py-12">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2 text-foreground">No properties found</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                {search || typeFilter || statusFilter ? 
                  "Try adjusting your filters" : 
                  "Add your first property to get started"
                }
              </p>
              <p className="text-muted-foreground">
                Use the Property Wizard from the dashboard to add your first property.
              </p>
            </div>
          }
        />
      </Card>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedItems={selectedProperties}
        actions={[
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            action: handleBulkDelete
          }
        ]}
        onClearSelection={() => setSelectedProperties([])}
      />

      <Dialog open={!!edit} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEdit(null);
          setError(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          <PropertyForm
            initial={edit}
            onSubmit={async (data) => {
              try {
                setLoading(true);
                setError(null);
                await updateProperty({ ...data, id: edit._id, userId: user.id });
                setEdit(null);
              } catch (err: any) {
                setError(err.data?.message || err.message || "An error occurred");
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => setEdit(null)}
            loading={loading}
          />
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading properties...
          </div>
        </div>
      </div>
    }>
      <PropertiesContent />
    </Suspense>
  );
} 