"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/../convex/_generated/dataModel";
import { DollarSign, AlertCircle, Home, Upload, X, CheckCircle, FileText, Sparkles, Calendar, Calculator, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES } from "@/../convex/documents";
import { toast } from "sonner";
import { BillSplitPreview } from "./BillSplitPreview";

interface UtilityBillFormProps {
  defaultMonth?: string;
  initial?: {
    _id?: Id<"utilityBills">;
    propertyId?: string;
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    billingPeriod?: string;
    notes?: string;
  };
  onSubmit: (data: {
    propertyId: string;
    utilityType: string;
    provider: string;
    billMonth: string;
    totalAmount: number;
    dueDate: string;
    billDate: string;
    billingPeriod?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const UTILITY_TYPES = [
  "Electric",
  "Water",
  "Gas",
  "Sewer",
  "Trash",
  "Internet",
  "Cable",
  "HOA",
  "Other",
];

const COMMON_PROVIDERS: Record<string, string[]> = {
  Electric: ["Local Electric Co", "City Power", "Regional Energy"],
  Water: ["City Water", "Municipal Water", "County Water District"],
  Gas: ["Natural Gas Co", "City Gas", "Regional Gas"],
  Sewer: ["City Sewer", "Municipal Sewer"],
  Trash: ["Waste Management", "City Sanitation", "Local Waste"],
  Internet: ["Comcast", "AT&T", "Spectrum", "Verizon"],
  Cable: ["Comcast", "DirecTV", "Dish Network"],
  HOA: ["HOA Management", "Property Management Co"],
};

const BILLING_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "bi-monthly", label: "Bi-Monthly (Every 2 months)" },
  { value: "quarterly", label: "Quarterly (Every 3 months)" },
  { value: "semi-annual", label: "Semi-Annual (Every 6 months)" },
  { value: "annual", label: "Annual (Yearly)" },
];

export function UtilityBillForm({
  defaultMonth,
  initial,
  onSubmit,
  onCancel,
  loading,
}: UtilityBillFormProps) {
  const { user } = useUser();
  
  // Fetch properties directly
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const [propertyId, setPropertyId] = useState(initial?.propertyId || "");
  const [utilityType, setUtilityType] = useState(initial?.utilityType || "");
  const [provider, setProvider] = useState(initial?.provider || "");
  const [billMonth, setBillMonth] = useState(initial?.billMonth || defaultMonth || "");
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount?.toString() || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [billDate, setBillDate] = useState(initial?.billDate || "");
  const [billingPeriod, setBillingPeriod] = useState(initial?.billingPeriod || "monthly");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; storageId: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Document upload mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);
  
  // Seed mutation
  const seedUtilityBills = useMutation(api.utilityBills.seedUtilityBills);
  const [seeding, setSeeding] = useState(false);

