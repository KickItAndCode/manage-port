"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingContent } from "@/components/LoadingContent";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Table, TableHeader, TableBody, TableCell, TableRow } from "@/components/ui/table";

export default function DocumentsPage() {
  const { user } = useUser();
  const documents = useQuery(api.documents.getDocuments, user ? { userId: user.id } : "skip");
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const leases = useQuery(api.leases.getLeases, user ? { userId: user.id } : "skip");
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [leaseFilter, setLeaseFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = (documents || []).filter((d: any) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && d.type !== typeFilter) return false;
    if (propertyFilter && d.propertyId !== propertyFilter) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
  }
  function selectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(d => String(d._id)));
  }
  async function handleBulkDelete() {
    if (selected.length === 0 || !user) return;
    if (!confirm(`Delete ${selected.length} selected documents?`)) return;
    setLoading(true);
    await Promise.all(selected.map(id => deleteDocument({ id: id as any, userId: user.id })));
    setLoading(false);
    setSelected([]);
  }
  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this document?")) return;
    setLoading(true);
    await deleteDocument({ id, userId: user.id });
    setLoading(false);
  }

  if (!user) return <div className="text-center text-muted-foreground">Sign in to manage documents.</div>;
  if (!properties || !leases) return <div className="text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors duration-200">Upload Document</Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <Input
          placeholder="Search by document name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs bg-input text-foreground border border-border transition-colors duration-200"
        />
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="lease">Lease</option>
          <option value="utility">Utility</option>
          <option value="property">Property</option>
          <option value="other">Other</option>
        </select>
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>
      {selected.length > 0 && (
        <div className="mb-2 flex gap-2 items-center">
          <span className="text-muted-foreground">{selected.length} selected</span>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={loading} className="transition-colors duration-200">
            Delete Selected
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl shadow-2xl bg-card border border-border transition-colors duration-300">
        <LoadingContent loading={!documents} skeletonRows={6} skeletonHeight={40}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={selectAll}
                    aria-label="Select all"
                  />
                </TableCell>
                <TableCell className="p-2 text-left">Name</TableCell>
                <TableCell className="p-2 text-left">Type</TableCell>
                <TableCell className="p-2 text-left">Property</TableCell>
                <TableCell className="p-2 text-left">Lease</TableCell>
                <TableCell className="p-2 text-left">Uploaded</TableCell>
                <TableCell className="p-2 text-left">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => (
                <TableRow key={doc._id} className={selected.includes(String(doc._id)) ? "text-primary-foreground" : "hover:bg-muted/50 transition-colors duration-200"} style={selected.includes(String(doc._id)) ? { backgroundColor: '#00ddeb' } : {}}>
                  <TableCell className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.includes(String(doc._id))}
                      onChange={() => toggleSelect(String(doc._id))}
                      aria-label="Select document"
                    />
                  </TableCell>
                  <TableCell className="p-2 font-medium">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {doc.name}
                    </a>
                  </TableCell>
                  <TableCell className="p-2 capitalize">{doc.type}</TableCell>
                  <TableCell className="p-2">{doc.propertyId ? (properties?.find((p: any) => p._id === doc.propertyId)?.name || "-") : "-"}</TableCell>
                  <TableCell className="p-2">
                    {doc.leaseId ? (
                      leases?.find((l: any) => l._id === doc.leaseId)?.tenantName || "-"
                    ) : "-"}
                  </TableCell>
                  <TableCell className="p-2">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="p-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            if (confirm("Delete this document?")) {
                              setLoading(true);
                              await deleteDocument({ id: doc._id as any, userId: user.id });
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
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </LoadingContent>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border border-border shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          {/* TODO: Implement document upload form */}
          <div className="text-muted-foreground">Document upload coming soon.</div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 