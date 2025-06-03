"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Copy } from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";

interface BulkUnit {
  id: string;
  unitIdentifier: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
}

interface BulkUnitCreatorProps {
  propertyId: Id<"properties">;
  onSubmit: (units: Omit<BulkUnit, "id">[]) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const TEMPLATES = {
  duplex: [
    { unitIdentifier: "Unit A", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit B", bedrooms: 2, bathrooms: 1 },
  ],
  triplex: [
    { unitIdentifier: "Unit A", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit B", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit C", bedrooms: 2, bathrooms: 1 },
  ],
  fourplex: [
    { unitIdentifier: "Unit 1", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit 2", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit 3", bedrooms: 2, bathrooms: 1 },
    { unitIdentifier: "Unit 4", bedrooms: 2, bathrooms: 1 },
  ],
  apartment: [
    { unitIdentifier: "Apt 101", bedrooms: 1, bathrooms: 1, squareFeet: 650 },
    { unitIdentifier: "Apt 102", bedrooms: 1, bathrooms: 1, squareFeet: 650 },
    { unitIdentifier: "Apt 201", bedrooms: 2, bathrooms: 1, squareFeet: 850 },
    { unitIdentifier: "Apt 202", bedrooms: 2, bathrooms: 1, squareFeet: 850 },
  ],
};

export function BulkUnitCreator({ propertyId, onSubmit, onCancel, loading }: BulkUnitCreatorProps) {
  const [units, setUnits] = useState<BulkUnit[]>([
    { id: "1", unitIdentifier: "", bedrooms: undefined, bathrooms: undefined, squareFeet: undefined }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTemplateSelect = (template: keyof typeof TEMPLATES) => {
    const templateUnits = TEMPLATES[template].map((unit, index) => ({
      ...unit,
      id: String(index + 1),
    }));
    setUnits(templateUnits);
    setErrors({});
  };

  const addUnit = () => {
    const newId = String(Math.max(...units.map(u => Number(u.id))) + 1);
    setUnits([...units, { 
      id: newId, 
      unitIdentifier: "", 
      bedrooms: undefined, 
      bathrooms: undefined, 
      squareFeet: undefined 
    }]);
  };

  const removeUnit = (id: string) => {
    if (units.length > 1) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  const duplicateUnit = (unit: BulkUnit) => {
    const newId = String(Math.max(...units.map(u => Number(u.id))) + 1);
    const newUnit = { ...unit, id: newId, unitIdentifier: unit.unitIdentifier + " (copy)" };
    setUnits([...units, newUnit]);
  };

  const updateUnit = (id: string, field: keyof BulkUnit, value: any) => {
    setUnits(units.map(u => 
      u.id === id 
        ? { ...u, [field]: field === "unitIdentifier" ? value : value ? Number(value) : undefined }
        : u
    ));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const identifiers = new Set<string>();

    units.forEach((unit, index) => {
      if (!unit.unitIdentifier.trim()) {
        newErrors[`unit_${unit.id}`] = `Unit ${index + 1} needs an identifier`;
      } else if (identifiers.has(unit.unitIdentifier.trim())) {
        newErrors[`unit_${unit.id}`] = `Duplicate identifier: ${unit.unitIdentifier}`;
      } else {
        identifiers.add(unit.unitIdentifier.trim());
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const unitsData = units.map(({ id, ...unit }) => ({
      unitIdentifier: unit.unitIdentifier.trim(),
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      squareFeet: unit.squareFeet,
    }));

    await onSubmit(unitsData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Templates */}
      <div>
        <Label className="mb-2 block">Quick Templates</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect("duplex")}
            disabled={loading}
          >
            Duplex (2 units)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect("triplex")}
            disabled={loading}
          >
            Triplex (3 units)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect("fourplex")}
            disabled={loading}
          >
            Fourplex (4 units)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect("apartment")}
            disabled={loading}
          >
            Apartment (4 units)
          </Button>
        </div>
      </div>

      {/* Units List */}
      <div className="space-y-3">
        {units.map((unit, index) => (
          <Card key={unit.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor={`unit_${unit.id}_identifier`}>
                    Unit {index + 1} Identifier *
                  </Label>
                  <Input
                    id={`unit_${unit.id}_identifier`}
                    value={unit.unitIdentifier}
                    onChange={(e) => updateUnit(unit.id, "unitIdentifier", e.target.value)}
                    placeholder="e.g., Unit A, Apt 101"
                    disabled={loading}
                    className={errors[`unit_${unit.id}`] ? "border-red-500" : ""}
                  />
                  {errors[`unit_${unit.id}`] && (
                    <p className="text-sm text-red-500 mt-1">{errors[`unit_${unit.id}`]}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`unit_${unit.id}_bedrooms`}>Bedrooms</Label>
                    <Input
                      id={`unit_${unit.id}_bedrooms`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={unit.bedrooms || ""}
                      onChange={(e) => updateUnit(unit.id, "bedrooms", e.target.value)}
                      placeholder="2"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`unit_${unit.id}_bathrooms`}>Bathrooms</Label>
                    <Input
                      id={`unit_${unit.id}_bathrooms`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={unit.bathrooms || ""}
                      onChange={(e) => updateUnit(unit.id, "bathrooms", e.target.value)}
                      placeholder="1"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`unit_${unit.id}_sqft`}>Sq Ft</Label>
                    <Input
                      id={`unit_${unit.id}_sqft`}
                      type="number"
                      min="0"
                      value={unit.squareFeet || ""}
                      onChange={(e) => updateUnit(unit.id, "squareFeet", e.target.value)}
                      placeholder="850"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateUnit(unit)}
                  disabled={loading}
                  title="Duplicate unit"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUnit(unit.id)}
                  disabled={loading || units.length === 1}
                  className="text-destructive hover:text-destructive"
                  title="Remove unit"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Unit Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addUnit}
        disabled={loading}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Unit
      </Button>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : `Create ${units.length} Unit${units.length > 1 ? "s" : ""}`}
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