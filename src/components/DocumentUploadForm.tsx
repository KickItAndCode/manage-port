"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "./ui/dialog";
import { 
  Upload, 
  X, 
  FileText, 
  Loader2,
  Plus 
} from "lucide-react";
import { 
  DOCUMENT_TYPES, 
  DOCUMENT_TYPE_LABELS, 
  MAX_FILE_SIZE, 
  ACCEPTED_FILE_TYPES 
} from "../lib/constants";

// Constants for clear intent
const NO_SELECTION = "__NO_SELECTION__" as const;

interface DocumentUploadFormProps {
  // New pattern - folder/entity linking
  folderId?: Id<"documentFolders">;
  propertyId?: Id<"properties">;
  leaseId?: Id<"leases">;
  utilityBillId?: Id<"utilityBills">;
  
  // Old pattern - controlled dialog
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Common
  onUploadComplete?: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
}

export default function DocumentUploadForm({
  folderId,
  propertyId,
  leaseId,
  utilityBillId,
  open,
  onOpenChange,
  onUploadComplete,
}: DocumentUploadFormProps) {
  // Support both controlled and uncontrolled patterns
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    type: DOCUMENT_TYPES.OTHER as string,
    notes: "",
    tags: "",
    expiryDate: "",
    selectedPropertyId: propertyId as string | undefined,
    selectedLeaseId: leaseId as string | undefined,
    selectedUtilityBillId: utilityBillId as string | undefined,
  });

  const { user } = useUser();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);

  // Queries for dropdowns
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  const leases = useQuery(api.leases.getLeases,
    user ? { userId: user.id } : "skip"
  );
  const utilityBills = useQuery(api.utilityBills.getUtilityBills,
    user && formData.selectedPropertyId ? { 
      userId: user.id, 
      propertyId: formData.selectedPropertyId as any
    } : "skip"
  );

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => 
        file.errors.map((error: any) => error.message).join(", ")
      );
      toast.error(`Some files were rejected: ${errors.join("; ")}`);
    }

    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      })
    );

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (fileToRemove: FileWithPreview) => {
    setFiles(files => {
      const newFiles = files.filter(file => file !== fileToRemove);
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    if (!user) {
      toast.error("Please sign in to upload documents");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let uploadedFiles = 0;

      for (const file of files) {
        try {
          // Generate upload URL
          const uploadUrl = await generateUploadUrl();
          
          // Upload file to storage
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { storageId } = await result.json();

          // Create document record using the older addDocument mutation for better compatibility
          await addDocument({
            userId: user.id,
            url: storageId,
            name: file.name,
            type: formData.type,
            propertyId: formData.selectedPropertyId ? formData.selectedPropertyId as any : propertyId,
            leaseId: formData.selectedLeaseId ? formData.selectedLeaseId as any : leaseId,
            utilityBillId: formData.selectedUtilityBillId ? formData.selectedUtilityBillId as any : utilityBillId,
            fileSize: file.size,
            mimeType: file.type,
            expiryDate: formData.expiryDate || undefined,
            tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : undefined,
            notes: formData.notes || undefined,
          });

          uploadedFiles++;
          setUploadProgress((uploadedFiles / totalFiles) * 100);
          
          toast.success(`Uploaded ${file.name}`);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      // Clean up
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      setFiles([]);
      setFormData({
        type: DOCUMENT_TYPES.OTHER as string,
        notes: "",
        tags: "",
        expiryDate: "",
        selectedPropertyId: propertyId as string | undefined,
        selectedLeaseId: leaseId as string | undefined,
        selectedUtilityBillId: utilityBillId as string | undefined,
      });
      setIsOpen(false);
      
      toast.success(`Successfully uploaded ${uploadedFiles} file(s)!`);
      onUploadComplete?.();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Dropzone */}
          <Card>
            <CardContent className="pt-6">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? "border-primary bg-primary/10" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, images, Word, Excel files up to {formatFileSize(MAX_FILE_SIZE)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File list */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="type">Document Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Selection */}
              <div>
                <Label htmlFor="property">Link to Property (Optional)</Label>
                <Select
                  value={formData.selectedPropertyId || NO_SELECTION}
                  onValueChange={(value) => {
                    const actualValue = value === NO_SELECTION ? undefined : value;
                    setFormData(prev => ({ 
                      ...prev, 
                      selectedPropertyId: actualValue,
                      selectedLeaseId: undefined, // Reset lease when property changes
                      selectedUtilityBillId: undefined, // Reset utility bill when property changes
                      // Auto-set document type to property if property is selected but no specific entity
                      type: actualValue ? DOCUMENT_TYPES.PROPERTY : DOCUMENT_TYPES.OTHER
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>No property</SelectItem>
                    {properties?.map((property) => (
                      <SelectItem key={property._id} value={property._id}>
                        {property.name} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a property to organize your documents. Document type will be set to "Property" automatically. This will enable lease and utility bill linking options.
                </p>
              </div>

              {/* Lease Selection - Only show if property is selected */}
              {formData.selectedPropertyId && (
                <div>
                  <Label htmlFor="lease">Link to Lease (Optional)</Label>
                  <Select
                    value={formData.selectedLeaseId || NO_SELECTION}
                    onValueChange={(value) => {
                      const actualValue = value === NO_SELECTION ? undefined : value;
                      setFormData(prev => ({ 
                        ...prev, 
                        selectedLeaseId: actualValue,
                        // Auto-set document type to lease if lease is selected
                        type: actualValue ? DOCUMENT_TYPES.LEASE : prev.type
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lease" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>No lease</SelectItem>
                      {leases?.filter(lease => lease.propertyId === formData.selectedPropertyId).map((lease) => (
                        <SelectItem key={lease._id} value={lease._id}>
                          {lease.tenantName} ({lease.startDate} - {lease.endDate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Attach this document to a specific lease agreement. Document type will be set to "Lease" automatically.
                  </p>
                </div>
              )}

              {/* Utility Bill Selection - Only show if property is selected */}
              {formData.selectedPropertyId && (
                <div>
                  <Label htmlFor="utilityBill">Link to Utility Bill (Optional)</Label>
                  <Select
                    value={formData.selectedUtilityBillId || NO_SELECTION}
                    onValueChange={(value) => {
                      const actualValue = value === NO_SELECTION ? undefined : value;
                      setFormData(prev => ({ 
                        ...prev, 
                        selectedUtilityBillId: actualValue,
                        // Auto-set document type to utility_bill if utility bill is selected
                        type: actualValue ? DOCUMENT_TYPES.UTILITY_BILL : prev.type
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a utility bill" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>No utility bill</SelectItem>
                      {utilityBills?.map((bill) => (
                        <SelectItem key={bill._id} value={bill._id}>
                          {bill.utilityType} - {bill.billMonth} (${bill.totalAmount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Attach this document to a specific utility bill (receipts, statements, etc.). Document type will be set to "Utility Bill" automatically.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about these documents..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>

              {/* Summary of what will be linked */}
              {(formData.selectedPropertyId || formData.selectedLeaseId || formData.selectedUtilityBillId) && (
                <div className="bg-muted/50 rounded-lg p-3 border">
                  <Label className="text-sm font-medium">Document will be linked to:</Label>
                  <div className="mt-2 space-y-1 text-sm">
                    {formData.selectedPropertyId && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Property:</span>
                        <span className="font-medium">
                          {properties?.find(p => p._id === formData.selectedPropertyId)?.name}
                        </span>
                      </div>
                    )}
                    {formData.selectedLeaseId && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Lease:</span>
                        <span className="font-medium">
                          {leases?.find(l => l._id === formData.selectedLeaseId)?.tenantName}
                        </span>
                      </div>
                    )}
                    {formData.selectedUtilityBillId && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Utility Bill:</span>
                        <span className="font-medium">
                          {utilityBills?.find(b => b._id === formData.selectedUtilityBillId)?.utilityType} - {utilityBills?.find(b => b._id === formData.selectedUtilityBillId)?.billMonth}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload progress */}
          {uploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uploading...</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}