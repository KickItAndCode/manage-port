"use client";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Home, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BillSplitPreviewProps {
  propertyId: Id<"properties">;
  utilityType: string;
  totalAmount: number;
  userId: string;
}

interface TenantSplit {
  leaseId: Id<"leases">;
  tenantName: string;
  unitIdentifier?: string;
  percentage: number;
  amount: number;
}

export function BillSplitPreview({ 
  propertyId, 
  utilityType, 
  totalAmount, 
  userId 
}: BillSplitPreviewProps) {
  // Get active leases for the property
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get utility settings for all active leases
  const activeLeases = leases?.filter(l => l.status === "active") || [];
  
  // Calculate splits
  const calculateSplits = (): {
    splits: TenantSplit[];
    totalPercentage: number;
    isValid: boolean;
    error?: string;
  } => {
    if (!leases || activeLeases.length === 0) {
      return {
        splits: [],
        totalPercentage: 0,
        isValid: false,
        error: "No active leases found",
      };
    }

    const splits: TenantSplit[] = [];
    let totalPercentage = 0;

    // This is a simplified version - in real implementation, 
    // we would query leaseUtilitySettings for each lease
    activeLeases.forEach((lease) => {
      // For demo purposes, assume equal split
      const percentage = Math.floor(100 / activeLeases.length);
      const amount = (totalAmount * percentage) / 100;
      
      splits.push({
        leaseId: lease._id,
        tenantName: lease.tenantName,
        unitIdentifier: lease.unitId ? `Unit ${lease.unitId}` : undefined,
        percentage,
        amount: Math.round(amount * 100) / 100,
      });
      
      totalPercentage += percentage;
    });

    // Adjust for rounding
    if (splits.length > 0 && totalPercentage < 100) {
      const diff = 100 - totalPercentage;
      splits[0].percentage += diff;
      splits[0].amount = Math.round((totalAmount * splits[0].percentage / 100) * 100) / 100;
      totalPercentage = 100;
    }

    return {
      splits,
      totalPercentage,
      isValid: totalPercentage === 100,
      error: totalPercentage !== 100 
        ? `Total percentage is ${totalPercentage}%, should be 100%`
        : undefined,
    };
  };

  const { splits, totalPercentage, isValid, error } = calculateSplits();

  if (!leases) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bill Split Preview</h3>
        {isValid ? (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            Valid Split
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            Invalid Split
          </Badge>
        )}
      </div>

      {activeLeases.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Leases</AlertTitle>
          <AlertDescription>
            This property has no active leases. Add a lease before entering utility bills.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {splits.map((split) => (
              <Card key={split.leaseId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{split.tenantName}</span>
                      {split.unitIdentifier && (
                        <Badge variant="secondary" className="text-xs">
                          {split.unitIdentifier}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        <span>{split.percentage}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{utilityType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <DollarSign className="w-4 h-4" />
                      <span>{split.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Bill Amount</p>
                <p className="text-xs text-muted-foreground">
                  Split between {splits.length} tenant{splits.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{totalPercentage}% allocated</p>
              </div>
            </div>
          </Card>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This preview uses simplified calculations. Actual splits will be based on 
              the utility responsibility percentages configured in each lease.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}