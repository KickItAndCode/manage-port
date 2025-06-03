"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Home, 
  Plus, 
  Edit2, 
  Trash2, 
  Users,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface UnitListProps {
  propertyId: Id<"properties">;
  userId: string;
  onEditUnit?: (unit: any) => void;
  onAddUnit?: () => void;
}

export function UnitList({ propertyId, userId, onEditUnit, onAddUnit }: UnitListProps) {
  const units = useQuery(api.units.getUnitsByProperty, { propertyId, userId });
  const unitStats = useQuery(api.units.getUnitStats, { propertyId, userId });
  const deleteUnit = useMutation(api.units.deleteUnit);
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (unit: any) => {
    confirm({
      title: "Delete Unit",
      description: `Are you sure you want to delete ${unit.unitIdentifier}? This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        setDeletingId(unit._id);
        try {
          await deleteUnit({ id: unit._id, userId });
        } catch (error: any) {
          alert(error.message || "Failed to delete unit");
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "occupied":
        return <Users className="w-4 h-4" />;
      case "available":
        return <CheckCircle className="w-4 h-4" />;
      case "maintenance":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Home className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "available":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (!units) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {unitStats && unitStats.totalUnits > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{unitStats.totalUnits}</div>
            <div className="text-sm text-muted-foreground">Total Units</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{unitStats.occupiedUnits}</div>
            <div className="text-sm text-muted-foreground">Occupied</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{unitStats.availableUnits}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{unitStats.occupancyRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Occupancy Rate</div>
          </Card>
        </div>
      )}

      {/* Units List */}
      {units.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Units Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add units to manage multiple tenants in this property
          </p>
          {onAddUnit && (
            <Button onClick={onAddUnit} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add First Unit
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <Card 
              key={unit._id} 
              className={`p-4 hover:shadow-lg transition-shadow ${
                deletingId === unit._id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(unit.status)}
                  <h3 className="font-semibold text-lg">{unit.unitIdentifier}</h3>
                </div>
                <Badge className={getStatusColor(unit.status)}>
                  {unit.status}
                </Badge>
              </div>

              {/* Unit Details */}
              <div className="space-y-1 text-sm text-muted-foreground mb-4">
                {(unit.bedrooms || unit.bathrooms) && (
                  <div className="flex gap-4">
                    {unit.bedrooms && <span>{unit.bedrooms} BR</span>}
                    {unit.bathrooms && <span>{unit.bathrooms} BA</span>}
                  </div>
                )}
                {unit.squareFeet && (
                  <div>{unit.squareFeet.toLocaleString()} sq ft</div>
                )}
{/* TODO: Add lease information display */}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {onEditUnit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditUnit(unit)}
                    disabled={deletingId === unit._id}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(unit)}
                  disabled={deletingId === unit._id || unit.status === "occupied"}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Add Unit Card */}
          {onAddUnit && (
            <Card 
              className="p-4 border-2 border-dashed hover:border-primary hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-h-[200px]"
              onClick={onAddUnit}
            >
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Add Unit</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}