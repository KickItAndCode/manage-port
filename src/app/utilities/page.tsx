"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { UtilityForm } from "@/components/UtilityForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<UtilitySortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string[]>([]);

  type UtilitySortKey = "name" | "provider" | "cost" | "status" | "propertyId";

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
    if (!confirm(`Delete ${selected.length} selected utilities?`)) return;
    setLoading(true);
    await Promise.all(selected.map(id => deleteUtility({ id: id as any, userId: user.id })));
    setLoading(false);
    setSelected([]);
  }

  const statusOptions = ["Active", "Inactive", "Pending", "Disconnected"];

  const filtered = (utilities || [])
    .filter((u) =>
      (!search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.provider.toLowerCase().includes(search.toLowerCase()) ||
        (properties?.find((p) => p._id === u.propertyId)?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
      ) &&
      (!propertyFilter || u.propertyId === propertyFilter) &&
      (!statusFilter || u.status === statusFilter)
    )
    .sort((a, b) => {
      let v1 = a[sortKey];
      let v2 = b[sortKey];
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

  if (!user) return <div className="text-center text-zinc-200">Sign in to manage utilities.</div>;
  if (!properties) return <div className="text-center text-zinc-200">Loading properties...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Utilities</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">Add Utility</Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Add Utility</DialogTitle>
            </DialogHeader>
            <UtilityForm
              properties={properties || []}
              onSubmit={async (data) => {
                setLoading(true);
                await addUtility({ ...data, userId: user.id, propertyId: data.propertyId as any });
                setLoading(false);
                setOpen(false);
              }}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          type="text"
          placeholder="Search by utility, provider, or property..."
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mb-2 flex gap-2 items-center">
          <span className="text-zinc-300">{selected.length} selected</span>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
            Delete Selected
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl shadow-lg bg-zinc-900">
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
              <TableHead className="text-zinc-300 cursor-pointer" onClick={() => handleSort("propertyId")}>Property {sortKey==="propertyId" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
              <TableHead className="text-zinc-300 cursor-pointer" onClick={() => handleSort("name")}>Name {sortKey==="name" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
              <TableHead className="text-zinc-300 cursor-pointer" onClick={() => handleSort("provider")}>Provider {sortKey==="provider" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
              <TableHead className="text-zinc-300 cursor-pointer" onClick={() => handleSort("cost")}>Cost {sortKey==="cost" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
              <TableHead className="text-zinc-300 cursor-pointer" onClick={() => handleSort("status")}>Status {sortKey==="status" && (sortDir==="asc" ? <ChevronUp className="inline w-4 h-4"/> : <ChevronDown className="inline w-4 h-4"/>)}</TableHead>
              <TableHead className="text-zinc-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((utility) => {
              const property = properties?.find((p) => p._id === utility.propertyId);
              return (
                <TableRow key={utility._id} className={selected.includes(String(utility._id)) ? "bg-zinc-800" : ""}>
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
                  <TableCell>{utility.status}</TableCell>
                  <TableCell>
                    <Dialog open={edit?._id === utility._id} onOpenChange={(v) => !v && setEdit(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-200"
                          onClick={() => setEdit(utility)}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800">
                        <DialogHeader>
                          <DialogTitle>Edit Utility</DialogTitle>
                        </DialogHeader>
                        <UtilityForm
                          properties={properties || []}
                          initial={utility}
                          onSubmit={async (data) => {
                            setLoading(true);
                            await updateUtility({ ...data, id: utility._id as any, userId: user.id, propertyId: data.propertyId as any });
                            setLoading(false);
                            setEdit(null);
                          }}
                          onCancel={() => setEdit(null)}
                          loading={loading}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      className="text-red-400 hover:text-red-200 ml-2"
                      onClick={async () => {
                        if (confirm("Delete this utility?")) {
                          setLoading(true);
                          await deleteUtility({ id: utility._id as any, userId: user.id });
                          setLoading(false);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!filtered || filtered.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-zinc-500">
                  No utilities found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 