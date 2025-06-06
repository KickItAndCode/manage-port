"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DocumentViewerProps {
  storageId: string | undefined;
  fileName: string;
  className?: string;
  children?: React.ReactNode;
}

export function DocumentViewer({ storageId, className, children }: DocumentViewerProps) {
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

  const handleDownload = async () => {
    if (!actualUrl) return;
    
    setIsLoading(true);
    try {
      // Open the file in a new tab for viewing/downloading
      window.open(actualUrl, '_blank');
    } catch (error) {
      console.error("Error opening file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!children) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={handleDownload}
        disabled={!actualUrl || isLoading}
      >
        <Download className="h-3 w-3 mr-1" />
        {isLoading ? "Loading..." : "View"}
      </Button>
    );
  }

  return (
    <div onClick={handleDownload} className={className}>
      {children}
    </div>
  );
}