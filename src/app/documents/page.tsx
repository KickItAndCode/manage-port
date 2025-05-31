"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingContent } from "@/components/LoadingContent";

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

  if (!user) return <div className="text-center text-zinc-200">Sign in to manage documents.</div>;
  if (!properties || !leases) return <div className="text-center text-zinc-200">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">Upload Document</Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <Input
          placeholder="Search by document name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
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
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
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
          <span className="text-zinc-300">{selected.length} selected</span>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
            Delete Selected
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl shadow-lg bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-zinc-800 text-zinc-200">
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={selectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Property</th>
              <th className="p-2 text-left">Lease</th>
              <th className="p-2 text-left">Uploaded</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc: any) => (
              <tr key={doc._id} className={selected.includes(String(doc._id)) ? "bg-zinc-800" : "border-b border-zinc-800 hover:bg-zinc-900"}>
                <td className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.includes(String(doc._id))}
                    onChange={() => toggleSelect(String(doc._id))}
                    aria-label="Select document"
                  />
                </td>
                <td className="p-2 font-medium">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    {doc.name}
                  </a>
                </td>
                <td className="p-2 capitalize">{doc.type}</td>
                <td className="p-2">{doc.propertyId ? (properties?.find((p: any) => p._id === doc.propertyId)?.name || "-") : "-"}</td>
                <td className="p-2">
                  {doc.leaseId ? (
                    leases?.find((l: any) => l._id === doc.leaseId)?.tenantName || "-"
                  ) : "-"}
                </td>
                <td className="p-2">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "-"}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(doc._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-zinc-500">No documents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogTitle>Upload Document</DialogTitle>
          {/* TODO: Implement document upload form */}
          <div className="text-zinc-400">Document upload coming soon.</div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 