"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle,
  Receipt,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface UtilityRemindersProps {
  userId: string;
  propertyId?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Maximum number of reminders to show */
  maxItems?: number;
}

/**
 * Utility Reminders Component
 * 
 * Displays overdue bills and missing utility readings
 */
export function UtilityReminders({
  userId,
  propertyId,
  compact = false,
  maxItems = 5,
}: UtilityRemindersProps) {
  const router = useRouter();

  const reminders = useQuery(
    api.utilityInsights.getUtilityReminders,
    userId ? { userId, propertyId: propertyId as any } : "skip"
  );

  if (!reminders) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground text-sm">
            Loading reminders...
          </div>
        </CardContent>
      </Card>
    );
  }

  const { overdueBills, missingReadings, totalReminders } = reminders;
  const hasReminders = totalReminders > 0;

  if (!hasReminders) {
    return (
      <Card>
        <CardHeader className={cn(compact && "pb-3")}>
          <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
            <Clock className="h-5 w-5 text-success" />
            Utility Reminders
          </CardTitle>
          {!compact && (
            <CardDescription>
              No overdue bills or missing readings
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-50" />
            <p>All bills are up to date</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayOverdue = overdueBills.slice(0, Math.ceil(maxItems / 2));
  const displayMissing = missingReadings.slice(0, Math.floor(maxItems / 2));
  const remainingCount = totalReminders - displayOverdue.length - displayMissing.length;

  return (
    <Card>
      <CardHeader className={cn(compact && "pb-3")}>
        <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
          <AlertCircle className="h-5 w-5 text-destructive" />
          Utility Reminders
          {totalReminders > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalReminders}
            </Badge>
          )}
        </CardTitle>
        {!compact && (
          <CardDescription>
            {overdueBills.length > 0 && `${overdueBills.length} overdue bill${overdueBills.length !== 1 ? 's' : ''}`}
            {overdueBills.length > 0 && missingReadings.length > 0 && " • "}
            {missingReadings.length > 0 && `${missingReadings.length} missing reading${missingReadings.length !== 1 ? 's' : ''}`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Bills */}
        {displayOverdue.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-destructive" />
              Overdue Bills
            </h4>
            {displayOverdue.map((bill) => {
              const severity =
                bill.daysOverdue >= 30
                  ? "high"
                  : bill.daysOverdue >= 14
                  ? "medium"
                  : "low";

              const severityColors = {
                high: "border-destructive bg-destructive/5",
                medium: "border-orange-500 bg-orange-500/5",
                low: "border-yellow-500 bg-yellow-500/5",
              };

              const severityBadges = {
                high: "destructive",
                medium: "secondary",
                low: "outline",
              };

              return (
                <Alert
                  key={bill.billId}
                  className={cn("cursor-pointer hover:opacity-80 transition-opacity", severityColors[severity])}
                  onClick={() => router.push(`/utility-bills?billId=${bill.billId}`)}
                >
                  <AlertCircle className={cn(
                    "h-4 w-4",
                    severity === "high" && "text-destructive",
                    severity === "medium" && "text-orange-600",
                    severity === "low" && "text-yellow-600"
                  )} />
                  <AlertTitle className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{bill.propertyName}</span>
                        <Badge variant={severityBadges[severity] as any} className="text-xs">
                          {bill.daysOverdue}d overdue
                        </Badge>
                      </div>
                    </div>
                  </AlertTitle>
                  <AlertDescription className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {bill.utilityType}: ${bill.amount.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        Due {format(new Date(bill.dueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bill.billMonth}
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}

        {/* Missing Readings */}
        {displayMissing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Missing Readings
            </h4>
            {displayMissing.map((reading, index) => (
              <Alert
                key={`${reading.propertyId}-${reading.utilityType}-${reading.expectedMonth}`}
                className="cursor-pointer hover:opacity-80 transition-opacity border-orange-500 bg-orange-500/5"
                onClick={() => router.push(`/utility-bills?propertyId=${reading.propertyId}&month=${reading.expectedMonth}`)}
              >
                <FileText className="h-4 w-4 text-orange-600" />
                <AlertTitle className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{reading.propertyName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {reading.daysSinceLastBill}d since last
                      </Badge>
                    </div>
                  </div>
                </AlertTitle>
                <AlertDescription className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {reading.utilityType} - {format(new Date(reading.expectedMonth + "-01"), "MMM yyyy")}
                    </span>
                  </div>
                  {reading.lastBillMonth && (
                    <div className="text-xs text-muted-foreground">
                      Last bill: {format(new Date(reading.lastBillMonth + "-01"), "MMM yyyy")}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {remainingCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.push("/utility-bills")}
          >
            View All {totalReminders} Reminders
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

