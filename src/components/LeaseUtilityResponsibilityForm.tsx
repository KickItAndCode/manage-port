"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Droplets, 
  Flame, 
  Wifi, 
  Trash, 
  Home,
  Percent,
  AlertTriangle,
  CheckCircle,
  Copy,
  Save
} from "lucide-react";

interface LeaseUtilityResponsibilityFormProps {
  leaseId: Id<"leases">;
  propertyId: Id<"properties">;
  tenantName: string;
  userId: string;
  onSave?: () => void;
}

interface UtilitySetting {
  utilityType: string;
  responsibilityPercentage: number;
  notes?: string;
}

const DEFAULT_UTILITIES = [
  { type: "Electric", icon: Zap, color: "text-yellow-600" },
  { type: "Water", icon: Droplets, color: "text-blue-600" },
  { type: "Gas", icon: Flame, color: "text-orange-600" },
  { type: "Sewer", icon: Droplets, color: "text-green-600" },
  { type: "Trash", icon: Trash, color: "text-gray-600" },
  { type: "Internet", icon: Wifi, color: "text-purple-600" },
  { type: "Cable", icon: Wifi, color: "text-purple-600" },
] as const;

export function LeaseUtilityResponsibilityForm({
  leaseId,
  propertyId,
  tenantName,
  userId,
  onSave
}: LeaseUtilityResponsibilityFormProps) {
  // Get current settings for this lease
  const currentSettings = useQuery(api.leaseUtilitySettings.getLeaseUtilities, {
    leaseId,
    userId,
  });

  // Get all property leases for percentage validation
  const propertyLeases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get all utility settings for the property to show context
  const propertyUtilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, {
    propertyId,
    userId,
  });

  const [settings, setSettings] = useState<UtilitySetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setLeaseUtilities = useMutation(api.leaseUtilitySettings.setLeaseUtilities);

  // Initialize settings when data loads
  useEffect(() => {
    if (currentSettings) {
      // Create a complete set including utilities with 0% if not set
      const completeSettings = DEFAULT_UTILITIES.map(util => {
        const existing = currentSettings.find(s => s.utilityType === util.type);
        return {
          utilityType: util.type,
          responsibilityPercentage: existing?.responsibilityPercentage || 0,
          notes: existing?.notes || "",
        };
      });
      setSettings(completeSettings);
    }
  }, [currentSettings]);

  const getUtilityIcon = (type: string) => {
    const utility = DEFAULT_UTILITIES.find(u => u.type === type);
    return utility ? utility.icon : Home;
  };

  const getUtilityColor = (type: string) => {
    const utility = DEFAULT_UTILITIES.find(u => u.type === type);
    return utility ? utility.color : "text-gray-600";
  };

  const updatePercentage = (utilityType: string, percentage: string) => {
    const numPercentage = Math.max(0, Math.min(100, parseInt(percentage) || 0));
    setSettings(prev => prev.map(s => 
      s.utilityType === utilityType 
        ? { ...s, responsibilityPercentage: numPercentage }
        : s
    ));
  };

  const applyTemplate = (template: 'equal' | 'basic' | 'none') => {
    const activeLeases = propertyLeases?.filter(l => l.status === "active") || [];
    const tenantCount = activeLeases.length;
    
    let newSettings: UtilitySetting[];
    
    switch (template) {
      case 'equal':
        // Equal split among all tenants
        const equalPercentage = tenantCount > 0 ? Math.floor(100 / tenantCount) : 0;
        newSettings = settings.map(s => ({
          ...s,
          responsibilityPercentage: equalPercentage,
        }));
        break;
      case 'basic':
        // Common utilities only
        const basicPercentage = tenantCount > 0 ? Math.floor(100 / tenantCount) : 0;
        newSettings = settings.map(s => ({
          ...s,
          responsibilityPercentage: ['Electric', 'Water', 'Trash'].includes(s.utilityType) 
            ? basicPercentage 
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
  };

  const getPropertyUtilityTotal = (utilityType: string): number => {
    if (!propertyUtilitySettings) return 0;
    
    return propertyUtilitySettings
      .filter(s => s.utilityType === utilityType && s.leaseStatus === "active")
      .reduce((sum, s) => sum + s.responsibilityPercentage, 0);
  };

  const getUtilityStatus = (utilityType: string, currentPercentage: number): {
    status: 'complete' | 'over' | 'under';
    total: number;
    remaining: number;
  } => {
    const currentTotal = getPropertyUtilityTotal(utilityType);
    const thisLeaseExisting = currentSettings?.find(s => s.utilityType === utilityType)?.responsibilityPercentage || 0;
    const otherLeasesTotal = currentTotal - thisLeaseExisting;
    const newTotal = otherLeasesTotal + currentPercentage;
    
    return {
      status: newTotal === 100 ? 'complete' : newTotal > 100 ? 'over' : 'under',
      total: newTotal,
      remaining: Math.max(0, 100 - otherLeasesTotal),
    };
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Check for over-allocation
    settings.forEach(setting => {
      if (setting.responsibilityPercentage > 0) {
        const status = getUtilityStatus(setting.utilityType, setting.responsibilityPercentage);
        if (status.status === 'over') {
          newErrors[setting.utilityType] = `Total exceeds 100% (currently ${status.total}%)`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      // Only save utilities with percentage > 0
      const utilitiesToSave = settings.filter(s => s.responsibilityPercentage > 0);
      
      await setLeaseUtilities({
        leaseId,
        utilities: utilitiesToSave,
        userId,
      });
      
      onSave?.();
    } catch (error: any) {
      console.error("Failed to save utilities:", error);
      alert(error.message || "Failed to save utility settings");
    } finally {
      setLoading(false);
    }
  };

  if (!currentSettings || !propertyLeases || !propertyUtilitySettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Utility Responsibilities - {tenantName}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('basic')}
          >
            Basic Utilities
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('equal')}
          >
            Equal Split
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyTemplate('none')}
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Set the percentage of each utility bill this tenant is responsible for. 
            All percentages across tenants should total 100% for each utility.
          </AlertDescription>
        </Alert>

        {/* Utility Settings */}
        <div className="space-y-4">
          {settings.map((setting) => {
            const Icon = getUtilityIcon(setting.utilityType);
            const iconColor = getUtilityColor(setting.utilityType);
            const utilityStatus = getUtilityStatus(setting.utilityType, setting.responsibilityPercentage);
            const hasError = errors[setting.utilityType];

            return (
              <div
                key={setting.utilityType}
                className={`border rounded-lg p-4 ${
                  hasError ? 'border-red-200 bg-red-50' :
                  utilityStatus.status === 'complete' ? 'border-green-200 bg-green-50' :
                  setting.responsibilityPercentage > 0 ? 'border-orange-200 bg-orange-50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium">{setting.utilityType}</h3>
                      <p className="text-xs text-muted-foreground">
                        Property total: {utilityStatus.total}% • 
                        Available: {utilityStatus.remaining}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {utilityStatus.status === 'complete' ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    ) : utilityStatus.status === 'over' ? (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Over 100%
                      </Badge>
                    ) : utilityStatus.total > 0 ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        {utilityStatus.total}%
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <Progress 
                    value={utilityStatus.total} 
                    className={`h-2 ${
                      utilityStatus.status === 'over' ? 'bg-red-100' : 
                      utilityStatus.status === 'complete' ? 'bg-green-100' : 
                      'bg-orange-100'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className={
                      utilityStatus.status === 'over' ? 'text-red-600' :
                      utilityStatus.status === 'complete' ? 'text-green-600' : 'text-orange-600'
                    }>
                      {utilityStatus.total}% total across all tenants
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Percentage Input */}
                <div className="flex items-center gap-3">
                  <Label className="w-20 text-sm">This tenant:</Label>
                  <div className="relative flex-1 max-w-32">
                    <Input
                      type="number"
                      min="0"
                      max={utilityStatus.remaining + setting.responsibilityPercentage}
                      value={setting.responsibilityPercentage}
                      onChange={(e) => updatePercentage(setting.utilityType, e.target.value)}
                      className={`pr-8 ${hasError ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {utilityStatus.remaining > 0 && setting.responsibilityPercentage === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updatePercentage(setting.utilityType, utilityStatus.remaining.toString())}
                      disabled={loading}
                    >
                      Use Remaining ({utilityStatus.remaining}%)
                    </Button>
                  )}
                </div>

                {hasError && (
                  <p className="text-sm text-red-500 mt-1">{hasError}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">Summary</h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Assigned utilities:</span>
              <span className="ml-2 font-medium">
                {settings.filter(s => s.responsibilityPercentage > 0).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total monthly responsibility:</span>
              <span className="ml-2 font-medium">
                ~${settings.reduce((sum, s) => sum + (s.responsibilityPercentage * 1.5), 0).toFixed(0)} 
                <span className="text-muted-foreground text-xs ml-1">(estimated)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={loading || Object.keys(errors).length > 0}
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
      </CardContent>
    </Card>
  );
}