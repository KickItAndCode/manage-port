"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Home, DollarSign, Percent, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BillSplitPreviewProps {
  propertyId: Id<"properties">;
  utilityType: string;
  totalAmount: number;
  billId?: Id<"utilityBills">;
  userId: string;
}

export function BillSplitPreview({ 
  propertyId, 
  utilityType, 
  totalAmount, 
  billId,
  userId 
}: BillSplitPreviewProps) {
  // Get actual charges if bill ID is provided
  const billWithCharges = useQuery(
    api.utilityBills.getUtilityBillWithCharges,
    billId ? { billId, userId } : "skip"
  );

  // Get active leases for the property (fallback for preview)
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Mutation for marking charges as paid
  const markChargePaid = useMutation(api.utilityPayments.markUtilityPaid);

  const activeLeases = leases?.filter(l => l.status === "active") || [];

  // Use actual charges if available, otherwise show preview
  const charges = billWithCharges?.charges || [];
  const hasActualCharges = billWithCharges && charges.length > 0;

  if (!leases && !billWithCharges) {
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

  if (hasActualCharges) {
    // Show actual charges with payment controls
    const totalCharged = charges.reduce((sum: number, charge: any) => sum + charge.chargedAmount, 0);
    const allPaid = charges.every((charge: any) => charge.isPaid);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tenant Charges</h3>
          {allPaid ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              All Paid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              Outstanding
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {charges.map((charge: any) => (
            <Card key={charge._id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{charge.tenantName}</span>
                    {charge.unit?.unitIdentifier && (
                      <Badge variant="secondary" className="text-xs">
                        Unit {charge.unit.unitIdentifier}
                      </Badge>
                    )}
                    {charge.isPaid ? (
                      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Outstanding
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      <span>{charge.responsibilityPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Due: {charge.dueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <DollarSign className="w-4 h-4" />
                      <span>{charge.chargedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await markChargePaid({
                          chargeId: charge._id,
                          isPaid: !charge.isPaid,
                          userId,
                        });
                        toast.success(`Payment status updated to ${!charge.isPaid ? 'paid' : 'unpaid'}`);
                      } catch (error: any) {
                        toast.error("Failed to update payment status", {
                          description: error.message || "Please try again or contact support.",
                        });
                      }
                    }}
                  >
                    {charge.isPaid ? (
                      <>
                        <XCircle className="w-4 h-4 mr-1" />
                        Mark Unpaid
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Paid
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bill Breakdown Summary */}
        <Card className="p-4 bg-muted/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Bill Breakdown</p>
              <Badge variant="outline" className="text-xs">
                {utilityType}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Bill:</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant Charges:</span>
                  <span className="font-medium text-blue-600">${totalCharged.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Portion:</span>
                  <span className="font-medium text-green-600">${(totalAmount - totalCharged).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant %:</span>
                  <span className="font-medium">{((totalCharged / totalAmount) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner %:</span>
                  <span className="font-medium">{(((totalAmount - totalCharged) / totalAmount) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <span className="font-medium">
                    {charges.filter((c: any) => c.isPaid).length} of {charges.length} paid
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback: Show preview mode (original logic for when no actual charges exist)
  if (activeLeases.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Active Leases</AlertTitle>
        <AlertDescription>
          This property has no active leases. Add a lease before entering utility bills.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bill Split Preview</h3>
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          Preview Mode
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This is a preview. Actual charges will be created when you save the bill.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {activeLeases.map((lease) => {
          const percentage = Math.floor(100 / activeLeases.length);
          const amount = (totalAmount * percentage) / 100;
          
          return (
            <Card key={lease._id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{lease.tenantName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      <span>{percentage}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{utilityType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-lg font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>{amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Total Bill Amount</p>
            <p className="text-xs text-muted-foreground">
              Split between {activeLeases.length} tenant{activeLeases.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Preview calculation</p>
          </div>
        </div>
      </Card>
    </div>
  );
}