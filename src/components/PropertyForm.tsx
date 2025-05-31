"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PropertyFormProps {
  initial?: {
    name: string;
    address: string;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    monthlyRent: number;
    purchaseDate: string;
    imageUrl?: string;
  };
  onSubmit: (data: {
    name: string;
    address: string;
    type: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    monthlyRent: number;
    purchaseDate: string;
    imageUrl?: string;
  }) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function PropertyForm({ initial, onSubmit, onCancel, loading }: PropertyFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [type, setType] = useState(initial?.type || "");
  const [status, setStatus] = useState(initial?.status || "Vacant");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() || "");
  const [squareFeet, setSquareFeet] = useState(initial?.squareFeet?.toString() || "");
  const [monthlyRent, setMonthlyRent] = useState(initial?.monthlyRent?.toString() || "");
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");

  // Property type options
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

  // Dummy data generator with randomization
  function fillWithDummyData() {
    const names = ["Sunset Villa", "Oakwood Apartments", "Riverside Cottage", "Downtown Loft", "Mountain View Townhouse", "Garden Terrace"];
    const addresses = [
      "1234 Oceanview Dr, Malibu, CA 90265",
      "5678 Maple St, Denver, CO 80220",
      "9101 Riverside Rd, Austin, TX 78701",
      "222 Main St, San Francisco, CA 94105",
      "789 Hilltop Ave, Seattle, WA 98101",
      "456 Garden Ln, Portland, OR 97209"
    ];
    const types = ["Single Family", "Apartment", "Condo", "Townhouse", "Multi-Family", "Duplex", "Other"];
    const statuses = ["Vacant", "Occupied", "Under Maintenance", "Other"];
    const images = [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80"
    ];
    function randomInt(min: number, max: number) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function randomDate(start: Date, end: Date) {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString().split("T")[0];
    }
    setName(names[randomInt(0, names.length - 1)]);
    setAddress(addresses[randomInt(0, addresses.length - 1)]);
    setType(types[randomInt(0, types.length - 1)]);
    setStatus(statuses[randomInt(0, statuses.length - 1)]);
    setBedrooms(randomInt(1, 6).toString());
    setBathrooms(randomInt(1, 4).toString());
    setSquareFeet(randomInt(600, 4000).toString());
    setMonthlyRent((randomInt(900, 7500) * 10).toString());
    setPurchaseDate(randomDate(new Date(2015, 0, 1), new Date()));
    setImageUrl(images[randomInt(0, images.length - 1)]);
  }

  return (
    <form
      className="space-y-4 bg-zinc-900 p-6 rounded-xl shadow-xl w-full max-w-xl"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          name,
          address,
          type,
          status,
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          squareFeet: Number(squareFeet),
          monthlyRent: Number(monthlyRent),
          purchaseDate,
          imageUrl: imageUrl || undefined,
        });
      }}
    >
      <Button
        type="button"
        variant="outline"
        className="mb-2"
        onClick={fillWithDummyData}
      >
        Fill with Dummy Data
      </Button>
      <div>
        <label className="block text-zinc-200 mb-1">Property Name</label>
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
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Property Type</label>
          <select
            className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
            value={type}
            onChange={e => setType(e.target.value)}
            required
          >
            <option value="">Select property type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Status</label>
          <select
            className="bg-zinc-800 text-zinc-100 border-zinc-700 rounded-lg w-full px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
            required
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Bedrooms</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            value={bedrooms}
            onChange={e => setBedrooms(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Bathrooms</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            value={bathrooms}
            onChange={e => setBathrooms(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Square Feet</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            value={squareFeet}
            onChange={e => setSquareFeet(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-zinc-200 mb-1">Monthly Rent ($)</label>
          <Input
            className="bg-zinc-800 text-zinc-100 border-zinc-700"
            type="number"
            min={0}
            value={monthlyRent}
            onChange={e => setMonthlyRent(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Purchase Date</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="date"
          value={purchaseDate}
          onChange={e => setPurchaseDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-zinc-200 mb-1">Property Image URL</label>
        <Input
          className="bg-zinc-800 text-zinc-100 border-zinc-700"
          type="url"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          placeholder="https://..."
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