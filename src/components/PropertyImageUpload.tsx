"use client";
import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Star,
  Loader2
} from "lucide-react";

interface PropertyImageUploadProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  description?: string;
  isCover?: boolean;
}

export function PropertyImageUpload({ 
  propertyId, 
  open, 
  onOpenChange, 
  onUploadComplete 
}: PropertyImageUploadProps) {
  const { user } = useUser();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addPropertyImage = useMutation(api.propertyImages.addPropertyImage);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      description: '',
      isCover: false,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    multiple: true,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileDescription = (index: number, description: string) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], description };
      return newFiles;
    });
  };

  const toggleCoverImage = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      // First, remove cover status from all files
      newFiles.forEach(file => file.isCover = false);
      // Then set this file as cover
      newFiles[index] = { ...newFiles[index], isCover: true };
      return newFiles;
    });
  };

  const uploadFiles = async () => {
    if (!user || uploadingFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      for (let i = 0; i < uploadingFiles.length; i++) {
        const fileData = uploadingFiles[i];
        
        setUploadingFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], status: 'uploading', progress: 0 };
          return newFiles;
        });

        try {
          // Get upload URL
          const uploadUrl = await generateUploadUrl();
          
          // Upload file
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": fileData.file.type },
            body: fileData.file,
          });
          
          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }
          
          const { storageId } = await result.json();
          
          // Add to property images
          await addPropertyImage({
            userId: user.id,
            propertyId: propertyId as any,
            storageId,
            name: fileData.file.name,
            fileSize: fileData.file.size,
            mimeType: fileData.file.type,
            description: fileData.description || undefined,
            isCover: fileData.isCover,
          });

          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { ...newFiles[i], status: 'success', progress: 100 };
            return newFiles;
          });

        } catch (error) {
          console.error("Upload error:", error);
          setUploadingFiles(prev => {
            const newFiles = [...prev];
            newFiles[i] = { 
              ...newFiles[i], 
              status: 'error', 
              error: error instanceof Error ? error.message : "Upload failed" 
            };
            return newFiles;
          });
        }
      }

      // Close dialog and refresh after successful uploads
      const successCount = uploadingFiles.filter(f => f.status === 'success').length;
      if (successCount > 0) {
        setTimeout(() => {
          onOpenChange(false);
          onUploadComplete?.();
          setUploadingFiles([]);
        }, 1000);
      }

    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    
    // Clean up preview URLs
    uploadingFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setUploadingFiles([]);
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Property Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          {!isUploading && (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg">Drop the images here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop images here</p>
                  <p className="text-muted-foreground mb-4">
                    or click to select files
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports: PNG, JPG, JPEG, WebP, GIF
                  </p>
                </div>
              )}
            </div>
          )}

          {/* File List */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Selected Images ({uploadingFiles.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploadingFiles.map((fileData, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Image Preview */}
                        <div className="relative">
                          <img 
                            src={fileData.preview} 
                            alt={fileData.file.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          
                          {/* Status Overlay */}
                          {fileData.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                          )}
                          
                          {fileData.status === 'success' && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-6 w-6 text-green-500 bg-white rounded-full" />
                            </div>
                          )}
                          
                          {fileData.status === 'error' && (
                            <div className="absolute top-2 right-2">
                              <AlertCircle className="h-6 w-6 text-red-500 bg-white rounded-full" />
                            </div>
                          )}

                          {/* Cover Image Badge */}
                          {fileData.isCover && (
                            <div className="absolute top-2 left-2">
                              <div className="bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Cover
                              </div>
                            </div>
                          )}

                          {/* Remove Button */}
                          {fileData.status !== 'uploading' && fileData.status !== 'success' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-2 right-2"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* File Info */}
                        <div>
                          <p className="font-medium text-sm truncate">{fileData.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileData.file.size)}
                          </p>
                        </div>

                        {/* Description Input */}
                        {fileData.status === 'pending' && (
                          <div className="space-y-2">
                            <Input
                              placeholder="Image description (optional)"
                              value={fileData.description || ''}
                              onChange={(e) => updateFileDescription(index, e.target.value)}
                              className="text-sm"
                            />
                            
                            <Button
                              size="sm"
                              variant={fileData.isCover ? "default" : "outline"}
                              onClick={() => toggleCoverImage(index)}
                              className="w-full"
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {fileData.isCover ? "Cover Image" : "Set as Cover"}
                            </Button>
                          </div>
                        )}

                        {/* Error Message */}
                        {fileData.status === 'error' && fileData.error && (
                          <p className="text-sm text-red-500">{fileData.error}</p>
                        )}

                        {/* Success Message */}
                        {fileData.status === 'success' && (
                          <p className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Uploaded successfully
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={uploadFiles}
              disabled={uploadingFiles.length === 0 || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {uploadingFiles.length} Image{uploadingFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}