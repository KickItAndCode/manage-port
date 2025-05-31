"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { UtilityForm } from "@/components/UtilityForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
                await addUtility({ ...data, userId: user.id });
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
              <TableHead className="text-zinc-300">Property</TableHead>
              <TableHead className="text-zinc-300">Name</TableHead>
              <TableHead className="text-zinc-300">Provider</TableHead>
              <TableHead className="text-zinc-300">Cost</TableHead>
              <TableHead className="text-zinc-300">Status</TableHead>
              <TableHead className="text-zinc-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {utilities?.map((utility) => {
              const property = properties?.find((p) => p._id === utility.propertyId);
              return (
                <TableRow key={utility._id}>
                  <TableCell>{property?.name || "Unknown"}</TableCell>
                  <TableCell>{utility.name}</TableCell>
                  <TableCell>{utility.provider}</TableCell>
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
                            await updateUtility({ ...data, id: utility._id, userId: user.id });
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
                          await deleteUtility({ id: utility._id, userId: user.id });
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
            {(!utilities || utilities.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500">
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