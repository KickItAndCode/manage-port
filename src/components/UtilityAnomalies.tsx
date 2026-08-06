"use client";

import { memo } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface UtilityAnomaliesProps {
  userId: string;
  propertyId?: Id<"properties">;
  /** Show compact view */
  compact?: boolean;
  /** Maximum number of anomalies to show */
  maxItems?: number;
}

/**
 * Utility Anomalies Component
 *
 * Displays detected utility bill spikes and anomalies
 */
export const UtilityAnomalies = memo(function UtilityAnomalies({
  
  propertyId,
  compact = false,
  maxItems = 5
}: UtilityAnomaliesProps) {
  const router = useRouter();

  const { isAuthenticated } = useConvexAuth();
  const insights = useQuery(
    api.utilityInsights.getUtilityInsights,
    isAuthenticated ? { propertyId } : "skip"
  );

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground text-sm">
            Loading anomaly detection...
          </div>
        </CardContent>
      </Card>
    );
  }

  const anomalies = insights.anomalies.slice(0, maxItems);
  const hasAnomalies = anomalies.length > 0;
  // A green "all normal" on an account with no bills is a false reassurance.
  const billsAnalyzed = insights.billsAnalyzed ?? 0;
  const hasEnoughData = billsAnalyzed >= 3;

  if (!hasAnomalies) {
    return (
      <Card>
        <CardHeader className={cn(compact && "pb-3")}>
          <CardTitle
            className={cn("flex items-center gap-2", compact && "text-base")}
          >
            <AlertTriangle className="h-5 w-5 text-success" />
            Utility Anomalies
          </CardTitle>
          {!compact && (
            <CardDescription>
              {hasEnoughData
                ? "No unusual spikes detected in utility bills"
                : "Not enough history to detect anomalies yet"}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            {hasEnoughData ? (
              <>
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-50" />
                <p>All utility bills are within normal ranges</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>
                  {billsAnalyzed === 0
                    ? "No utility bills recorded yet."
                    : `Only ${billsAnalyzed} bill${billsAnalyzed === 1 ? "" : "s"} recorded.`}{" "}
                  Spike detection compares each bill against the same utility in
                  earlier months, so it needs a few months of history before it
                  can say anything.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle
              className={cn("flex items-center gap-2", compact && "text-base")}
            >
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Utility Anomalies
            </CardTitle>
            {!compact && (
              <CardDescription>
                {insights.anomalyCount} spike
                {insights.anomalyCount !== 1 ? "s" : ""} detected
                {insights.highSeverityAnomalies > 0 && (
                  <span className="text-destructive ml-1">
                    ({insights.highSeverityAnomalies} high severity)
                  </span>
                )}
              </CardDescription>
            )}
          </div>
          {compact && (
            <Badge variant="destructive" className="text-xs">
              {insights.anomalyCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((anomaly) => {
          const severityColors = {
            high: "border-destructive bg-destructive/5",
            medium: "border-orange-500 bg-orange-50 dark:bg-orange-950/20",
            low: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
          };

          const severityBadges = {
            high: "destructive",
            medium: "default",
            low: "secondary"
          };

          return (
            <Alert
              key={anomaly.billId}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                severityColors[anomaly.severity]
              )}
              onClick={() =>
                router.push(`/utility-bills?billId=${anomaly.billId}`)
              }
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  anomaly.severity === "high" && "text-destructive",
                  anomaly.severity === "medium" && "text-orange-600",
                  anomaly.severity === "low" && "text-yellow-600"
                )}
              />
              <AlertDescription className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {anomaly.propertyName}
                    </span>
                    <Badge
                      variant={severityBadges[anomaly.severity] as any}
                      className="text-xs"
                    >
                      {anomaly.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(anomaly.billMonth), "MMM yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {anomaly.utilityType}: ${anomaly.amount.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      anomaly.severity === "high" && "text-destructive",
                      anomaly.severity === "medium" && "text-orange-600",
                      anomaly.severity === "low" && "text-yellow-600"
                    )}
                  >
                    +{anomaly.percentageIncrease}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Previous 3-month average: $
                  {anomaly.previousAverage.toFixed(2)}
                </div>
              </AlertDescription>
            </Alert>
          );
        })}

        {insights.anomalyCount > maxItems && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push("/utility-bills?view=anomalies")}
          >
            View All {insights.anomalyCount} Anomalies
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
