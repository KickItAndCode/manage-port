"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { PropertyForm } from "@/components/PropertyForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PropertiesPage() {
  const { user } = useUser();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const addProperty = useMutation(api.properties.addProperty);
  const updateProperty = useMutation(api.properties.updateProperty);
  const deleteProperty = useMutation(api.properties.deleteProperty);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return <div className="text-center text-zinc-200">Sign in to manage properties.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Properties</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">Add Property</Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
            </DialogHeader>
            <PropertyForm
              onSubmit={async (data) => {
                setLoading(true);
                await addProperty({ ...data, userId: user.id });
                setLoading(false);
                setOpen(false);
              }}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto rounded-xl shadow-lg bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-zinc-300">Name</TableHead>
              <TableHead className="text-zinc-300">Address</TableHead>
              <TableHead className="text-zinc-300">Rent</TableHead>
              <TableHead className="text-zinc-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties?.map((property) => (
              <TableRow key={property._id}>
                <TableCell>{property.name}</TableCell>
                <TableCell>{property.address}</TableCell>
                <TableCell>${property.rent}</TableCell>
                <TableCell>
                  <Dialog open={edit?._id === property._id} onOpenChange={(v) => !v && setEdit(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-200"
                        onClick={() => setEdit(property)}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle>Edit Property</DialogTitle>
                      </DialogHeader>
                      <PropertyForm
                        initial={property}
                        onSubmit={async (data) => {
                          setLoading(true);
                          await updateProperty({ ...data, id: property._id, userId: user.id });
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
                      if (confirm("Delete this property?")) {
                        setLoading(true);
                        await deleteProperty({ id: property._id, userId: user.id });
                        setLoading(false);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!properties || properties.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-500">
                  No properties found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 