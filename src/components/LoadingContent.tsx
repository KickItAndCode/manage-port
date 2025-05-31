import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingContentProps {
  loading: boolean;
  error?: string;
  children: React.ReactNode;
  skeletonRows?: number;
  skeletonHeight?: number | string;
}

export function LoadingContent({
  loading,
  error,
  children,
  skeletonRows = 3,
  skeletonHeight = 24,
}: LoadingContentProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: skeletonHeight }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-red-900 text-red-200 p-4 rounded-lg border border-red-700 text-center">
        {error}
      </div>
    );
  }
  return <>{children}</>;
} 