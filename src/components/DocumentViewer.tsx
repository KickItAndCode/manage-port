"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";

interface DocumentViewerProps {
  storageId: string | undefined;
  fileName: string;
  mimeType?: string;
  className?: string;
  children?: React.ReactNode;
  actionType?: "view" | "download";
}

export function DocumentViewer({ 
  storageId, 
  fileName, 
  mimeType, 
  className, 
  children, 
  actionType = "view" 
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Early return if no storageId provided or it's empty/invalid
  if (!storageId || storageId.trim() === '') {
    return null;
  }
  
  // Check if storageId is already a full URL (legacy format) or a Convex storage ID
  const isLegacyUrl = storageId.startsWith('http');
  
  // Get the actual URL from the storage ID (only if it's not already a URL and looks like a valid storage ID)
  const shouldFetchUrl = !isLegacyUrl && storageId.length > 10; // Storage IDs are typically longer
  const fileUrl = useQuery(
    api.storage.getUrl, 
    shouldFetchUrl ? { storageId: storageId as any } : "skip"
  );
  
  // Use the legacy URL or the fetched URL
  const actualUrl = isLegacyUrl ? storageId : fileUrl;

  // Determine file type from fileName or mimeType
  const getFileType = () => {
    if (mimeType) {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('video/')) return 'video';
      if (mimeType.includes('audio/')) return 'audio';
    }
    
    const extension = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension || '')) return 'audio';
    
    return 'document';
  };

  const fileType = getFileType();

  const handleAction = async () => {
    if (!actualUrl) return;
    
    setIsLoading(true);
    try {
      if (actionType === "download") {
        // Force download
        const link = document.createElement('a');
        link.href = actualUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // View behavior based on file type
        if (fileType === 'image' || fileType === 'pdf') {
          // Open in new tab for viewing
          window.open(actualUrl, '_blank');
        } else {
          // For other files, download them
          const link = document.createElement('a');
          link.href = actualUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Error handling file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (actionType === "download") {
      return {
        icon: <Download className="h-3 w-3 mr-1" />,
        text: isLoading ? "Downloading..." : "Download"
      };
    }
    
    switch (fileType) {
      case 'image':
        return {
          icon: <Eye className="h-3 w-3 mr-1" />,
          text: isLoading ? "Loading..." : "View"
        };
      case 'pdf':
        return {
          icon: <FileText className="h-3 w-3 mr-1" />,
          text: isLoading ? "Loading..." : "View PDF"
        };
      default:
        return {
          icon: <Download className="h-3 w-3 mr-1" />,
          text: isLoading ? "Downloading..." : "Download"
        };
    }
  };

  const buttonContent = getButtonContent();

  if (!children) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={handleAction}
        disabled={!actualUrl || isLoading}
      >
        {buttonContent.icon}
        {buttonContent.text}
      </Button>
    );
  }

  return (
    <div onClick={handleAction} className={className}>
      {children}
    </div>
  );
}