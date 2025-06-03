"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, Copy, Percent, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeaseUtilitySettingsProps {
  leaseId: Id<"leases">;
  propertyId: Id<"properties">;
  userId: string;
  onSuccess?: () => void;
}

const DEFAULT_UTILITY_TYPES = [
  "Electric",
  "Water",
  "Gas",
  "Sewer",
  "Trash",
  "Internet",
  "Cable",
] as const;

interface UtilitySetting {
  utilityType: string;
  responsibilityPercentage: number;
  notes?: string;
}

export function LeaseUtilitySettings({ 
  leaseId, 
  propertyId, 
  userId, 
  onSuccess 
}: LeaseUtilitySettingsProps) {
  const [settings, setSettings] = useState<UtilitySetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const existingSettings = useQuery(api.leaseUtilitySettings.getLeaseUtilities, {
    leaseId,
    userId,
  });

  // const validationResult = useQuery(
  //   api.leaseUtilitySettings.validatePropertyUtilityPercentages,
  //   settings.length > 0 && settings[0]?.utilityType
  //     ? { propertyId, utilityType: settings[0].utilityType, userId }
  //     : "skip"
  // );

  // Mutations
  const setLeaseUtilities = useMutation(api.leaseUtilitySettings.setLeaseUtilities);

  // Initialize settings from existing data
  useEffect(() => {
    if (existingSettings) {
      setSettings(
        existingSettings.map(s => ({
          utilityType: s.utilityType,
          responsibilityPercentage: s.responsibilityPercentage,
          notes: s.notes,
        }))
      );
    } else {
      // Initialize with default utilities at 0%
      setSettings(
        DEFAULT_UTILITY_TYPES.map(type => ({
          utilityType: type,
          responsibilityPercentage: 0,
          notes: undefined,
        }))
      );
    }
  }, [existingSettings]);

  const handlePercentageChange = (index: number, value: string) => {
    const percentage = Math.max(0, Math.min(100, parseInt(value) || 0));
    const newSettings = [...settings];
    newSettings[index].responsibilityPercentage = percentage;
    setSettings(newSettings);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const newSettings = [...settings];
    newSettings[index].notes = notes;
    setSettings(newSettings);
  };

  const addCustomUtility = () => {
    const customName = prompt("Enter custom utility name:");
    if (customName && !settings.find(s => s.utilityType === customName)) {
      setSettings([...settings, {
        utilityType: customName,
        responsibilityPercentage: 0,
        notes: undefined,
      }]);
    }
  };

  const removeUtility = (index: number) => {
    setSettings(settings.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Only submit utilities with percentage > 0
      const utilitiesToSave = settings.filter(s => s.responsibilityPercentage > 0);
      
      await setLeaseUtilities({
        leaseId,
        utilities: utilitiesToSave,
        userId,
      });

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to save utility settings");
    } finally {
      setLoading(false);
    }
  };

  const copyFromTemplate = () => {
    // Simple 50/50 split template
    const updatedSettings = settings.map(s => ({
      ...s,
      responsibilityPercentage: ["Electric", "Water", "Gas", "Sewer", "Trash"].includes(s.utilityType) ? 50 : 0,
    }));
    setSettings(updatedSettings);
  };

  const getTotalPercentage = (utilityType: string) => {
    const setting = settings.find(s => s.utilityType === utilityType);
    if (!setting || setting.responsibilityPercentage === 0) return 0;
    
    // This would need to query other active leases for the property
    // For now, we'll just show the current lease's percentage
    return setting.responsibilityPercentage;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Utility Responsibilities</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyFromTemplate}
            disabled={loading}
          >
            <Copy className="w-4 h-4 mr-2" />
            50/50 Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomUtility}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {settings.map((setting, index) => {
          const isDefault = DEFAULT_UTILITY_TYPES.includes(setting.utilityType as any);
          const total = getTotalPercentage(setting.utilityType);
          
          return (
            <Card key={setting.utilityType} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{setting.utilityType}</Label>
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUtility(index)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={setting.responsibilityPercentage}
                      onChange={(e) => handlePercentageChange(index, e.target.value)}
                      disabled={loading}
                      className="pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  {setting.responsibilityPercentage > 0 && total !== 100 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Total: {total}%
                    </Badge>
                  )}
                  
                  {setting.responsibilityPercentage > 0 && total === 100 && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ 100%
                    </Badge>
                  )}
                </div>

                {setting.responsibilityPercentage > 0 && (
                  <Input
                    placeholder="Notes (optional)"
                    value={setting.notes || ""}
                    onChange={(e) => handleNotesChange(index, e.target.value)}
                    disabled={loading}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Only utilities with percentages greater than 0% will be saved. 
          Make sure the total percentage across all active leases equals 100% for each utility type.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={loading || settings.filter(s => s.responsibilityPercentage > 0).length === 0}
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Utility Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}