"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaseForm } from "@/components/LeaseForm";
import { Card } from "@/components/ui/card";
import { LoadingContent } from "@/components/LoadingContent";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

export default function LeasesPage() {
  const { user } = useUser();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const leases = useQuery(api.leases.getLeases, user ? { userId: user.id } : "skip");
  const addLease = useMutation(api.leases.addLease);
  const updateLease = useMutation(api.leases.updateLease);
  const deleteLease = useMutation(api.leases.deleteLease);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtering
  const filtered = (leases || []).filter((l: any) => {
    if (search && !l.tenantName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterProperty && l.propertyId !== filterProperty) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
  }
  function selectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map(l => String(l._id)));
  }
  async function handleBulkDelete() {
    if (selected.length === 0 || !user) return;
    if (!confirm(`Delete ${selected.length} selected leases?`)) return;
    setLoading(true);
    await Promise.all(selected.map(id => deleteLease({ id: id as any, userId: user.id })));
    setLoading(false);
    setSelected([]);
  }

  // Handlers
  function handleAdd() {
    setEditLease(null);
    setModalOpen(true);
  }
  function handleEdit(lease: any) {
    setEditLease(lease);
    setModalOpen(true);
  }
  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("Delete this lease?")) return;
    setLoading(true);
    await deleteLease({ id, userId: user.id });
    setLoading(false);
  }
  async function handleSubmit(form: any) {
    if (!user) return;
    setLoading(true);
    if (editLease) {
      await updateLease({ ...form, id: editLease._id, userId: user.id });
    } else {
      await addLease({ ...form, userId: user.id });
    }
    setLoading(false);
    setModalOpen(false);
  }

  if (!user) return <div className="text-center text-zinc-200">Sign in to manage leases.</div>;
  if (!properties) return <div className="text-center text-zinc-200">Loading properties...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Leases</h1>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Add Lease</Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <Input
          placeholder="Search tenant name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
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
              <th className="p-2 text-left">Tenant</th>
              <th className="p-2 text-left">Property</th>
              <th className="p-2 text-left">Dates</th>
              <th className="p-2 text-left">Rent</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Contact</th>
              <th className="p-2 text-left">Document</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lease: any) => (
              <tr key={lease._id} className={selected.includes(String(lease._id)) ? "bg-zinc-800" : "border-b border-zinc-800 hover:bg-zinc-900"}>
                <td className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.includes(String(lease._id))}
                    onChange={() => toggleSelect(String(lease._id))}
                    aria-label="Select lease"
                  />
                </td>
                <td className="p-2 font-medium">{lease.tenantName}</td>
                <td className="p-2">{properties?.find((p: any) => p._id === lease.propertyId)?.name || "-"}</td>
                <td className="p-2">{lease.startDate} - {lease.endDate}</td>
                <td className="p-2">${lease.rent}</td>
                <td className="p-2">{lease.status === "active" ? <span className="text-green-400">Active</span> : <span className="text-zinc-400">Expired</span>}</td>
                <td className="p-2">
                  {lease.tenantEmail && <div className="truncate max-w-[120px]" title={lease.tenantEmail}>{lease.tenantEmail}</div>}
                  {lease.tenantPhone && <div className="truncate max-w-[120px]" title={lease.tenantPhone}>{lease.tenantPhone}</div>}
                </td>
                <td className="p-2">
                  {lease.leaseDocumentUrl ? (
                    <a href={lease.leaseDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View</a>
                  ) : (
                    <span className="text-zinc-500">-</span>
                  )}
                </td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(lease)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(lease._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-zinc-500">No leases found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogTitle>{editLease ? "Edit Lease" : "Add Lease"}</DialogTitle>
          <LeaseForm
            properties={properties || []}
            initial={editLease}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 