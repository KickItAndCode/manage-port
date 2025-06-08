"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  Calendar,
  DollarSign,
  Receipt,
  User,
  Building2,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash
} from "lucide-react";

interface TenantStatementGeneratorProps {
  propertyId: Id<"properties">;
  userId: string;
}

interface StatementData {
  lease: any;
  property: any;
  bills: any[];
  payments: any[];
  utilitySettings: any[];
  totalCharges: number;
  totalPaid: number;
  outstandingBalance: number;
}

export function TenantStatementGenerator({ propertyId, userId }: TenantStatementGeneratorProps) {
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().slice(0, 7);
  });
  const [generating, setGenerating] = useState(false);

  // Get property data
  const property = useQuery(api.properties.getProperty, {
    id: propertyId,
    userId,
  });

  // Get leases for the property
  const leases = useQuery(api.leases.getLeasesByProperty, {
    propertyId,
    userId,
  });

  // Get bills for the selected period
  const bills = useQuery(
    api.utilityBills.getUtilityBillsByProperty,
    selectedLeaseId ? {
      propertyId,
      userId,
      startMonth: startDate,
      endMonth: endDate,
    } : "skip"
  );

  // Get payments for the selected lease
  const payments = useQuery(
    api.utilityPayments.getPaymentsByLease,
    selectedLeaseId ? {
      leaseId: selectedLeaseId as Id<"leases">,
      userId,
    } : "skip"
  );

  // Get utility settings
  const utilitySettings = useQuery(api.leaseUtilitySettings.getUtilitySettingsByProperty, {
    propertyId,
    userId,
  });

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

  const generateStatementData = (): StatementData | null => {
    if (!selectedLeaseId || !bills || !payments || !property || !leases || !utilitySettings) {
      return null;
    }

    const selectedLease = leases.find(l => l._id === selectedLeaseId);
    if (!selectedLease) return null;

    // Filter bills for the period and calculate tenant charges
    const periodBills = bills.filter(bill => {
      const billMonth = bill.billMonth;
      return billMonth >= startDate && billMonth <= endDate;
    });

    let totalCharges = 0;
    const billsWithCharges = periodBills.map(bill => {
      const setting = utilitySettings.find(
        s => s.leaseId === selectedLeaseId && s.utilityType === bill.utilityType
      );
      const tenantPercentage = setting?.responsibilityPercentage || 0;
      const tenantCharge = (bill.totalAmount * tenantPercentage) / 100;
      totalCharges += tenantCharge;

      return {
        ...bill,
        tenantPercentage,
        tenantCharge,
      };
    });

    // Filter payments for the period
    const periodPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const start = new Date(startDate + "-01");
      const end = new Date(endDate + "-28"); // Use 28th to be safe
      return paymentDate >= start && paymentDate <= end;
    });

    const totalPaid = periodPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const outstandingBalance = totalCharges - totalPaid;

    return {
      lease: selectedLease,
      property,
      bills: billsWithCharges,
      payments: periodPayments,
      utilitySettings,
      totalCharges,
      totalPaid,
      outstandingBalance,
    };
  };

  const generatePDF = async () => {
    const statementData = generateStatementData();
    if (!statementData) return;

    setGenerating(true);
    try {
      // Create a printable HTML version
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = generatePrintableHTML(statementData);
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      toast.success("Statement generated successfully!", {
        description: "PDF statement opened in new window for printing.",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF statement", {
        description: "Please try again or contact support if the issue persists.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePrintableHTML = (data: StatementData) => {
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tenant Statement - ${data.lease.tenantName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h3 { color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
          .amount { font-weight: bold; }
          .positive { color: #dc2626; }
          .negative { color: #16a34a; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tenant Utility Statement</h1>
          <p><strong>Property:</strong> ${data.property.name}</p>
          <p><strong>Address:</strong> ${data.property.address}</p>
          <p><strong>Statement Period:</strong> ${startDate} to ${endDate}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <h3>Tenant Information</h3>
          <p><strong>Name:</strong> ${data.lease.tenantName}</p>
          ${data.lease.tenantEmail ? `<p><strong>Email:</strong> ${data.lease.tenantEmail}</p>` : ''}
          ${data.lease.tenantPhone ? `<p><strong>Phone:</strong> ${data.lease.tenantPhone}</p>` : ''}
          ${data.lease.unit?.unitIdentifier ? `<p><strong>Unit:</strong> ${data.lease.unit.unitIdentifier}</p>` : ''}
        </div>

        <div class="section">
          <h3>Utility Charges</h3>
          <table>
            <thead>
              <tr>
                <th>Utility Type</th>
                <th>Bill Month</th>
                <th>Total Bill</th>
                <th>Your Share (%)</th>
                <th>Your Charge</th>
              </tr>
            </thead>
            <tbody>
              ${data.bills.map(bill => `
                <tr>
                  <td>${bill.utilityType}</td>
                  <td>${bill.billMonth}</td>
                  <td>${formatCurrency(bill.totalAmount)}</td>
                  <td>${bill.tenantPercentage}%</td>
                  <td class="amount">${formatCurrency(bill.tenantCharge)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Payments</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Utility Type</th>
                <th>Amount</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${data.payments.map(payment => `
                <tr>
                  <td>${formatDate(payment.paymentDate)}</td>
                  <td>${payment.utilityType}</td>
                  <td class="amount">${formatCurrency(payment.amountPaid)}</td>
                  <td>${payment.paymentMethod || 'Not specified'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="summary">
            <h3>Summary</h3>
            <table style="border: none;">
              <tr><td><strong>Total Charges:</strong></td><td class="amount">${formatCurrency(data.totalCharges)}</td></tr>
              <tr><td><strong>Total Paid:</strong></td><td class="amount">${formatCurrency(data.totalPaid)}</td></tr>
              <tr style="border-top: 2px solid #ccc;">
                <td><strong>Outstanding Balance:</strong></td>
                <td class="amount ${data.outstandingBalance > 0 ? 'positive' : 'negative'}">
                  ${formatCurrency(Math.abs(data.outstandingBalance))} ${data.outstandingBalance > 0 ? 'Due' : 'Credit'}
                </td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const statementData = generateStatementData();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileText className="w-5 h-5 flex-shrink-0" />
          <span className="break-words">Tenant Statement Generator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Selection Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="lease" className="text-sm font-medium">Select Tenant</Label>
            <select
              id="lease"
              className="w-full h-10 px-3 rounded-md border bg-background text-sm mt-1"
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
            >
              <option value="">Select a tenant...</option>
              {leases?.map((lease) => (
                <option key={lease._id} value={lease._id}>
                  {lease.tenantName} {lease.unit?.unitIdentifier ? `- ${lease.unit.unitIdentifier}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium">Start Month</Label>
              <Input
                id="startDate"
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium">End Month</Label>
              <Input
                id="endDate"
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Statement Preview */}
        {statementData && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Statement Preview</h3>
              <Button 
                onClick={generatePDF} 
                disabled={generating}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>

            {/* Tenant Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium">Tenant Information</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:gap-6">
                    <div className="flex-1">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2 font-medium">{statementData.lease.tenantName}</span>
                    </div>
                    {statementData.lease.tenantEmail && (
                      <div className="flex-1">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-2 break-all">{statementData.lease.tenantEmail}</span>
                      </div>
                    )}
                  </div>
                  {statementData.lease.unit?.unitIdentifier && (
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="ml-2 font-medium">{statementData.lease.unit.unitIdentifier}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Utility Charges */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Receipt className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium">Utility Charges</h4>
                </div>
                <div className="space-y-3">
                  {statementData.bills.map((bill) => {
                    const Icon = getUtilityIcon(bill.utilityType);
                    return (
                      <div key={`${bill._id}-${bill.billMonth}`} className="border rounded-lg p-3 bg-muted/20">
                        {/* Mobile Layout */}
                        <div className="block sm:hidden space-y-2">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{bill.utilityType}</div>
                              <div className="text-xs text-muted-foreground">{bill.billMonth}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">${bill.tenantCharge.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            {bill.tenantPercentage}% of ${bill.totalAmount.toFixed(2)}
                          </div>
                        </div>
                        
                        {/* Desktop Layout */}
                        <div className="hidden sm:flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{bill.utilityType}</div>
                              <div className="text-sm text-muted-foreground">{bill.billMonth}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${bill.tenantCharge.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              {bill.tenantPercentage}% of ${bill.totalAmount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium">Summary</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">Total Charges:</span>
                    <span className="font-medium text-lg">${statementData.totalCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">Total Paid:</span>
                    <span className="font-medium text-lg">${statementData.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-3 border-t border-border">
                    <span className="font-medium text-base">Outstanding Balance:</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className={`font-bold text-xl ${statementData.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.abs(statementData.outstandingBalance).toFixed(2)}
                      </span>
                      <Badge 
                        variant={statementData.outstandingBalance > 0 ? "destructive" : "default"} 
                        className="text-xs px-2 py-1 self-start sm:self-center"
                      >
                        {statementData.outstandingBalance > 0 ? "Due" : "Credit"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedLeaseId && (
          <div className="text-center py-8 px-4 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">Select a tenant to generate a statement</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}