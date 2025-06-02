"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown, Grid3X3, List, ImageIcon, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

type PropertySortKey = 'name' | 'type' | 'status' | 'address' | 'bedrooms' | 'bathrooms' | 'squareFeet' | 'monthlyRent' | 'purchaseDate';

export default function PropertiesPage() {
  const { user } = useUser();
  const router = useRouter();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const addProperty = useMutation(api.properties.addProperty);
  const updateProperty = useMutation(api.properties.updateProperty);
  const deleteProperty = useMutation(api.properties.deleteProperty);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<PropertySortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
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

  function handleSort(key: PropertySortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = (properties || [])
    .filter((p) =>
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || p.type === typeFilter) &&
      (!statusFilter || p.status === statusFilter)
    )
    .sort((a, b) => {
      let v1 = a[sortKey];
      let v2 = b[sortKey];
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

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
  }
  function selectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(p => String(p._id)));
  }
  async function handleBulkDelete() {
    if (selected.length === 0 || !user) return;
    confirm({
      title: "Delete Properties",
      description: `Delete ${selected.length} selected properties? This will also delete associated leases, utilities, and documents.`,
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        try {
          await Promise.all(selected.map(id => deleteProperty({ id: id as any, userId: user.id })));
          setSelected([]);
        } catch (err: any) {
          console.error("Bulk delete error:", err);
          const errorMessage = err.data?.message || err.message || "Unknown error";
          alert("Some properties could not be deleted: " + errorMessage);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  if (!user) return <div className="text-center text-muted-foreground">Sign in to manage properties.</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (isOpen) setError(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors duration-200">Add Property</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
            </DialogHeader>
            <PropertyForm
              onSubmit={async (data) => {
                try {
                  setLoading(true);
                  setError(null);
                  await addProperty({ ...data, userId: user.id });
                  setOpen(false);
                } catch (err: any) {
                  setError(err.data?.message || err.message || "An error occurred");
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}
          </DialogContent>
        </Dialog>
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

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">View:</span>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div>
        </div>
      </div>
      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex gap-3 items-center">
            <span className="text-sm font-medium text-primary">{selected.length} selected</span>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={loading} size="sm">
              Delete Selected
            </Button>
            <Button variant="outline" onClick={() => setSelected([])} size="sm">
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="transition-all duration-300 ease-in-out">
        {viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
          {filtered.map((property) => (
            <div key={property._id} className="relative">
              {/* Selection Checkbox Overlay */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selected.includes(String(property._id))}
                  onChange={() => toggleSelect(String(property._id))}
                  aria-label="Select property"
                  className="w-5 h-5 rounded-md border-2 border-gray-400 dark:border-white/80 bg-white dark:bg-white/90 checked:bg-primary checked:border-primary shadow-lg backdrop-blur-sm transition-all duration-200 cursor-pointer hover:scale-110"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              <PropertyCard
                property={property}
                onEdit={setEdit}
                onDelete={(prop) => {
                  confirm({
                    title: "Delete Property",
                    description: "Delete this property? This will also delete associated leases, utilities, and documents.",
                    variant: "destructive",
                    onConfirm: async () => {
                      setLoading(true);
                      try {
                        await deleteProperty({ id: prop._id as any, userId: user.id });
                      } catch (err: any) {
                        console.error("Delete property error:", err);
                        const errorMessage = err.data?.message || err.message || "Unknown error";
                        alert("Failed to delete property: " + errorMessage);
                      } finally {
                        setLoading(false);
                      }
                    }
                  });
                }}
                className={cn(
                  "transition-all duration-200",
                  selected.includes(String(property._id)) && "ring-2 ring-primary ring-offset-2"
                )}
              />
            </div>
          ))}
          
          {(!filtered || filtered.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-4">
                {search || typeFilter || statusFilter ? 
                  "Try adjusting your filters" : 
                  "Add your first property to get started"
                }
              </p>
              <Button onClick={() => setOpen(true)}>Add Property</Button>
            </div>
          )}
          </div>
        ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl shadow-2xl bg-card border border-border transition-colors duration-300">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={selectAll}
                    aria-label="Select all"
                    className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("name")}>Name {sortKey==="name" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("type")}>Type {sortKey==="type" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("status")}>Status {sortKey==="status" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("address")}>Address {sortKey==="address" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("bedrooms")}>Bedrooms {sortKey==="bedrooms" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("bathrooms")}>Bathrooms {sortKey==="bathrooms" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("squareFeet")}>Sq Ft {sortKey==="squareFeet" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("monthlyRent")}>Rent {sortKey==="monthlyRent" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("purchaseDate")}>Purchase Date {sortKey==="purchaseDate" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => (
                <TableRow 
                  key={property._id} 
                  className={cn(
                    "group cursor-pointer transition-all duration-200",
                    selected.includes(String(property._id)) 
                      ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary" 
                      : "hover:bg-muted/50 border-l-4 border-l-transparent"
                  )}
                >
                  <TableCell 
                    className="w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(String(property._id))}
                      onChange={() => toggleSelect(String(property._id))}
                      aria-label="Select property"
                      className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell 
                    className="font-medium cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >
                    <span className="group-hover:text-primary transition-colors">
                      {property.name}
                    </span>
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.type}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  ><StatusBadge status={property.status} /></TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.address}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.bedrooms}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.bathrooms}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.squareFeet}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >${property.monthlyRent}</TableCell>
                  <TableCell 
                    className="cursor-pointer"
                    onClick={() => router.push(`/properties/${property._id}`)}
                  >{property.purchaseDate}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setEdit(property)}
                        className="h-8 px-2"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          confirm({
                            title: "Delete Property",
                            description: "Delete this property? This will also delete associated leases, utilities, and documents.",
                            variant: "destructive",
                            onConfirm: async () => {
                              setLoading(true);
                              try {
                                await deleteProperty({ id: property._id as any, userId: user.id });
                              } catch (err: any) {
                                console.error("Delete property error:", err);
                                const errorMessage = err.data?.message || err.message || "Unknown error";
                                alert("Failed to delete property: " + errorMessage);
                              } finally {
                                setLoading(false);
                              }
                            }
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filtered || filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No properties found</h3>
                      <p className="text-muted-foreground mb-4">
                        {search || typeFilter || statusFilter ? 
                          "Try adjusting your filters" : 
                          "Add your first property to get started"
                        }
                      </p>
                      <Button onClick={() => setOpen(true)}>Add Property</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>
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