  // Set default dates if not editing
  useState(() => {
    if (!initial) {
      const today = new Date();
      
      // Use defaultMonth if provided, otherwise current month
      const targetMonth = defaultMonth || today.toISOString().slice(0, 7);
      setBillMonth(targetMonth);
      
      // Set bill date to beginning of the month (simplified default)
      const [year, month] = targetMonth.split('-');
      const firstOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      setBillDate(firstOfMonth.toISOString().split('T')[0]);
      
      // Default due date to 15th of next month
      const nextMonth = new Date(parseInt(year), parseInt(month), 15);
      setDueDate(nextMonth.toISOString().split('T')[0]);
    }
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!propertyId) {
      newErrors.propertyId = "Please select a property to assign this utility bill";
    }

    if (!utilityType) {
      newErrors.utilityType = "Please specify the type of utility (Electric, Water, Gas, etc.)";
    }

    if (!provider.trim()) {
      newErrors.provider = "Please enter the utility company name (e.g., City Electric Co.)";
    }

    if (!billMonth) {
      newErrors.billMonth = "Please select the month this bill covers";
    }

    if (!totalAmount || isNaN(Number(totalAmount))) {
      newErrors.totalAmount = "Please enter a valid dollar amount for the total bill";
    } else if (Number(totalAmount) <= 0) {
      newErrors.totalAmount = "Bill amount must be greater than $0.00";
    } else if (Number(totalAmount) > 10000) {
      newErrors.totalAmount = "Bill amount seems unusually high. Please verify the amount.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      propertyId,
      utilityType,
      provider: provider.trim(),
      billMonth,
      totalAmount: Number(totalAmount),
      dueDate,
      billDate,
      billingPeriod,
      notes: notes.trim() || undefined,
    });
  };

  const suggestedProviders = utilityType ? COMMON_PROVIDERS[utilityType] || [] : [];
  
  // Document upload handler
  const handleDocumentUpload = async (files: File[]) => {
    if (!user || files.length === 0) return;
    
    const file = files[0];
    setUploading(true);
    setUploadError(null);
    
    try {
      const uploadUrl = await generateUploadUrl();
      
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }
      
      const { storageId } = await result.json();
      
      await addDocument({
        userId: user.id,
        url: storageId,
        name: file.name,
        type: DOCUMENT_TYPES.UTILITY_BILL,
        propertyId: propertyId ? propertyId as any : undefined,
        fileSize: file.size,
        mimeType: file.type,
        notes: "Utility bill document uploaded during bill creation",
      });
      
      setUploadedFile({ name: file.name, storageId });
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDocumentUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: uploading || !!uploadedFile,
  });
  
  const clearUpload = () => {
    setUploadedFile(null);
    setUploadError(null);
  };

  const handleSeedData = async () => {
    if (!user || !propertyId) {
      toast.error("Please select a property first");
      return;
    }

    setSeeding(true);
    try {
      const result = await seedUtilityBills({
        userId: user.id,
        propertyId: propertyId as Id<"properties">,
      });
      
      toast.success(result.message);
      
      if (onCancel) {
        onCancel();
      }
    } catch (error: any) {
      toast.error("Failed to generate test data", {
        description: error.message || "Please try again",
      });
    } finally {
      setSeeding(false);
    }
  };

  // Show loading state while properties are loading
  if (!properties) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading properties...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto" data-testid="utility-bill-form">
      {/* Basic Information Section */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Basic Information
        </h3>
        
        {/* Property Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Property *</Label>
            {!initial && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSeedData}
                disabled={seeding || !propertyId || loading}
                className="gap-2 text-xs"
                data-testid="generate-years-bills-button"
              >
                <Sparkles className={cn("w-4 h-4", seeding && "animate-spin")} />
                {seeding ? "Generating..." : "Generate Year's Bills"}
              </Button>
            )}
          </div>
          <FormField error={errors.propertyId}>
            <SelectNative
              id="propertyId"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={loading}
              data-testid="property-select"
            >
              <option value="">Select a property</option>
              {properties?.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </SelectNative>
          </FormField>
        </div>

        {/* Utility Type */}
        <FormField label="Utility Type" required error={errors.utilityType}>
          <SelectNative
            id="utilityType"
            value={utilityType}
            onChange={(e) => {
              setUtilityType(e.target.value);
              if (!initial) setProvider("");
            }}
            disabled={loading}
            data-testid="utility-type-select"
          >
            <option value="">Select utility type</option>
            {UTILITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectNative>
        </FormField>

        {/* Provider */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="provider">Provider *</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <div className="space-y-2">
                  <p className="font-medium">Name of the utility company</p>
                  <ul className="text-xs space-y-1">
                    <li>• Use the exact name from your bill</li>
                    <li>• Helps track billing patterns</li>
                    <li>• Click suggested providers for common choices</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., City Electric Company"
              disabled={loading}
              className={errors.provider ? "border-destructive" : ""}
              data-testid="provider-input"
            />
            {suggestedProviders.length > 0 && !provider && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Popular {utilityType} Providers:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedProviders.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProvider(p)}
                      className="h-10 justify-start text-left px-3"
                      disabled={loading}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {errors.provider && (
            <p className="text-sm text-destructive mt-1">{errors.provider}</p>
          )}
        </div>
      </div>

      {/* Billing Details Section */}
      <div className="bg-indigo-50 dark:bg-indigo-900 rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Billing Details
        </h3>

        {/* Bill Month */}
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="billMonth">Bill Month *</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <div className="space-y-2">
                  <p className="font-medium">Month this bill covers</p>
                  <ul className="text-xs space-y-1">
                    <li>• Usually found at the top of your bill</li>
                    <li>• Different from due date</li>
                    <li>• Used for monthly comparisons and reporting</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="billMonth"
            type="month"
            value={billMonth}
            onChange={(e) => setBillMonth(e.target.value)}
            disabled={loading}
            className={errors.billMonth ? "border-destructive" : ""}
            data-testid="bill-month-input"
          />
          {errors.billMonth && (
            <p className="text-sm text-destructive mt-1">{errors.billMonth}</p>
          )}
        </div>

        {/* Billing Period */}
        <FormField label="Billing Period" description="How often this utility bill is issued">
          <SelectNative
            id="billingPeriod"
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            disabled={loading}
            data-testid="billing-period-select"
          >
            {BILLING_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </SelectNative>
        </FormField>

        {/* Amount */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="totalAmount">Total Amount *</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                <div className="space-y-2">
                  <p className="font-medium">Enter the total amount from your utility bill</p>
                  <ul className="text-xs space-y-1">
                    <li>• Include all fees and taxes</li>
                    <li>• Use the final amount due</li>
                    <li>• Will be split among tenants based on their utility percentages</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className={`pl-9 text-lg h-12 ${errors.totalAmount ? "border-destructive" : ""}`}
                data-testid="total-amount-input"
                disabled={loading}
              />
            </div>
            
            {/* Quick Amount Buttons */}
            {!totalAmount && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[50, 75, 100, 125, 150, 200].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTotalAmount(amount.toString())}
                    className="text-xs h-8 px-2"
                    disabled={loading}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {errors.totalAmount && (
            <p className="text-sm text-destructive mt-1">{errors.totalAmount}</p>
          )}
        </div>
      </div>

      {/* Real-time Bill Split Preview */}
      {propertyId && utilityType && totalAmount && Number(totalAmount) > 0 && user && (
        <div className="bg-cyan-50 dark:bg-cyan-900 rounded-lg border p-6 space-y-4">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              <span className="text-lg font-semibold">Live Split Preview</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-72">
                  <div className="space-y-2">
                    <p className="font-medium">Real-time utility split calculation</p>
                    <ul className="text-xs space-y-1">
                      <li>• Shows how the bill will be divided among tenants</li>
                      <li>• Based on each lease&apos;s utility responsibility percentages</li>
                      <li>• Owner covers remaining percentage + vacant units</li>
                      <li>• Updates automatically as you type</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <BillSplitPreview
            propertyId={propertyId as Id<"properties">}
            utilityType={utilityType}
            totalAmount={Number(totalAmount)}
            userId={user.id}
            mode="preview"
          />
        </div>
      )}

      {/* Additional Information Section */}
      <div className="bg-green-50 dark:bg-green-900 rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Additional Information
        </h3>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information..."
            rows={3}
            disabled={loading}
            data-testid="bill-notes-textarea"
          />
        </div>

        {/* Document Upload */}
        <div className="space-y-3">
          <Label>Bill Document (optional)</Label>
          
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} data-testid="document-upload-input" />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              {uploading ? (
                <div>
                  <p className="text-sm">Uploading...</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                  </div>
                </div>
              ) : isDragActive ? (
                <p className="text-sm">Drop the bill document here...</p>
              ) : (
                <div>
                  <p className="text-sm mb-1">Drag & drop bill document here</p>
                  <p className="text-xs text-muted-foreground">
                    or click to select (PDF, DOC, DOCX, Images)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border border-muted rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearUpload}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{uploadError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border p-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button 
            type="submit" 
            disabled={loading}
            className="flex-1 h-12 text-base font-medium"
            data-testid="save-bill-button"
          >
            {loading ? "Saving..." : initial ? "Update Bill" : "Add Bill"}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              disabled={loading}
              className="flex-1 sm:flex-none h-12 text-base"
              data-testid="cancel-bill-button"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      </form>
    </TooltipProvider>
  );
}