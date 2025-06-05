"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Id } from "@/../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  DollarSign, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  CheckCircle,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash,
  Home
} from "lucide-react";

interface BulkBillEntry {
  id: string;
  utilityType: string;
  provider: string;
  totalAmount: string;
  dueDate: string;
  billDate: string;
  notes?: string;
}

interface BulkUtilityBillEntryProps {
  propertyId: Id<"properties">;
  propertyName: string;
  onSubmit: (bills: Array<{
    utilityType: string;
    provider: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    notes?: string;
  }>) => Promise<{ createdBillIds: string[]; errors: any[] }>;
  onCancel?: () => void;
}

const UTILITY_TEMPLATES = [
  { type: "Electric", icon: Zap, provider: "City Electric", color: "text-yellow-600" },
  { type: "Water", icon: Droplets, provider: "Municipal Water", color: "text-blue-600" },
  { type: "Gas", icon: Flame, provider: "Natural Gas Co", color: "text-orange-600" },
  { type: "Sewer", icon: Droplets, provider: "City Sewer", color: "text-green-600" },
  { type: "Trash", icon: Trash, provider: "Waste Management", color: "text-gray-600" },
  { type: "Internet", icon: Wifi, provider: "Internet Provider", color: "text-purple-600" },
];

export function BulkUtilityBillEntry({
  propertyId,
  propertyName,
  onSubmit,
  onCancel,
}: BulkUtilityBillEntryProps) {
  const [billMonth, setBillMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM
  });
  
  const [bills, setBills] = useState<BulkBillEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);

  // Initialize with common utilities
  const initializeCommonBills = () => {
    const today = new Date();
    const billDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0];

    const newBills = UTILITY_TEMPLATES.map((template, index) => ({
      id: `bill-${Date.now()}-${index}`,
      utilityType: template.type,
      provider: template.provider,
      totalAmount: "",
      dueDate,
      billDate,
      notes: "",
    }));

    setBills(newBills);
  };

  const addBill = () => {
    const today = new Date();
    const newBill: BulkBillEntry = {
      id: `bill-${Date.now()}`,
      utilityType: "",
      provider: "",
      totalAmount: "",
      dueDate: new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().split('T')[0],
      billDate: today.toISOString().split('T')[0],
      notes: "",
    };
    setBills([...bills, newBill]);
  };

  const removeBill = (id: string) => {
    setBills(bills.filter(b => b.id !== id));
  };

  const updateBill = (id: string, field: keyof BulkBillEntry, value: string) => {
    setBills(bills.map(bill => 
      bill.id === id ? { ...bill, [field]: value } : bill
    ));
  };

  const getUtilityIcon = (type: string) => {
    const template = UTILITY_TEMPLATES.find(t => t.type === type);
    return template ? template.icon : Home;
  };

  const getUtilityColor = (type: string) => {
    const template = UTILITY_TEMPLATES.find(t => t.type === type);
    return template ? template.color : "text-gray-600";
  };

  const handleSubmit = async () => {
    // Validate bills
    const validBills = bills.filter(bill => 
      bill.utilityType && 
      bill.provider && 
      bill.totalAmount && 
      parseFloat(bill.totalAmount) > 0
    );

    if (validBills.length === 0) {
      toast.error("Please add at least one valid bill");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const billsData = validBills.map(bill => ({
        utilityType: bill.utilityType,
        provider: bill.provider,
        totalAmount: parseFloat(bill.totalAmount),
        dueDate: bill.dueDate,
        billDate: bill.billDate,
        notes: bill.notes,
      }));

      const result = await onSubmit(billsData);
      
      setResults({
        success: result.createdBillIds.length,
        errors: result.errors.map(e => `${e.utilityType}: ${e.error}`),
      });

      // Show success/error toasts
      if (result.createdBillIds.length > 0) {
        toast.success("Bills created successfully!", {
          description: `${result.createdBillIds.length} bill${result.createdBillIds.length !== 1 ? 's' : ''} created.`,
        });
        setBills([]);
      }
      
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} bill${result.errors.length !== 1 ? 's' : ''} failed to create`, {
          description: "Check the results below for details.",
        });
      }
    } catch (error: any) {
      setResults({
        success: 0,
        errors: [error.message || "Failed to save bills"],
      });
      toast.error("Failed to save bills", {
        description: error.message || "Please try again or contact support.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Bulk Utility Bill Entry</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter all utility bills for {propertyName} at once
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="billMonth">Bill Month</Label>
            <Input
              id="billMonth"
              type="month"
              value={billMonth}
              onChange={(e) => setBillMonth(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={initializeCommonBills}
              disabled={loading || bills.length > 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Common Utilities
            </Button>
          </div>
        </div>
      </div>

      {/* Results Alert */}
      {results && (
        <Alert variant={results.errors.length > 0 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {results.success > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{results.success} bill(s) saved successfully</span>
              </div>
            )}
            {results.errors.map((error, index) => (
              <div key={index} className="text-sm">{error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Bills List */}
      <div className="space-y-3">
        {bills.map((bill) => {
          const Icon = getUtilityIcon(bill.utilityType);
          const iconColor = getUtilityColor(bill.utilityType);
          
          return (
            <Card key={bill.id} className="p-4">
              <div className="space-y-3">
                {/* Utility Type and Provider */}
                <div className="flex items-start gap-4">
                  <div className="pt-2">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Utility Type</Label>
                      <select
                        value={bill.utilityType}
                        onChange={(e) => updateBill(bill.id, "utilityType", e.target.value)}
                        className="w-full h-10 px-3 rounded-md border bg-background"
                        disabled={loading}
                      >
                        <option value="">Select type</option>
                        {UTILITY_TEMPLATES.map(t => (
                          <option key={t.type} value={t.type}>{t.type}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Provider</Label>
                      <Input
                        value={bill.provider}
                        onChange={(e) => updateBill(bill.id, "provider", e.target.value)}
                        placeholder="Provider name"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBill(bill.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                {/* Amount and Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-9">
                  <div>
                    <Label>Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bill.totalAmount}
                        onChange={(e) => updateBill(bill.id, "totalAmount", e.target.value)}
                        placeholder="0.00"
                        className="pl-9"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Bill Date</Label>
                    <Input
                      type="date"
                      value={bill.billDate}
                      onChange={(e) => updateBill(bill.id, "billDate", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={bill.dueDate}
                      onChange={(e) => updateBill(bill.id, "dueDate", e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Add Bill Button */}
        {bills.length === 0 ? (
          <Card className="p-8 text-center border-2 border-dashed">
            <p className="text-muted-foreground mb-4">No bills added yet</p>
            <div className="flex gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={initializeCommonBills}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Common Utilities
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={addBill}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Bill
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={addBill}
            disabled={loading}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Bill
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={loading || bills.length === 0}
        >
          {loading ? (
            "Saving..."
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save {bills.filter(b => b.utilityType && b.totalAmount).length} Bills
            </>
          )}
        </Button>
      </div>
    </div>
  );
}