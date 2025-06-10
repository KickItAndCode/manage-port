"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Home, DollarSign, Percent, XCircle, Info, AlertTriangle, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BillSplitPreviewProps {
  propertyId: Id<"properties">;
  utilityType: string;
  totalAmount: number;
  billId?: Id<"utilityBills">;
  userId: string;
  mode?: "preview" | "actual";
}

export function BillSplitPreview({ 
  propertyId, 
  utilityType, 
  totalAmount, 
  billId,
  userId,
  mode = "preview"
}: BillSplitPreviewProps) {
  // Get actual charges if bill ID is provided
  const billWithCharges = useQuery(
    api.utilityBills.getUtilityBillWithCharges,
    billId ? { billId, userId } : "skip"
  );

  // Get real-time split preview for form mode
  const splitPreview = useQuery(
    api.utilityBills.getBillSplitPreview,
    !billId && propertyId && utilityType && totalAmount > 0 ? {
      propertyId,
      utilityType,
      totalAmount,
      userId,
    } : "skip"
  );

  // Mutation for marking charges as paid
  const markChargePaid = useMutation(api.utilityPayments.markUtilityPaid);

  // Use actual charges if available, otherwise show preview
  const charges = billWithCharges?.charges || [];
  const hasActualCharges = billWithCharges && charges.length > 0;

  // Loading state
  if (!billWithCharges && !splitPreview) {
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

  // Show real-time preview mode
  if (splitPreview) {
    const { 
      charges: previewCharges, 
      ownerPortion, 
      totalTenantPercentage, 
      vacantUnits = [], 
      totalUnits = 0,
      isValid, 
      message 
    } = splitPreview;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Real-Time Bill Split</h3>
          <Badge 
            variant="outline" 
            className={cn(
              isValid 
                ? "text-green-600 border-green-600" 
                : "text-orange-600 border-orange-600"
            )}
          >
            {isValid ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-1" />
            )}
            {isValid ? "Ready to Save" : "Needs Attention"}
          </Badge>
        </div>

        {/* Status Alert */}
        <Alert className={cn(
          isValid ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
        )}>
          {isValid ? (
            <Info className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          )}
          <AlertDescription className={cn(
            isValid ? "text-green-700" : "text-orange-700"
          )}>
            {message}
          </AlertDescription>
        </Alert>

        {/* Vacant Units Information */}
        {vacantUnits.length > 0 && (
          <Card className="p-4 border-blue-200 bg-blue-50">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-800">
                  {vacantUnits.length} Vacant Unit{vacantUnits.length !== 1 ? 's' : ''}
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {vacantUnits.map((unit) => (
                  <div 
                    key={unit.unitId}
                    className="flex items-center gap-2 p-2 bg-white/60 rounded border border-blue-200"
                  >
                    <Building2 className="w-3 h-3 text-blue-500" />
                    <span className="text-sm text-blue-700">
                      Unit {unit.unitIdentifier}
                    </span>
                  </div>
                ))}
              </div>
              <Alert className="border-blue-200 bg-blue-50/50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  Vacant units have no utility charges. Their portion ({totalUnits > 0 ? ((vacantUnits.length / totalUnits) * 100).toFixed(1) : '0'}% of property) 
                  is automatically assigned to the owner.
                </AlertDescription>
              </Alert>
            </div>
          </Card>
        )}

        {/* Tenant Charges */}
        <div className="space-y-3">
          {previewCharges.map((charge) => (
            <Card 
              key={charge.leaseId} 
              className={cn(
                "p-4",
                !charge.hasUtilitySettings && "border-orange-200 bg-orange-50/50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{charge.tenantName}</span>
                    {charge.unit?.unitIdentifier && (
                      <Badge variant="secondary" className="text-xs">
                        Unit {charge.unit.unitIdentifier}
                      </Badge>
                    )}
                    {!charge.hasUtilitySettings && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        No Settings
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      <span>{charge.responsibilityPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{utilityType}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1 text-lg font-semibold",
                    charge.chargedAmount === 0 && "text-muted-foreground"
                  )}>
                    <DollarSign className="w-4 h-4" />
                    <span>{charge.chargedAmount.toFixed(2)}</span>
                  </div>
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
                  <span className="font-medium text-blue-600">
                    ${(totalAmount - ownerPortion).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Portion:</span>
                  <span className="font-medium text-green-600">${ownerPortion.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant %:</span>
                  <span className="font-medium">{totalTenantPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner %:</span>
                  <span className="font-medium">{(100 - totalTenantPercentage).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={cn(
                    "font-medium text-xs",
                    isValid ? "text-green-600" : "text-orange-600"
                  )}>
                    {isValid ? "Valid" : "Invalid"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback for edge cases
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Unable to Calculate Split</AlertTitle>
      <AlertDescription>
        Please ensure you have selected a property, utility type, and entered a valid amount.
      </AlertDescription>
    </Alert>
  );
}