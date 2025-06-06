"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentRecordForm } from "@/components/PaymentRecordForm";
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Receipt,
  CreditCard,
  FileText
} from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";

interface OutstandingBalancesProps {
  userId: string;
  propertyId?: Id<"properties">;
  tenantId?: Id<"leases">;
}

interface ChargeGroup {
  leaseId: Id<"leases">;
  tenantName: string;
  propertyName: string;
  unitIdentifier?: string;
  totalOwed: number;
  charges: Array<{
    _id: Id<"tenantUtilityCharges">;
    utilityBillId: Id<"utilityBills">;
    utilityType: string;
    billMonth: string;
    chargedAmount: number;
    paidAmount: number;
    isPaid: boolean;
    dueDate?: string;
    createdAt: string;
  }>;
}

export function OutstandingBalances({
  userId,
  propertyId,
  tenantId
}: OutstandingBalancesProps) {
  const [selectedCharge, setSelectedCharge] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Get outstanding charges
  const charges = useQuery(api.tenantUtilityCharges.getOutstandingCharges, {
    userId,
    propertyId,
    leaseId: tenantId,
  });

  const recordPayment = useMutation(api.utilityPayments.recordUtilityPayment);

  // Group charges by tenant/lease
  const groupChargesByTenant = (): ChargeGroup[] => {
    if (!charges) return [];

    const groups: Record<string, ChargeGroup> = {};

    charges.forEach(charge => {
      const key = charge.leaseId;
      if (!groups[key]) {
        groups[key] = {
          leaseId: charge.leaseId,
          tenantName: charge.tenantName || "Unknown Tenant",
          propertyName: charge.propertyName || "Unknown Property",
          unitIdentifier: charge.unitIdentifier,
          totalOwed: 0,
          charges: []
        };
      }

      const remainingAmount = charge.chargedAmount - (charge.paidAmount || 0);
      groups[key].totalOwed += remainingAmount;
      groups[key].charges.push({
        ...charge,
        paidAmount: charge.paidAmount || 0,
      });
    });

    return Object.values(groups).sort((a, b) => b.totalOwed - a.totalOwed);
  };

  const chargeGroups = groupChargesByTenant();
  const totalOutstanding = chargeGroups.reduce((sum, group) => sum + group.totalOwed, 0);

  const getAgeInDays = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgeBadge = (days: number) => {
    if (days > 60) {
      return <Badge variant="destructive">60+ days</Badge>;
    } else if (days > 30) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">30+ days</Badge>;
    } else if (days > 15) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">15+ days</Badge>;
    }
    return null;
  };

  const handleRecordPayment = async (charge: any) => {
    setSelectedCharge(charge);
    setPaymentDialogOpen(true);
  };

  if (!charges) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (charges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Outstanding Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              There are no outstanding utility charges.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Outstanding Balances
            </CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {chargeGroups.map((group) => (
            <div key={group.leaseId} className="border rounded-lg p-4 space-y-3">
              {/* Tenant Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{group.tenantName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.propertyName}
                      {group.unitIdentifier && ` - ${group.unitIdentifier}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">${group.totalOwed.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.charges.length} charge{group.charges.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Charges List */}
              <div className="space-y-2">
                {group.charges.map((charge) => {
                  const remainingAmount = charge.chargedAmount - charge.paidAmount;
                  const ageInDays = getAgeInDays(charge.createdAt);
                  const ageBadge = getAgeBadge(ageInDays);

                  return (
                    <div
                      key={charge._id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{charge.utilityType}</span>
                            <span className="text-sm text-muted-foreground">
                              {charge.billMonth}
                            </span>
                            {ageBadge}
                          </div>
                          {charge.paidAmount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Paid: ${charge.paidAmount.toFixed(2)} of ${charge.chargedAmount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">${remainingAmount.toFixed(2)}</p>
                          {charge.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(charge.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(charge)}
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          Pay
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Generate statement for this tenant
                    toast.info("Statement generation coming soon!");
                  }}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Generate Statement
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Send reminder
                    toast.info("Reminder feature coming soon!");
                  }}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Send Reminder
                </Button>
              </div>
            </div>
          ))}

          {/* Summary Stats */}
          <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-lg font-semibold">{chargeGroups.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-lg font-semibold">{charges.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Oldest Charge</p>
              <p className="text-lg font-semibold">
                {Math.max(...charges.map(c => getAgeInDays(c.createdAt)))} days
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Balance</p>
              <p className="text-lg font-semibold">
                ${(totalOutstanding / chargeGroups.length).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) setSelectedCharge(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedCharge && (
            <PaymentRecordForm
              tenantName={selectedCharge.tenantName}
              chargedAmount={selectedCharge.chargedAmount}
              utilityType={selectedCharge.utilityType}
              billMonth={selectedCharge.billMonth}
              previouslyPaid={selectedCharge.paidAmount}
              onSubmit={async (data) => {
                try {
                  await recordPayment({
                    chargeId: selectedCharge._id,
                    ...data,
                    userId
                  });
                  setPaymentDialogOpen(false);
                  setSelectedCharge(null);
                } catch (error: any) {
                  throw error;
                }
              }}
              onCancel={() => {
                setPaymentDialogOpen(false);
                setSelectedCharge(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}