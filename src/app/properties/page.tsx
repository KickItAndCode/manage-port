"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { PropertyForm } from "@/components/PropertyForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    if (!confirm(`Delete ${selected.length} selected properties? This will also delete associated leases, utilities, and documents.`)) return;
    setLoading(true);
    try {
      await Promise.all(selected.map(id => deleteProperty({ id: id as any, userId: user.id })));
      setSelected([]);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert("Some properties could not be deleted: " + (err.message || "Unknown error"));
    }
    setLoading(false);
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
          <DialogContent className="bg-card border border-border shadow-xl rounded-xl">
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
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          type="text"
          placeholder="Search by name, address, or type..."
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary w-64 transition-colors duration-200"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {propertyTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
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
            {selected.length > 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-primary-foreground" style={{ backgroundColor: '#00ddeb' }}>
                  <div className="mb-2 flex gap-2 items-center">
                    <span className="text-muted-foreground">{selected.length} selected</span>
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={loading} className="transition-colors duration-200">
                      Delete Selected
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((property) => (
              <TableRow 
                key={property._id} 
                className={cn(
                  "group cursor-pointer",
                  selected.includes(String(property._id)) ? "text-primary-foreground" : "hover:bg-muted/50 transition-colors duration-200"
                )} 
                style={selected.includes(String(property._id)) ? { backgroundColor: '#00ddeb' } : {}}
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
                    className="cursor-pointer"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEdit(property)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          if (confirm("Delete this property? This will also delete associated leases, utilities, and documents.")) {
                            setLoading(true);
                            try {
                              await deleteProperty({ id: property._id as any, userId: user.id });
                            } catch (err: any) {
                              console.error("Delete property error:", err);
                              alert("Failed to delete property: " + (err.message || "Unknown error"));
                            }
                            setLoading(false);
                          }
                        }}
                        variant="destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(!filtered || filtered.length === 0) && (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground">
                  No properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!edit} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEdit(null);
          setError(null);
        }
      }}>
        <DialogContent className="bg-card border border-border shadow-xl rounded-xl">
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
    </div>
  );
} 