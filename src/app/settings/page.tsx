"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Monitor, 
  Sun, 
  Moon, 
  BarChart, 
  DollarSign, 
  Bell, 
  Eye, 
  EyeOff,
  Save,
  RotateCcw,
  Palette,
  Layout,
  Globe
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for settings
  const [localSettings, setLocalSettings] = useState<any>(null);

  // Convex hooks
  const userSettings = useQuery(api.userSettings.getUserSettings, 
    user ? { userId: user.id } : "skip"
  );
  const updateSettings = useMutation(api.userSettings.updateUserSettings);
  const updateDashboardComponents = useMutation(api.userSettings.updateDashboardComponents);
  const updateThemeMutation = useMutation(api.userSettings.updateTheme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userSettings && !localSettings) {
      setLocalSettings(userSettings);
    }
  }, [userSettings, localSettings]);

  if (!user || !mounted || !localSettings) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              <div className="h-40 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleComponentToggle = (componentKey: string, value: boolean) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      dashboardComponents: {
        ...prev.dashboardComponents,
        [componentKey]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    try {
      setTheme(newTheme);
      await updateThemeMutation({ userId: user.id, theme: newTheme });
      setLocalSettings((prev: any) => ({ ...prev, theme: newTheme }));
      toast.success("Theme updated successfully");
    } catch (error) {
      toast.error(formatErrorForToast(error));
    }
  };

  const handleSaveChanges = async () => {
    try {
      await updateDashboardComponents({
        userId: user.id,
        componentUpdates: localSettings.dashboardComponents,
      });
      setHasChanges(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(formatErrorForToast(error));
    }
  };

  const handleResetToDefaults = () => {
    const defaultComponents = {
      showMetrics: true,
      showCharts: true,
      showFinancialSummary: true,
      showOutstandingBalances: true,
      showUtilityAnalytics: true,
      showRecentProperties: true,
      showQuickActions: true,
    };
    
    setLocalSettings((prev: any) => ({
      ...prev,
      dashboardComponents: defaultComponents,
    }));
    setHasChanges(true);
  };

  const dashboardComponents = [
    {
      key: "showMetrics",
      label: "Statistics Cards",
      description: "Overview metrics like total properties, monthly revenue, and occupancy rate",
      icon: BarChart,
      category: "Analytics"
    },
    {
      key: "showCharts", 
      label: "Analytics Charts",
      description: "Revenue trends, property distribution, and other visualizations",
      icon: BarChart,
      category: "Analytics"
    },
    {
      key: "showFinancialSummary",
      label: "Financial Summary",
      description: "Detailed breakdown of income, expenses, and net profit",
      icon: DollarSign,
      category: "Financial"
    },
    {
      key: "showOutstandingBalances",
      label: "Outstanding Balances",
      description: "Overdue payments and pending transactions",
      icon: DollarSign,
      category: "Financial"
    },
    {
      key: "showUtilityAnalytics",
      label: "Utility Analytics",
      description: "Utility cost trends and consumption patterns",
      icon: BarChart,
      category: "Analytics"
    },
    {
      key: "showRecentProperties",
      label: "Recent Properties",
      description: "Latest properties added to your portfolio",
      icon: Layout,
      category: "Content"
    },
    {
      key: "showQuickActions",
      label: "Quick Actions",
      description: "Shortcuts to frequently used features",
      icon: Layout,
      category: "Navigation"
    },
  ];

  const groupedComponents = dashboardComponents.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, typeof dashboardComponents>);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize your dashboard and application preferences
            </p>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSaveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your preferred color scheme
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={localSettings.theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleThemeChange("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={localSettings.theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleThemeChange("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={localSettings.theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleThemeChange("system")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Dashboard Components
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose which components to display on your dashboard
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedComponents).map(([category, components]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h3>
                      <Separator className="flex-1" />
                    </div>
                    <div className="grid gap-3">
                      {components.map((component) => {
                        const Icon = component.icon;
                        const isVisible = localSettings.dashboardComponents[component.key];
                        
                        return (
                          <div
                            key={component.key}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label className="font-medium cursor-pointer">
                                    {component.label}
                                  </Label>
                                  {isVisible ? (
                                    <Badge variant="secondary" className="text-xs">
                                      <Eye className="h-3 w-3 mr-1" />
                                      Visible
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {component.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <button
                                onClick={() => handleComponentToggle(component.key, !isVisible)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                  isVisible ? 'bg-primary' : 'bg-muted-foreground/30'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isVisible ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* Future Settings Placeholder */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification preferences and alert settings will be available in a future update.
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Date format, currency, timezone, and language preferences will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Save Changes Footer */}
        {hasChanges && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6">
            <Card className="p-4 shadow-lg border-primary">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">You have unsaved changes</p>
                  <p className="text-xs text-muted-foreground">Don't forget to save your settings</p>
                </div>
                <Button onClick={handleSaveChanges} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}