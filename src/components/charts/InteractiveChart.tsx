"use client";
import React, { useState, useCallback, memo } from "react";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveChartProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactElement;
  onDrillDown?: (data?: any) => void;
  onNavigate?: (path: string) => void;
  height?: number;
  className?: string;
  showNavigationHint?: boolean;
  drillDownPath?: string;
}

export const InteractiveChart = memo(function InteractiveChart({
  title,
  icon,
  children,
  onDrillDown,
  onNavigate,
  height = 300,
  className,
  showNavigationHint = false,
  drillDownPath,
}: InteractiveChartProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDrilling, setIsDrilling] = useState(false);

  const handleDrillDown = useCallback(
    async (data?: any) => {
      if (!onDrillDown) return;

      setIsDrilling(true);
      try {
        await onDrillDown(data);
      } finally {
        setIsDrilling(false);
      }
    },
    [onDrillDown]
  );

  const handleNavigate = useCallback(() => {
    if (drillDownPath && onNavigate) {
      onNavigate(drillDownPath);
    }
  }, [drillDownPath, onNavigate]);

  return (
    <Card
      className={cn(
        "relative transition-all duration-200",
        isHovered && onDrillDown && "shadow-md scale-[1.01]",
        isDrilling && "opacity-80",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>

          {/* Navigation hint */}
          {showNavigationHint && drillDownPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigate}
              className={cn(
                "text-xs opacity-60 hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View all
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Loading overlay */}
        {isDrilling && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading details...
            </div>
          </div>
        )}

        {/* Chart container with enhanced interactions */}
        <div
          className={cn(
            "transition-all duration-200",
            `h-[${height}px]`,
            onDrillDown && "cursor-pointer"
          )}
          role="img"
          aria-label={`${title} chart - ${onDrillDown ? "Click to explore details" : "Data visualization"}`}
          onClick={onDrillDown ? () => handleDrillDown() : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>

        {/* Interactive hint */}
        {onDrillDown && isHovered && (
          <div className="absolute bottom-4 right-4 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded opacity-90 pointer-events-none">
            Click to explore
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Hook for drill-down navigation
export function useChartDrillDown() {
  const [drillDownHistory, setDrillDownHistory] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("/dashboard");

  const navigateTo = useCallback(
    (path: string) => {
      setDrillDownHistory((prev) => [...prev, currentPath]);
      setCurrentPath(path);
      // Use Next.js router for actual navigation
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", path);
      }
    },
    [currentPath]
  );

  const navigateBack = useCallback(() => {
    if (drillDownHistory.length > 0) {
      const previousPath = drillDownHistory[drillDownHistory.length - 1];
      setDrillDownHistory((prev) => prev.slice(0, -1));
      setCurrentPath(previousPath);
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", previousPath);
      }
    }
  }, [drillDownHistory]);

  const canGoBack = drillDownHistory.length > 0;

  return {
    navigateTo,
    navigateBack,
    canGoBack,
    currentPath,
    drillDownHistory,
  };
}
