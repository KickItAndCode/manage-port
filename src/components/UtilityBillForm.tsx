"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/../convex/_generated/dataModel";
import { DollarSign, AlertCircle, Settings, Home, Upload, X, CheckCircle, FileText, Sparkles, HelpCircle, Calendar, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES } from "@/../convex/documents";
import { toast } from "sonner";
import { BillSplitPreview } from "./BillSplitPreview";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [advancedMode, setAdvancedMode] = useState(!!initial);
  
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

    if (!dueDate) {
      newErrors.dueDate = "Please enter when this bill is due to be paid";
    }

    if (!billDate) {
      newErrors.billDate = "Please enter the date this bill was issued";
    }

    // Cross-field validation
    if (billDate && dueDate) {
      const billDateObj = new Date(billDate);
      const dueDateObj = new Date(dueDate);
      if (dueDateObj < billDateObj) {
        newErrors.dueDate = "Due date cannot be before the bill date";
      }
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
    console.log("Seed button clicked", { user: !!user, propertyId, seeding });
    
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
      
      // Close the modal after successful seeding
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
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Basic Information Section */}
      <div className="bg-white/50 rounded-lg border p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
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
              className={cn(
                "gap-2 transition-all text-xs",
                propertyId && !seeding && !loading && "hover:bg-primary/90 hover:text-white hover:border-primary",
                (!propertyId || loading) && "opacity-50 cursor-not-allowed"
              )}
              title={!propertyId ? "Select a property first" : "Generate test data for the selected property"}
            >
              <Sparkles className={cn("w-4 h-4", seeding && "animate-spin")} />
              {seeding ? "Generating..." : "Generate Year's Bills"}
            </Button>
          )}
        </div>
        <FormField
          error={errors.propertyId}
          description={propertyId && !initial ? `Tip: Use "Generate Year's Bills" to create test data for ${new Date().getFullYear()}` : undefined}
        >
          <SelectNative
            id="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={loading}
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
      <FormField
        label="Utility Type"
        required
        error={errors.utilityType}
      >
        <SelectNative
          id="utilityType"
          value={utilityType}
          onChange={(e) => {
            setUtilityType(e.target.value);
            // Reset provider when type changes
            if (!initial) setProvider("");
          }}
          disabled={loading}
        >
          <option value="">Select utility type</option>
          {UTILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectNative>
      </FormField>

      {/* Provider with Touch-Friendly Selection */}
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
            className={`h-11 ${errors.provider ? "border-destructive" : ""}`}
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
          {provider && suggestedProviders.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Selected provider: {provider}
            </div>
          )}
        </div>
        {errors.provider && (
          <p className="text-sm text-destructive mt-1">{errors.provider}</p>
        )}
      </div>
      </div>

      {/* Billing Details Section */}
      <div className="bg-white/50 rounded-lg border p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Billing Details
        </h3>

      {/* Bill Month and Advanced Mode Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="billMonth">Bill Month *</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Calendar className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedMode(!advancedMode)}
            className="text-xs h-7 px-2"
          >
            <Settings className="w-3 h-3 mr-1" />
            {advancedMode ? "Simple" : "Advanced"}
          </Button>
        </div>
        <Input
          id="billMonth"
          type="month"
          value={billMonth}
          onChange={(e) => setBillMonth(e.target.value)}
          disabled={loading}
          className={errors.billMonth ? "border-destructive" : ""}
        />
        {errors.billMonth && (
          <p className="text-sm text-destructive mt-1">{errors.billMonth}</p>
        )}
      </div>

      {/* Billing Period */}
      <FormField
        label="Billing Period"
        description="How often this utility bill is issued"
      >
        <SelectNative
          id="billingPeriod"
          value={billingPeriod}
          onChange={(e) => setBillingPeriod(e.target.value)}
          disabled={loading}
        >
          {BILLING_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </SelectNative>
      </FormField>

      {/* Amount with Quick Helper Buttons */}
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
          
          {/* Clear Amount Button */}
          {totalAmount && (
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTotalAmount("")}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                Clear Amount
              </Button>
              <span className="text-sm text-muted-foreground">
                Tip: Tap quick amounts above to set common values
              </span>
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
        <div className="bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-lg border border-blue-200/50 p-4 sm:p-6 space-y-4 transition-all duration-300 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold text-blue-800">
              Live Split Preview
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-blue-600 hover:text-blue-800 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                <div className="space-y-2">
                  <p className="font-medium">Real-time utility split calculation</p>
                  <ul className="text-xs space-y-1">
                    <li>• Shows how the bill will be divided among tenants</li>
                    <li>• Based on each lease's utility responsibility percentages</li>
                    <li>• Owner covers remaining percentage + vacant units</li>
                    <li>• Updates automatically as you type</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
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

      {/* Advanced Options Section */}
      {advancedMode && (
        <div className="bg-white/50 rounded-lg border p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Advanced Options
          </h3>
        
        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="billDate">Bill Date *</Label>
            <Input
              id="billDate"
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              disabled={loading}
              className={errors.billDate ? "border-destructive" : ""}
            />
            {errors.billDate && (
              <p className="text-sm text-destructive mt-1">{errors.billDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              className={errors.dueDate ? "border-destructive" : ""}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>
        </div>
      )}

      {!advancedMode && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">Default Settings:</p>
          <ul className="space-y-1">
            <li>• Bill Date: 1st of {billMonth ? new Date(billMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'selected month'}</li>
            <li>• Due Date: 15th of following month</li>
          </ul>
          <p className="text-xs mt-2">Use "Advanced" mode to customize these dates</p>
        </div>
      )}

      {/* Additional Information Section */}
      <div className="bg-white/50 rounded-lg border p-4 sm:p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
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
        />
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          After saving, tenant charges will be automatically calculated based on 
          the utility responsibility percentages defined in their leases.
        </AlertDescription>
      </Alert>

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
            <input {...getInputProps()} />
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
        
        <p className="text-xs text-muted-foreground">
          Upload the utility bill document. It will be automatically linked to this property and stored in your documents.
        </p>
      </div>
      </div>

      {/* Actions */}
      <div className="bg-white/50 rounded-lg border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button 
            type="submit" 
            disabled={loading}
            className="flex-1 h-12 text-base font-medium"
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