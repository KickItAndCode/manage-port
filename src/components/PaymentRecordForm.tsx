"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Building, 
  Smartphone,
  AlertCircle,
  Calendar
} from "lucide-react";

interface PaymentRecordFormProps {
  tenantName: string;
  chargedAmount: number;
  utilityType: string;
  billMonth: string;
  previouslyPaid?: number;
  onSubmit: (data: {
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "check", label: "Check", icon: Building },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building },
  { value: "online", label: "Online Payment", icon: Smartphone },
  { value: "other", label: "Other", icon: DollarSign },
];

export function PaymentRecordForm({
  tenantName,
  chargedAmount,
  utilityType,
  billMonth,
  previouslyPaid = 0,
  onSubmit,
  onCancel
}: PaymentRecordFormProps) {
  const remainingBalance = chargedAmount - previouslyPaid;
  
  const [amountPaid, setAmountPaid] = useState(remainingBalance.toString());
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amountPaid = "Amount must be greater than 0";
    }
    
    if (amount > remainingBalance) {
      newErrors.amountPaid = `Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`;
    }
    
    if (!paymentDate) {
      newErrors.paymentDate = "Payment date is required";
    }
    
    if (!paymentMethod) {
      newErrors.paymentMethod = "Payment method is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    try {
      await onSubmit({
        amountPaid: parseFloat(amountPaid),
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (error: any) {
      console.error("Payment recording error:", error);
      alert(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const isFullPayment = parseFloat(amountPaid) === remainingBalance;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Charge Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tenant</span>
          <span className="font-medium">{tenantName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Utility</span>
          <span className="font-medium">{utilityType} - {billMonth}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Charge</span>
          <span className="font-medium">${chargedAmount.toFixed(2)}</span>
        </div>
        {previouslyPaid > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Previously Paid</span>
            <span className="font-medium text-green-600">-${previouslyPaid.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-sm font-medium">Remaining Balance</span>
          <span className="text-lg font-bold">${remainingBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <Label htmlFor="amountPaid">Payment Amount *</Label>
        <div className="relative mt-1">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="amountPaid"
            type="number"
            step="0.01"
            min="0.01"
            max={remainingBalance}
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0.00"
            className={`pl-9 ${errors.amountPaid ? 'border-red-500' : ''}`}
            disabled={loading}
          />
        </div>
        {errors.amountPaid && (
          <p className="text-sm text-red-500 mt-1">{errors.amountPaid}</p>
        )}
        
        {/* Quick payment options */}
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmountPaid(remainingBalance.toString())}
            disabled={loading}
          >
            Full Balance (${remainingBalance.toFixed(2)})
          </Button>
          {remainingBalance > 50 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmountPaid((remainingBalance / 2).toFixed(2))}
              disabled={loading}
            >
              Half (${(remainingBalance / 2).toFixed(2)})
            </Button>
          )}
        </div>
      </div>

      {/* Payment Date */}
      <div>
        <Label htmlFor="paymentDate">Payment Date *</Label>
        <div className="relative mt-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="paymentDate"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className={`pl-9 ${errors.paymentDate ? 'border-red-500' : ''}`}
            disabled={loading}
          />
        </div>
        {errors.paymentDate && (
          <p className="text-sm text-red-500 mt-1">{errors.paymentDate}</p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <Label>Payment Method *</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={setPaymentMethod}
          className="grid grid-cols-2 gap-3 mt-2"
          disabled={loading}
        >
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.value}>
                <RadioGroupItem
                  value={method.value}
                  id={method.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={method.value}
                  className="flex items-center gap-2 rounded-md border-2 border-muted bg-background p-3 hover:bg-muted cursor-pointer peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Icon className="w-4 h-4" />
                  {method.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {errors.paymentMethod && (
          <p className="text-sm text-red-500 mt-1">{errors.paymentMethod}</p>
        )}
      </div>

      {/* Reference Number */}
      {["check", "bank_transfer", "online"].includes(paymentMethod) && (
        <div>
          <Label htmlFor="referenceNumber">
            {paymentMethod === "check" ? "Check Number" :
             paymentMethod === "bank_transfer" ? "Transaction ID" :
             "Confirmation Number"}
          </Label>
          <Input
            id="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={
              paymentMethod === "check" ? "Check #1234" :
              paymentMethod === "bank_transfer" ? "Transaction ID" :
              "Confirmation number"
            }
            className="mt-1"
            disabled={loading}
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes about this payment..."
          rows={3}
          className="mt-1"
          disabled={loading}
        />
      </div>

      {/* Payment Summary Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isFullPayment ? (
            "This payment will fully settle the charge."
          ) : (
            `After this payment, $${(remainingBalance - parseFloat(amountPaid || "0")).toFixed(2)} will remain outstanding.`
          )}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Recording..." : "Record Payment"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}