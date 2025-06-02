"use client";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface DocumentFileReplaceProps {
  currentFileName: string;
  documentId: string;
  onFileReplaced?: (newStorageId: string) => void;
  onReplaceError?: (error: string) => void;
  className?: string;
}

export function DocumentFileReplace({ 
  currentFileName,
  documentId,
  onFileReplaced, 
  onReplaceError,
  className
}: DocumentFileReplaceProps) {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [newFile, setNewFile] = useState<{ name: string; storageId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateDocument = useMutation(api.documents.updateDocument);

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
      
      // Update document with new file
      await updateDocument({
        id: documentId as any,
        userId: user.id,
        url: storageId, // Replace the old storage ID
        name: file.name, // Update the name to the new file name
        fileSize: file.size,
        mimeType: file.type,
      });

      setNewFile({ name: file.name, storageId });
      onFileReplaced?.(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setError(errorMessage);
      onReplaceError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [user, generateUploadUrl, updateDocument, documentId, onFileReplaced, onReplaceError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const resetReplacement = () => {
    setNewFile(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Replace File</label>
        {newFile && (
          <Button
            size="sm"
            variant="ghost"
            onClick={resetReplacement}
            className="text-xs"
          >
            Reset
          </Button>
        )}
      </div>
      
      {/* Current file info */}
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/20">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium text-sm">{newFile ? newFile.name : currentFileName}</p>
          <p className="text-xs text-muted-foreground">
            {newFile ? "New file selected" : "Current file"}
          </p>
        </div>
        {newFile && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>

      {/* Drop zone for replacement */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        {uploading ? (
          <div>
            <p className="text-sm">Uploading replacement...</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
            </div>
          </div>
        ) : isDragActive ? (
          <p className="text-sm">Drop the replacement file here...</p>
        ) : (
          <div>
            <p className="text-sm mb-1">Drag & drop replacement file here</p>
            <p className="text-xs text-muted-foreground">
              or click to select (PDF, DOC, DOCX, Images)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 border border-red-600 rounded-lg bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload a new file to replace the current document. The old file will be replaced permanently.
      </p>
    </div>
  );
}