"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Id } from "@/../convex/_generated/dataModel";

interface UnitFormProps {
  propertyId: Id<"properties">;
  initial?: {
    _id: Id<"units">;
    unitIdentifier: string;
    status: "available" | "occupied" | "maintenance";
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    notes?: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function UnitForm({ propertyId, initial, onSubmit, onCancel, loading }: UnitFormProps) {
  const [unitIdentifier, setUnitIdentifier] = useState(initial?.unitIdentifier || "");
  const [status, setStatus] = useState<"available" | "occupied" | "maintenance">(
    initial?.status || "available"
  );
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() || "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() || "");
  const [squareFeet, setSquareFeet] = useState(initial?.squareFeet?.toString() || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!unitIdentifier.trim()) {
      newErrors.unitIdentifier = "Unit identifier is required";
    }

    if (bedrooms && (isNaN(Number(bedrooms)) || Number(bedrooms) < 0)) {
      newErrors.bedrooms = "Bedrooms must be a positive number";
    }

    if (bathrooms && (isNaN(Number(bathrooms)) || Number(bathrooms) < 0)) {
      newErrors.bathrooms = "Bathrooms must be a positive number";
    }

    if (squareFeet && (isNaN(Number(squareFeet)) || Number(squareFeet) < 0)) {
      newErrors.squareFeet = "Square feet must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      propertyId,
      unitIdentifier: unitIdentifier.trim(),
      status,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      squareFeet: squareFeet ? Number(squareFeet) : undefined,
      notes: notes.trim() || undefined,
    };

    if (initial?._id) {
      await onSubmit({ ...data, id: initial._id });
    } else {
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="unitIdentifier">Unit Identifier *</Label>
        <Input
          id="unitIdentifier"
          value={unitIdentifier}
          onChange={(e) => setUnitIdentifier(e.target.value)}
          placeholder="e.g., Unit A, Apt 1, Suite 101"
          disabled={loading}
          className={errors.unitIdentifier ? "border-red-500" : ""}
        />
        {errors.unitIdentifier && (
          <p className="text-sm text-red-500 mt-1">{errors.unitIdentifier}</p>
        )}
      </div>

      <div>
        <Label>Status</Label>
        <RadioGroup value={status} onValueChange={(value: any) => setStatus(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="available" id="available" disabled={loading || (initial && initial.status === "occupied")} />
            <Label htmlFor="available" className="font-normal cursor-pointer">
              Available
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="occupied" id="occupied" disabled={loading || (initial && initial.status === "occupied")} />
            <Label htmlFor="occupied" className="font-normal cursor-pointer">
              Occupied {initial && initial.status === "occupied" && "(managed by lease)"}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="maintenance" id="maintenance" disabled={loading} />
            <Label htmlFor="maintenance" className="font-normal cursor-pointer">
              Under Maintenance
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            min="0"
            step="0.5"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder="e.g., 2"
            disabled={loading}
            className={errors.bedrooms ? "border-red-500" : ""}
          />
          {errors.bedrooms && (
            <p className="text-sm text-red-500 mt-1">{errors.bedrooms}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            type="number"
            min="0"
            step="0.5"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            placeholder="e.g., 1.5"
            disabled={loading}
            className={errors.bathrooms ? "border-red-500" : ""}
          />
          {errors.bathrooms && (
            <p className="text-sm text-red-500 mt-1">{errors.bathrooms}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="squareFeet">Square Feet</Label>
        <Input
          id="squareFeet"
          type="number"
          min="0"
          value={squareFeet}
          onChange={(e) => setSquareFeet(e.target.value)}
          placeholder="e.g., 850"
          disabled={loading}
          className={errors.squareFeet ? "border-red-500" : ""}
        />
        {errors.squareFeet && (
          <p className="text-sm text-red-500 mt-1">{errors.squareFeet}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information about this unit..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial ? "Update Unit" : "Add Unit"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}