"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Percent } from "lucide-react";

interface UtilitySetting {
  utilityType: string;
  responsibilityPercentage: number;
  notes?: string;
}

interface LeaseUtilitySettingsFormProps {
  value?: UtilitySetting[];
  onChange: (utilities: UtilitySetting[]) => void;
  showForMultiUnit?: boolean;
}

const DEFAULT_UTILITIES = [
  "Electric",
  "Water", 
  "Gas",
  "Sewer",
  "Trash",
] as const;

export function LeaseUtilitySettingsForm({ 
  value = [], 
  onChange,
  showForMultiUnit = false 
}: LeaseUtilitySettingsFormProps) {
  // Initialize with defaults if no value provided
  const initialSettings = DEFAULT_UTILITIES.map(type => {
    const existing = value.find(v => v.utilityType === type);
    return existing || { utilityType: type, responsibilityPercentage: 0 };
  });

  const [settings, setSettings] = useState<UtilitySetting[]>(initialSettings);

  const handlePercentageChange = (index: number, percentage: string) => {
    const newPercentage = Math.max(0, Math.min(100, parseInt(percentage) || 0));
    const newSettings = [...settings];
    newSettings[index] = {
      ...newSettings[index],
      responsibilityPercentage: newPercentage,
    };
    setSettings(newSettings);
    onChange(newSettings.filter(s => s.responsibilityPercentage > 0));
  };


  const applyTemplate = (template: 'all' | 'basic' | 'none') => {
    let newSettings: UtilitySetting[];
    
    switch (template) {
      case 'all':
        newSettings = settings.map(s => ({
          ...s,
          responsibilityPercentage: showForMultiUnit ? 50 : 100,
        }));
        break;
      case 'basic':
        newSettings = settings.map(s => ({
          ...s,
          responsibilityPercentage: ['Electric', 'Water', 'Trash'].includes(s.utilityType) 
            ? (showForMultiUnit ? 50 : 100) 
            : 0,
        }));
        break;
      case 'none':
        newSettings = settings.map(s => ({
          ...s,
          responsibilityPercentage: 0,
        }));
        break;
      default:
        newSettings = settings;
    }
    
    setSettings(newSettings);
    onChange(newSettings.filter(s => s.responsibilityPercentage > 0));
  };

  if (!showForMultiUnit) {
    return null; // Don't show for single-family properties
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Utility Responsibilities</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('basic')}
          >
            Basic
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('all')}
          >
            All {showForMultiUnit ? '50%' : '100%'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('none')}
          >
            None
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {settings.map((setting, index) => (
          <div key={setting.utilityType} className="flex items-center gap-3">
            <Label className="w-24 text-sm">{setting.utilityType}</Label>
            <div className="relative flex-1">
              <Input
                type="number"
                min="0"
                max="100"
                value={setting.responsibilityPercentage}
                onChange={(e) => handlePercentageChange(index, e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Set the percentage of each utility this tenant is responsible for. 
        {showForMultiUnit && "Make sure all units total 100% for each utility."}
      </p>
    </div>
  );
}