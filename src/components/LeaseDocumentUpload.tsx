"use client";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DOCUMENT_TYPES, DOCUMENT_CATEGORIES } from "@/../convex/documents";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface LeaseDocumentUploadProps {
  propertyId?: string;
  onUploadComplete?: (storageId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function LeaseDocumentUpload({ 
  propertyId, 
  onUploadComplete, 
  onUploadError,
  className
}: LeaseDocumentUploadProps) {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; storageId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      setError("Please sign in to upload documents");
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0]; // Only handle the first file
    setUploading(true);
    setError(null);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }
      
      const { storageId } = await result.json();
      
      // Save document metadata
      await addDocument({
        userId: user.id,
        url: storageId,
        name: file.name,
        type: DOCUMENT_TYPES.LEASE,
        category: DOCUMENT_CATEGORIES.LEGAL,
        propertyId: propertyId || undefined,
        fileSize: file.size,
        mimeType: file.type,
        notes: "Lease document uploaded during lease creation",
      });

      setUploadedFile({ name: file.name, storageId });
      onUploadComplete?.(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [user, generateUploadUrl, addDocument, propertyId, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
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
    setError(null);
    onUploadComplete?.("");
  };


  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-zinc-200 mb-1">Lease Document (optional)</label>
      
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-zinc-600 hover:border-primary/50 bg-zinc-800",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          {uploading ? (
            <div>
              <p className="text-sm">Uploading...</p>
              <div className="w-full bg-zinc-700 rounded-full h-2 mt-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-sm">Drop the lease document here...</p>
          ) : (
            <div>
              <p className="text-sm mb-1">Drag & drop lease document here</p>
              <p className="text-xs text-muted-foreground">
                or click to select (PDF, DOC, DOCX, Images)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border border-zinc-600 rounded-lg bg-zinc-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-sm text-zinc-200">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">Uploaded successfully</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearUpload}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 border border-red-600 rounded-lg bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload the signed lease document. It will be automatically linked to this lease and stored in your documents.
      </p>
    </div>
  );
}