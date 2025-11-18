"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCw, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface DocumentPreviewProps {
  storageId: string | undefined;
  fileName: string;
  mimeType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreview({
  storageId,
  fileName,
  mimeType,
  open,
  onOpenChange,
}: DocumentPreviewProps) {
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the file URL
  const isLegacyUrl = storageId?.startsWith('http');
  const shouldFetchUrl = !isLegacyUrl && storageId && storageId.length > 10;
  const fileUrl = useQuery(
    api.storage.getUrl,
    shouldFetchUrl ? { storageId: storageId as any } : "skip"
  );
  const actualUrl = isLegacyUrl ? storageId : fileUrl;

  // Determine file type
  const getFileType = () => {
    if (mimeType) {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType === 'application/pdf') return 'pdf';
    }
    const extension = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    return 'other';
  };

  const fileType = getFileType();

  // Reset scale and rotation when dialog opens/closes
  useEffect(() => {
    if (open) {
      setImageScale(1);
      setImageRotation(0);
      setIsLoading(true);
      setError(null);
    }
  }, [open]);

  const handleDownload = () => {
    if (!actualUrl) return;
    const link = document.createElement('a');
    link.href = actualUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load image');
  };

  if (!storageId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {fileType === 'image' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={imageScale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {Math.round(imageScale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={imageScale >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!actualUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-muted/30">
          {!actualUrl && !isLegacyUrl ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : fileType === 'image' ? (
            <div className="flex items-center justify-center min-h-[400px]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <img
                src={actualUrl || undefined}
                alt={fileName}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={cn(
                  "max-w-full max-h-[calc(95vh-200px)] object-contain transition-transform",
                  isLoading && "opacity-0"
                )}
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                }}
              />
            </div>
          ) : fileType === 'pdf' ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <iframe
                src={actualUrl || undefined}
                className="w-full h-[calc(95vh-200px)] border-0 rounded"
                title={fileName}
                onLoad={() => setIsLoading(false)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={handleDownload} disabled={!actualUrl}>
                <Download className="h-4 w-4 mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

