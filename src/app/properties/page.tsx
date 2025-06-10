"use client";
import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationWizard, type PropertyWizardData } from "@/components/PropertyCreationWizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon, Wand2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { ResponsiveTable, BulkActionsToolbar } from "@/components/ui/responsive-table";
import { createPropertyTableConfig, PropertyMobileCard, type Property } from "@/lib/table-configs";


export default function PropertiesPage() {
  const { user } = useUser();
  const router = useRouter();
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

  if (!user) return <div className="text-center text-muted-foreground">Sign in to manage properties.</div>;

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