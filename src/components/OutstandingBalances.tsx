"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import type { CalculatedTenantCharge } from "@/../convex/utilityCharges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentRecordForm } from "@/components/PaymentRecordForm";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Receipt,
  CreditCard,
  FileText,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash,
  Calendar,
  Percent
} from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";

interface OutstandingBalancesProps {
  userId: string;
  propertyId?: Id<"properties">;
  tenantId?: Id<"leases">;
}

interface ChargeByUtility {
  utilityType: string;
  charges: CalculatedTenantCharge[];
  totalOwed: number;
  totalBillAmount: number;
}

interface TenantGroup {
  leaseId: Id<"leases">;
  tenantName: string;
  propertyName: string;
  unitIdentifier?: string;
  utilitiesByType: ChargeByUtility[];
  totalOwed: number;
  totalCharges: number;
}

export function OutstandingBalances({
  userId,
  propertyId,
  tenantId
}: OutstandingBalancesProps) {
  const [selectedTenant, setSelectedTenant] = useState<string>(tenantId || "all");
  const [selectedCharge, setSelectedCharge] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paidCharges, setPaidCharges] = useState<Set<string>>(new Set());

  // Get all active leases
  const leases = useQuery(api.leases.getActiveLeases, { userId });

  // Get outstanding charges using on-demand calculation
  const allCharges = useQuery(api.utilityCharges.calculateAllTenantCharges, {
    userId,
    propertyId,
  });

  // Filter charges based on selected tenant and only outstanding amounts
  const charges = allCharges?.filter(charge => {
    const isOutstanding = charge.remainingAmount > 0;
    const matchesTenant = selectedTenant === "all" || charge.leaseId === selectedTenant;
    return isOutstanding && matchesTenant;
  });

  // Get utility bills for context
  const utilityBills = useQuery(api.utilityBills.getUnpaidBills, { userId });

  const recordPayment = useMutation(api.utilityPayments.recordUtilityPayment);

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case "Electric": return Zap;
      case "Water": return Droplets;
      case "Gas": return Flame;
      case "Internet": case "Cable": return Wifi;
      case "Trash": return Trash;
      default: return Receipt;
    }
  };

  const getUtilityColor = (type: string) => {
    switch (type) {
      case "Electric": return "text-yellow-600";
      case "Water": return "text-blue-600";
      case "Gas": return "text-orange-600";
      case "Internet": case "Cable": return "text-purple-600";
      case "Trash": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  // Group charges by tenant and then by utility type
  const groupCharges = (): TenantGroup[] => {
    if (!charges) return [];

    const groups: Record<string, TenantGroup> = {};

    charges.forEach(charge => {
      // Skip charges that have been paid in full recently
      const chargeKey = `${charge.leaseId}-${charge.utilityBillId}`;
      if (paidCharges.has(chargeKey)) return;

      const key = charge.leaseId;
      if (!groups[key]) {
        groups[key] = {
          leaseId: charge.leaseId,
          tenantName: charge.tenantName || "Unknown Tenant",
          propertyName: charge.propertyName || "Unknown Property",
          unitIdentifier: charge.unitIdentifier,
          utilitiesByType: [],
          totalOwed: 0,
          totalCharges: 0
        };
      }

      // Find or create utility group
      let utilityGroup = groups[key].utilitiesByType.find(u => u.utilityType === charge.utilityType);
      if (!utilityGroup) {
        utilityGroup = {
          utilityType: charge.utilityType || "Unknown",
          charges: [],
          totalOwed: 0,
          totalBillAmount: 0
        };
        groups[key].utilitiesByType.push(utilityGroup);
      }

      // The remainingAmount is already calculated in the charge
      const remainingAmount = charge.remainingAmount;
      utilityGroup.charges.push(charge);
      utilityGroup.totalOwed += remainingAmount;
      utilityGroup.totalBillAmount += charge.totalBillAmount;
      
      groups[key].totalOwed += remainingAmount;
      groups[key].totalCharges++;
    });

    // Sort utilities by type within each group
    Object.values(groups).forEach(group => {
      group.utilitiesByType.sort((a, b) => a.utilityType.localeCompare(b.utilityType));
      // Sort charges within each utility by month
      group.utilitiesByType.forEach(utility => {
        utility.charges.sort((a, b) => a.billMonth.localeCompare(b.billMonth));
      });
    });

    return Object.values(groups).sort((a, b) => b.totalOwed - a.totalOwed);
  };

  const tenantGroups = groupCharges();
  const totalOutstanding = tenantGroups.reduce((sum, group) => sum + group.totalOwed, 0);

  const getAgeInDays = (billMonth: string): number => {
    // Calculate age based on bill month
    const billDate = new Date(billMonth + '-01');
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - billDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgeBadge = (days: number) => {
    if (days > 60) {
      return <Badge variant="destructive" className="text-xs">60+ days</Badge>;
    } else if (days > 30) {
      return <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">30+ days</Badge>;
    } else if (days > 15) {
      return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">15+ days</Badge>;
    }
    return null;
  };

  const handleRecordPayment = async (charge: any, tenantName: string) => {
    setSelectedCharge({ ...charge, tenantName });
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = (chargeId: string) => {
    setPaidCharges(prev => new Set(prev).add(chargeId));
    toast.success("Payment recorded successfully!");
  };

  if (!charges || !leases) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32" />
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tenant groups skeleton */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border rounded-lg">
              {/* Tenant Header skeleton */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>

              {/* Utilities skeleton */}
              <div className="p-4 space-y-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    
                    <div className="space-y-1 ml-6">
                      {Array.from({ length: 1 }).map((_, k) => (
                        <div key={k} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-3 w-3" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                              <div className="flex items-center gap-4">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-20" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right space-y-1">
                              <Skeleton className="h-5 w-16" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions skeleton */}
              <div className="p-4 pt-0">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            </div>
          ))}

          {/* Summary Stats skeleton */}
          <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayGroups = selectedTenant === "all" ? tenantGroups : tenantGroups.filter(g => g.leaseId === selectedTenant);

  if (displayGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Outstanding Balances
            </CardTitle>
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="tenant-select" className="sr-only">Select Tenant</Label>
                <select
                  id="tenant-select"
                  className="h-10 px-3 rounded-md border bg-background text-sm"
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                >
                  <option value="all">All Tenants</option>
                  {leases?.map((lease) => (
                    <option key={lease._id} value={lease._id}>
                      {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              {selectedTenant === "all" 
                ? "There are no outstanding utility charges."
                : "This tenant has no outstanding charges."}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Outstanding Balances
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <select
                className="h-10 px-3 rounded-md border bg-background text-sm w-full sm:w-auto"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
              >
                <option value="all">All Tenants</option>
                {leases?.map((lease) => (
                  <option key={lease._id} value={lease._id}>
                    {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                  </option>
                ))}
              </select>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayGroups.map((group) => (
            <div 
              key={group.leaseId} 
              className={cn(
                "border rounded-lg transition-all duration-300",
                paidCharges.size > 0 && "animate-in fade-in-0"
              )}
            >
              {/* Tenant Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.tenantName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.propertyName}
                        {group.unitIdentifier && ` - ${group.unitIdentifier}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${group.totalOwed.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.totalCharges} charge{group.totalCharges !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Utilities Grouped by Type */}
              <div className="p-4 space-y-4">
                {group.utilitiesByType.map((utility) => {
                  const Icon = getUtilityIcon(utility.utilityType);
                  const iconColor = getUtilityColor(utility.utilityType);
                  
                  return (
                    <div key={utility.utilityType} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("w-4 h-4", iconColor)} />
                        <h4 className="font-medium text-sm">{utility.utilityType}</h4>
                        <Badge variant="outline" className="text-xs">
                          ${utility.totalOwed.toFixed(2)} owed
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 ml-6">
                        {utility.charges.map((charge) => {
                          const remainingAmount = charge.remainingAmount;
                          const ageInDays = getAgeInDays(charge.billMonth);
                          const ageBadge = getAgeBadge(ageInDays);
                          const chargeKey = `${charge.leaseId}-${charge.utilityBillId}`;
                          
                          return (
                            <div
                              key={chargeKey}
                              className={cn(
                                "flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-300",
                                paidCharges.has(chargeKey) && "opacity-50 scale-95"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">{charge.billMonth}</span>
                                    {ageBadge}
                                  </div>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Percent className="w-3 h-3" />
                                      {charge.responsibilityPercentage}% of ${charge.totalBillAmount?.toFixed(2) || 'N/A'}
                                    </span>
                                    {charge.paidAmount > 0 && (
                                      <span className="text-xs text-green-600">
                                        Paid: ${charge.paidAmount.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
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
                                  onClick={() => handleRecordPayment(charge, group.tenantName)}
                                  disabled={paidCharges.has(chargeKey)}
                                  className="min-w-[60px]"
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Pay
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="p-4 pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info("Navigate to Bills & Payments > History tab to generate statements");
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    View Statement
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info("Reminder feature coming soon!");
                    }}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Send Reminder
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Summary Stats */}
          <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-lg font-semibold">{displayGroups.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Charges</p>
              <p className="text-lg font-semibold">
                {displayGroups.reduce((sum, g) => sum + g.totalCharges, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg per Tenant</p>
              <p className="text-lg font-semibold">
                ${displayGroups.length > 0 
                  ? (totalOutstanding / displayGroups.length).toFixed(2)
                  : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Oldest Charge</p>
              <p className="text-lg font-semibold">
                {charges.length > 0 
                  ? Math.max(...charges.map(c => getAgeInDays(c.billMonth))) 
                  : 0} days
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
                    leaseId: selectedCharge.leaseId,
                    utilityBillId: selectedCharge.utilityBillId,
                    tenantName: selectedCharge.tenantName,
                    ...data,
                    userId
                  });
                  const chargeKey = `${selectedCharge.leaseId}-${selectedCharge.utilityBillId}`;
                  handlePaymentSuccess(chargeKey);
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