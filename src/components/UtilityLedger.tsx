"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id, Doc } from "@/../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Receipt, 
  Calculator, 
  Users, 
  DollarSign, 
  Percent,
  AlertCircle,
  CheckCircle,
  History,
  FileText,
  Building2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { formatErrorForToast } from "@/lib/error-handling";
import { format } from "date-fns";

interface UtilityLedgerProps {
  billId: Id<"utilityBills">;
  userId: string;
  /** Show compact view */
  compact?: boolean;
  /** Show edit controls */
  showEdit?: boolean;
}

interface ChargeBreakdown {
  leaseId: Id<"leases">;
  tenantName: string;
  unitIdentifier?: string;
  responsibilityPercentage: number;
  chargedAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

/**
 * Utility Ledger Component
 * 
 * Shows inspectable charge calculation steps, responsible leases,
 * adjustments, and allows marking bills as historical.
 */
export function UtilityLedger({
  billId,
  userId,
  compact = false,
  showEdit = true,
}: UtilityLedgerProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [updating, setUpdating] = useState(false);

  // Get bill details
  const bill = useQuery(
    api.utilityBills.getUtilityBill,
    billId ? { billId, userId } : "skip"
  );

  // Get charges for this bill
  const charges = useQuery(
    api.utilityBills.getChargesForBill,
    billId ? { billId, userId } : "skip"
  );

  // Get leases for context
  const leases = useQuery(
    api.leases.getLeasesByProperty,
    bill?.propertyId ? { propertyId: bill.propertyId, userId } : "skip"
  );

  // Get property for context
  const property = useQuery(
    api.properties.getProperty,
    bill?.propertyId ? { id: bill.propertyId, userId } : "skip"
  );

  // Mutations
  const updateBill = useMutation(api.utilityBills.updateUtilityBill);

  const handleToggleHistorical = async (isHistorical: boolean) => {
    if (!bill || !userId) return;

    setUpdating(true);
    try {
      await updateBill({
        id: billId,
        userId,
        noTenantCharges: isHistorical,
      });
      toast.success(
        isHistorical
          ? "Bill marked as historical - no tenant charges will be generated"
          : "Bill enabled for tenant charges"
      );
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    } finally {
      setUpdating(false);
    }
  };

  if (!bill) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading ledger information...
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHistorical = bill.noTenantCharges === true;
  const totalTenantPercentage = charges?.reduce(
    (sum, c) => sum + c.responsibilityPercentage,
    0
  ) || 0;
  const ownerPercentage = Math.max(0, 100 - totalTenantPercentage);
  const totalTenantCharges = charges?.reduce((sum, c) => sum + c.chargedAmount, 0) || 0;
  const ownerAmount = bill.totalAmount - totalTenantCharges;

  return (
    <Card>
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className={cn(compact && "text-base")}>
              Charge Ledger
            </CardTitle>
          </div>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {!compact && (
          <CardDescription>
            Inspectable calculation breakdown for this utility bill
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Bill Summary */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Bill Summary</span>
              </div>
              {isHistorical && (
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  Historical
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Property:</span>
                <p className="font-medium">{property?.name || "Unknown"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Utility Type:</span>
                <p className="font-medium">{bill.utilityType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Bill Month:</span>
                <p className="font-medium">
                  {format(new Date(bill.billMonth), "MMM yyyy")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="font-medium">${bill.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Historical Toggle */}
          {showEdit && (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="historical-toggle" className="text-sm font-medium">
                  Historical Bill
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isHistorical
                    ? "No tenant charges will be generated for this bill"
                    : "Tenant charges are calculated based on lease settings"}
                </p>
              </div>
              <Switch
                id="historical-toggle"
                checked={isHistorical}
                onCheckedChange={handleToggleHistorical}
                disabled={updating}
              />
            </div>
          )}

          {/* Calculation Steps */}
          {!isHistorical && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculation Steps
                </h4>

                {/* Step 1: Active Leases */}
                <div className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Step 1: Active Leases</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Found {leases?.filter((l) => l.status === "active").length || 0} active
                    lease(s) for this property
                  </p>
                </div>

                {/* Step 2: Responsibility Percentages */}
                <div className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      Step 2: Responsibility Percentages
                    </span>
                  </div>
                  <div className="ml-6 space-y-2">
                    {charges && charges.length > 0 ? (
                      charges.map((charge) => (
                        <div
                          key={charge.leaseId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {charge.tenantName}
                            {charge.unitIdentifier && ` (${charge.unitIdentifier})`}:
                          </span>
                          <span className="font-medium">
                            {charge.responsibilityPercentage}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No tenant responsibilities configured
                      </p>
                    )}
                    {ownerPercentage > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Owner:
                        </span>
                        <span className="font-medium">{ownerPercentage}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Charge Calculation */}
                <div className="rounded-lg border p-3 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Step 3: Charge Calculation</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    {charges && charges.length > 0 ? (
                      charges.map((charge) => (
                        <div
                          key={charge.leaseId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {charge.tenantName} ({charge.responsibilityPercentage}%):
                          </span>
                          <span className="font-medium">
                            ${bill.totalAmount.toFixed(2)} × {charge.responsibilityPercentage}% = ${charge.chargedAmount.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No tenant charges calculated
                      </p>
                    )}
                    {ownerAmount > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Owner ({ownerPercentage}%):
                        </span>
                        <span className="font-medium">
                          ${bill.totalAmount.toFixed(2)} - ${totalTenantCharges.toFixed(2)} = ${ownerAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Responsible Leases */}
              {charges && charges.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Responsible Leases
                  </h4>
                  <div className="space-y-2">
                    {charges.map((charge) => (
                      <div
                        key={charge.leaseId}
                        className="rounded-lg border p-3 bg-card"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{charge.tenantName}</p>
                            {charge.unitIdentifier && (
                              <p className="text-xs text-muted-foreground">
                                Unit: {charge.unitIdentifier}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {charge.responsibilityPercentage}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                          <div>
                            <span className="text-muted-foreground">Charged:</span>
                            <p className="font-medium">${charge.chargedAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Paid:</span>
                            <p className="font-medium text-success">
                              ${charge.paidAmount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remaining:</span>
                            <p
                              className={cn(
                                "font-medium",
                                charge.remainingAmount > 0
                                  ? "text-destructive"
                                  : "text-success"
                              )}
                            >
                              ${charge.remainingAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-lg border p-4 bg-primary/5">
                <h4 className="text-sm font-semibold mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Bill Amount:</span>
                    <span className="font-medium">${bill.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant Charges:</span>
                    <span className="font-medium">${totalTenantCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner Responsibility:</span>
                    <span className="font-medium">${ownerAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Total Allocated:</span>
                    <span>${bill.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Historical Bill Message */}
          {isHistorical && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Historical Bill</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This bill is marked as historical and does not generate tenant charges.
                It may represent a bill that was already settled or is for reference only.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

