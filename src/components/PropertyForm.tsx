"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PropertyFormProps {
  initial?: { name: string; address: string; rent: number };
  onSubmit: (data: { name: string; address: string; rent: number }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function PropertyForm({ initial, onSubmit, onCancel, loading }: PropertyFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [rent, setRent] = useState(initial?.rent?.toString() || "");

  return (
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-md"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ name, address, rent: Number(rent) });
      }}
    >
      <div>
        <label className="block text-zinc-200 mb-1">Name</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Address</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          value={address}
          onChange={e => setAddress(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Rent</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="number"
          value={rent}
          onChange={e => setRent(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2 justify-end mt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
} 