"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Calendar, 
  Receipt, 
  CreditCard,
  Search,
  Download,
  CheckCircle,
  Clock,
  TrendingUp,
  Banknote,
  Building,
  Smartphone
} from "lucide-react";
import { Id } from "@/../convex/_generated/dataModel";
import { format } from "date-fns";

interface PaymentHistoryProps {
  userId: string;
  propertyId?: Id<"properties">;
  leaseId?: Id<"leases">;
}

interface PaymentRecord {
  _id: Id<"utilityPayments">;
  leaseId: Id<"leases">;
  utilityBillId: Id<"utilityBills">;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  // Additional joined data
  tenantName: string;
  propertyName: string;
  utilityType: string;
  billMonth: string;
  chargedAmount?: number;
}

export function PaymentHistory({
  userId,
  propertyId,
  leaseId
}: PaymentHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");

  // Get payment history
  const payments = useQuery(api.utilityPayments.getPaymentHistory, {
    userId,
    propertyId,
    leaseId,
  });

  // Get summary statistics
  const summary = useQuery(api.utilityPayments.getPaymentSummary, {
    userId,
    propertyId,
    leaseId,
  });

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash": return Banknote;
      case "check": return Building;
      case "credit_card":
      case "debit_card": return CreditCard;
      case "bank_transfer": return Building;
      case "online": return Smartphone;
      default: return DollarSign;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash": return "text-green-600";
      case "check": return "text-blue-600";
      case "credit_card":
      case "debit_card": return "text-purple-600";
      case "bank_transfer": return "text-orange-600";
      case "online": return "text-indigo-600";
      default: return "text-gray-600";
    }
  };

  const formatPaymentMethod = (method: string) => {
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter payments based on search and filters
  const filteredPayments = payments?.filter(payment => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!payment.tenantName.toLowerCase().includes(search) &&
          !payment.propertyName.toLowerCase().includes(search) &&
          !payment.utilityType.toLowerCase().includes(search) &&
          !(payment.referenceNumber?.toLowerCase().includes(search))) {
        return false;
      }
    }

    // Method filter
    if (filterMethod !== "all" && payment.paymentMethod !== filterMethod) {
      return false;
    }

    // Month filter
    if (filterMonth && !payment.paymentDate.startsWith(filterMonth)) {
      return false;
    }

    return true;
  }) || [];

  const groupPaymentsByDate = () => {
    const groups: Record<string, PaymentRecord[]> = {};
    
    filteredPayments.forEach(payment => {
      const date = payment.paymentDate;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(payment);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  };

  const groupedPayments = groupPaymentsByDate();

  if (!payments || !summary) {
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold">${summary.totalCollected.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.paymentCount} payments
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">${summary.thisMonthTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.thisMonthCount} payments
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Payment</p>
                <p className="text-2xl font-bold">
                  ${summary.averagePayment.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  per transaction
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Payment</p>
                <p className="text-lg font-bold">
                  {summary.lastPaymentDate ? 
                    format(new Date(summary.lastPaymentDate), 'MMM d') : 
                    'N/A'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.lastPaymentAmount ? 
                    `$${summary.lastPaymentAmount.toFixed(2)}` : 
                    'No payments'
                  }
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Payment History
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="w-full h-10 px-3 rounded-md border bg-background"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
            </select>
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              placeholder="Filter by month"
            />
          </div>

          {/* Payment List */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Found</h3>
              <p className="text-muted-foreground">
                {payments.length > 0 
                  ? "Try adjusting your filters"
                  : "No payment history available"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedPayments.map(([date, datePayments]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-3">
                    {datePayments.map((payment) => {
                      const Icon = getPaymentMethodIcon(payment.paymentMethod);
                      const iconColor = getPaymentMethodColor(payment.paymentMethod);

                      return (
                        <div
                          key={payment._id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg bg-background ${iconColor}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">{payment.tenantName}</div>
                              <div className="text-sm text-muted-foreground">
                                {payment.utilityType} - {payment.billMonth}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {payment.propertyName}
                                {payment.referenceNumber && (
                                  <span className="ml-2">
                                    • Ref: {payment.referenceNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">
                              ${payment.amountPaid.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatPaymentMethod(payment.paymentMethod)}
                            </div>
                            {payment.amountPaid === payment.chargedAmount && (
                              <Badge variant="outline" className="text-green-600 border-green-600 mt-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Full Payment
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Method Breakdown */}
          {payments.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <h3 className="text-sm font-medium mb-4">Payment Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(summary.byMethod).map(([method, data]) => {
                  const Icon = getPaymentMethodIcon(method);
                  const iconColor = getPaymentMethodColor(method);
                  const percentage = (data.total / summary.totalCollected * 100).toFixed(1);

                  return (
                    <div key={method} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {formatPaymentMethod(method)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${data.total.toFixed(2)} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}