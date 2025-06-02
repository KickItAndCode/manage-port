"use client";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES, DOCUMENT_CATEGORIES } from "@/../convex/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  FileText,
  X
} from "lucide-react";

interface DocumentUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

export function DocumentUploadForm({ open, onOpenChange, onUploadComplete }: DocumentUploadFormProps) {
  const { user } = useUser();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    type: DOCUMENT_TYPES.OTHER,
    category: "",
    propertyId: "",
    leaseId: "",
    notes: "",
  });

  // Queries
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const leases = useQuery(api.leases.getLeases, 
    user ? { userId: user.id } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Get upload URL from Convex
        const uploadUrl = await generateUploadUrl();
        
        // Upload file to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        
        const { storageId } = await result.json();
        
        // Save document metadata
        await addDocument({
          userId: user.id,
          url: storageId,
          name: file.name,
          type: formData.type,
          category: formData.category || undefined,
          propertyId: formData.propertyId ? formData.propertyId as any : undefined,
          leaseId: formData.leaseId ? formData.leaseId as any : undefined,
          fileSize: file.size,
          mimeType: file.type,
          notes: formData.notes || undefined,
        });
      }

      // Reset form
      setFiles([]);
      setFormData({
        type: DOCUMENT_TYPES.OTHER,
        category: "",
        propertyId: "",
        leaseId: "",
        notes: "",
      });
      
      onOpenChange(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      // Here you could show a toast notification
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 dark:bg-gradient-to-br dark:from-gray-900/50 dark:to-gray-800/30 dark:border dark:border-gray-700/50 dark:rounded-lg dark:p-6">
          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here</p>
                <p className="text-sm text-muted-foreground">
                  or click to select files
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: PDF, Images, Word documents
                </p>
              </div>
            )}
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground dark:text-gray-200">Selected Files ({files.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground dark:text-gray-200">Document Information</h3>
            
            {/* Type and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-gray-200">Type</label>
                <select
                  className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-gray-200">Category</label>
                <select
                  className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Property and Lease */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-gray-200">Property (Optional)</label>
                <select
                  className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
                  value={formData.propertyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                >
                  <option value="">Select property</option>
                  {properties?.map((property: any) => (
                    <option key={property._id} value={property._id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-gray-200">Lease (Optional)</label>
                <select
                  className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary"
                  value={formData.leaseId}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaseId: e.target.value }))}
                >
                  <option value="">Select lease</option>
                  {leases?.map((lease: any) => (
                    <option key={lease._id} value={lease._id}>
                      {lease.tenantName} - {properties?.find((p: any) => p._id === lease.propertyId)?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-gray-200">Notes (Optional)</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about these documents..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}