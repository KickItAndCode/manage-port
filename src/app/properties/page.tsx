"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyCreationWizard, type PropertyWizardData } from "@/components/PropertyCreationWizard";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, ImageIcon, Wand2, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PropertySortKey = 'name' | 'type' | 'status' | 'address' | 'bedrooms' | 'bathrooms' | 'squareFeet' | 'purchaseDate';

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
  const [sortKey, setSortKey] = useState<PropertySortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
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
          const results = await Promise.all(selected.map(id => deleteProperty({ id: id as any, userId: user.id })));
          setSelected([]);
          
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
  }

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
        setupUtilities: data.setupUtilities,
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
      {/* Floating Bulk Actions Toolbar */}
      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
          <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {selected.length} propert{selected.length !== 1 ? 'ies' : 'y'} selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (selected.length === filtered.length) {
                        setSelected([]);
                      } else {
                        setSelected(filtered.map(p => String(p._id)));
                      }
                    }}
                    disabled={filtered.length === 0}
                  >
                    {selected.length === filtered.length ? 'Clear All' : `Select All (${filtered.length})`}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected([])}
                  >
                    Clear Selection
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Properties List */}
      <Card className="p-3 sm:p-6">
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filtered.map((property) => (
            <Card key={property._id} className="p-4 hover:shadow-md transition-shadow duration-200">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.includes(String(property._id))}
                    onChange={() => toggleSelect(String(property._id))}
                    aria-label="Select property"
                    className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 
                            className="font-semibold text-base cursor-pointer hover:text-primary transition-colors truncate"
                            onClick={() => router.push(`/properties/${property._id}`)}
                          >
                            {property.name}
                          </h3>
                          <Badge variant="outline" className="text-xs shrink-0">{property.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{property.address}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={property.status} variant="compact" />
                        </div>
                      </div>
                      
                      <div className="text-right sm:text-right">
                        <p className="font-bold text-lg text-green-600">
                          {property.monthlyRent > 0 
                            ? `$${property.monthlyRent.toLocaleString()}` 
                            : '$0'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">per month</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm py-3 bg-muted/30 rounded-lg px-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Bedrooms</p>
                        <p className="font-semibold">{property.bedrooms}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Bathrooms</p>
                        <p className="font-semibold">{property.bathrooms}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Sq Ft</p>
                        <p className="font-semibold">{property.squareFeet.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end pt-3 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-4 font-medium">
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/properties/${property._id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEdit(property)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Property
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
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
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Property
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
          
          {(!filtered || filtered.length === 0) && (
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
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
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
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("name")}>
                  Name {sortKey==="name" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}
                </TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("type")}>
                  Type {sortKey==="type" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}
                </TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("status")}>
                  Status {sortKey==="status" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}
                </TableHead>
                <TableHead className="text-muted-foreground">
                  Rent
                </TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("bedrooms")}>
                  Bed/Bath {sortKey==="bedrooms" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}
                </TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("squareFeet")}>
                  Sq Ft {sortKey==="squareFeet" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}
                </TableHead>
                <TableHead className="text-center w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((property) => (
                <TableRow 
                  key={property._id} 
                  className={cn(
                    "hover:bg-muted/50 transition-colors duration-200",
                    selected.includes(String(property._id)) 
                      ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary" 
                      : "border-l-4 border-l-transparent"
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
                  <TableCell>
                    <div>
                      <p 
                        className="font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => router.push(`/properties/${property._id}`)}
                      >
                        {property.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{property.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={property.status} />
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      {property.monthlyRent > 0 
                        ? `$${property.monthlyRent.toLocaleString()}` 
                        : '$0'
                      }
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{property.bedrooms} bed, {property.bathrooms} bath</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {property.squareFeet.toLocaleString()} ft²
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/properties/${property._id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEdit(property)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Property
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
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
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Property
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {(!filtered || filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No properties found</h3>
                      <p className="text-muted-foreground mb-4">
                        {search || typeFilter || statusFilter ? 
                          "Try adjusting your filters" : 
                          "Add your first property to get started"
                        }
                      </p>
                      <p className="text-muted-foreground">
                        Use the Property Wizard from the dashboard to add your first property.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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