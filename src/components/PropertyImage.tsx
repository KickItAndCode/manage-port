"use client";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Loader2 } from "lucide-react";

interface PropertyImageProps {
  storageId: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function PropertyImage({ storageId, alt, className, onClick }: PropertyImageProps) {
  // Get the actual URL from the storage ID
  const imageUrl = useQuery(api.storage.getUrl, { storageId: storageId as any });

  if (imageUrl === undefined) {
    // Still loading
    return (
      <div className={`bg-muted flex items-center justify-center ${className || 'w-full h-48'}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (imageUrl === null) {
    // Failed to load or file not found
    return (
      <div className={`bg-muted flex items-center justify-center ${className || 'w-full h-48'}`}>
        <div className="text-center text-sm text-muted-foreground">
          <p>Image not found</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => {
        console.error("Error loading image:", e);
      }}
    />
  );
}