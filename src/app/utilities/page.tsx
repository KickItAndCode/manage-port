"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { UtilityForm } from "@/components/UtilityForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown, Calendar, FileText } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { LoadingContent } from "@/components/LoadingContent";
import { Badge } from "@/components/ui/badge";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function UtilitiesPage() {
  const { user } = useUser();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const utilities = useQuery(api.utilities.getUtilities, user ? { userId: user.id } : "skip");
  const addUtility = useMutation(api.utilities.addUtility);
  const updateUtility = useMutation(api.utilities.updateUtility);
  const deleteUtility = useMutation(api.utilities.deleteUtility);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [sortKey, setSortKey] = useState<UtilitySortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  type UtilitySortKey = "name" | "provider" | "cost" | "propertyId" | "billingCycle" | "startDate";

  function handleSort(key: UtilitySortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
  }
  function selectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(u => String(u._id)));
  }
  async function handleBulkDelete() {
    if (selected.length === 0 || !user) return;
    confirm({
      title: "Delete Utilities",
      description: `Delete ${selected.length} selected utilities?`,
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        try {
          await Promise.all(selected.map(id => deleteUtility({ id: id as any, userId: user.id })));
          setSelected([]);
        } catch (err: any) {
          console.error("Bulk delete utilities error:", err);
          const errorMessage = err.data?.message || err.message || "Unknown error";
          alert("Some utilities could not be deleted: " + errorMessage);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  const filtered = (utilities || [])
    .filter((u) =>
      (!search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.provider.toLowerCase().includes(search.toLowerCase()) ||
        (properties?.find((p) => p._id === u.propertyId)?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
      ) &&
      (!propertyFilter || u.propertyId === propertyFilter)
    )
    .sort((a, b) => {
      const v1 = a[sortKey];
      const v2 = b[sortKey];
      if (sortKey === "propertyId") {
        const p1 = properties?.find((p) => p._id === v1)?.name || "";
        const p2 = properties?.find((p) => p._id === v2)?.name || "";
        return sortDir === "asc" ? p1.localeCompare(p2) : p2.localeCompare(p1);
      }
      if (typeof v1 === "string" && typeof v2 === "string") {
        return sortDir === "asc" ? v1.localeCompare(v2) : v2.localeCompare(v1);
      }
      if (typeof v1 === "number" && typeof v2 === "number") {
        return sortDir === "asc" ? v1 - v2 : v2 - v1;
      }
      return 0;
    });

  function formatDate(dateString?: string) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  if (!user) return <div className="text-center text-zinc-200">Sign in to manage utilities.</div>;
  if (!properties) return <div className="text-center text-zinc-200">Loading properties...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Utilities</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors duration-200">Add Utility</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Utility</DialogTitle>
            </DialogHeader>
            <UtilityForm
              properties={properties || []}
              onSubmit={async (data) => {
                setLoading(true);
                try {
                  await addUtility({ ...data, userId: user.id, propertyId: data.propertyId as any });
                  setOpen(false);
                } catch (err: any) {
                  console.error("Add utility error:", err);
                  const errorMessage = err.data?.message || err.message || "Unknown error";
                  alert("Failed to add utility: " + errorMessage);
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 items-start sm:items-end">
        <input
          type="text"
          placeholder="Search by utility, provider, or property..."
          className="w-full sm:w-64 bg-input text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full sm:w-auto bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={loading} className="transition-colors duration-200">
            Delete Selected
          </Button>
        </div>
      )}
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 mb-6">
        <LoadingContent loading={!utilities} skeletonRows={6} skeletonHeight={120}>
          {filtered.map((utility) => {
            const property = properties?.find((p) => p._id === utility.propertyId);
            return (
              <div key={utility._id} className={`p-4 rounded-lg border transition-colors duration-200 ${
                selected.includes(String(utility._id)) 
                  ? "bg-primary/10 dark:bg-primary/15 border-primary" 
                  : "bg-card border-border hover:bg-muted/50"
              }`}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(String(utility._id))}
                        onChange={() => toggleSelect(String(utility._id))}
                        aria-label="Select utility"
                        className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary"
                      />
                      <div>
                        <h3 className="font-medium">{utility.name}</h3>
                        <p className="text-sm text-muted-foreground">{property?.name || "Unknown Property"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${utility.cost}</p>
                      {utility.billingCycle && (
                        <Badge variant="outline" className="text-xs bg-muted/50 dark:bg-muted/20 border-border text-foreground mt-1">
                          {utility.billingCycle}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-medium">{utility.provider}</p>
                    </div>
                    {utility.startDate && (
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium">{formatDate(utility.startDate)}</p>
                      </div>
                    )}
                    {utility.endDate && (
                      <div>
                        <span className="text-muted-foreground">End:</span>
                        <p className="font-medium">{formatDate(utility.endDate)}</p>
                      </div>
                    )}
                  </div>
                  
                  {utility.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="text-foreground mt-1">{utility.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex gap-2">
                      {utility.endDate && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">Ends {formatDate(utility.endDate)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setEdit(utility)}
                        className="h-8 px-2"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          confirm({
                            title: "Delete Utility",
                            description: "Delete this utility?",
                            variant: "destructive",
                            onConfirm: async () => {
                              setLoading(true);
                              try {
                                await deleteUtility({ id: utility._id as any, userId: user.id });
                              } catch (err: any) {
                                console.error("Delete utility error:", err);
                                const errorMessage = err.data?.message || err.message || "Unknown error";
                                alert("Failed to delete utility: " + errorMessage);
                              }
                              setLoading(false);
                            }
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {(!filtered || filtered.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No utilities found.
            </div>
          )}
        </LoadingContent>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl shadow-2xl bg-card border border-border transition-colors duration-300">
        <LoadingContent loading={!utilities} skeletonRows={6} skeletonHeight={40}>
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
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("propertyId")}>Property {sortKey==="propertyId" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("name")}>Name {sortKey==="name" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("provider")}>Provider {sortKey==="provider" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("cost")}>Cost {sortKey==="cost" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("billingCycle")}>Billing {sortKey==="billingCycle" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={() => handleSort("startDate")}>Start Date {sortKey==="startDate" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
                <TableHead>Info</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((utility) => {
                const property = properties?.find((p) => p._id === utility.propertyId);
                return (
                  <TableRow key={utility._id} className={selected.includes(String(utility._id)) ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary" : "hover:bg-muted/50 transition-colors duration-200 border-l-4 border-l-transparent"}>
                    <TableCell className="w-8">
                      <input
                        type="checkbox"
                        checked={selected.includes(String(utility._id))}
                        onChange={() => toggleSelect(String(utility._id))}
                        aria-label="Select utility"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[120px] inline-block align-middle cursor-pointer">{property?.name || "Unknown"}</span>
                        </TooltipTrigger>
                        <TooltipContent>{property?.name || "Unknown"}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{utility.name}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[120px] inline-block align-middle cursor-pointer">{utility.provider}</span>
                        </TooltipTrigger>
                        <TooltipContent>{utility.provider}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>${utility.cost}</TableCell>
                    <TableCell>
                      {utility.billingCycle ? (
                        <Badge variant="outline" className="text-xs bg-muted/50 dark:bg-muted/20 border-border text-foreground">
                          {utility.billingCycle}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(utility.startDate)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {utility.endDate && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>End Date: {formatDate(utility.endDate)}</TooltipContent>
                          </Tooltip>
                        )}
                        {utility.notes && (
                          <Tooltip>
                            <TooltipTrigger>
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">{utility.notes}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setEdit(utility)}
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
                              title: "Delete Utility",
                              description: "Delete this utility?",
                              variant: "destructive",
                              onConfirm: async () => {
                                setLoading(true);
                                try {
                                  await deleteUtility({ id: utility._id as any, userId: user.id });
                                } catch (err: any) {
                                  console.error("Delete utility error:", err);
                                  const errorMessage = err.data?.message || err.message || "Unknown error";
                                  alert("Failed to delete utility: " + errorMessage);
                                }
                                setLoading(false);
                              }
                            });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filtered || filtered.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No utilities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </LoadingContent>
      </div>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Utility</DialogTitle>
          </DialogHeader>
          <UtilityForm
            properties={properties || []}
            initial={edit}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await updateUtility({ ...data, id: edit._id, userId: user.id, propertyId: data.propertyId as any });
                setEdit(null);
              } catch (err: any) {
                console.error("Update utility error:", err);
                const errorMessage = err.data?.message || err.message || "Unknown error";
                alert("Failed to update utility: " + errorMessage);
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => setEdit(null)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}