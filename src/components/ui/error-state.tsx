"use client";

import { ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message: string;
  /** Action to retry */
  onRetry?: () => void;
  /** Show home button */
  showHome?: boolean;
  /** Additional content */
  children?: ReactNode;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show error details in development */
  error?: Error;
}

/**
 * ErrorState - Shared component for consistent error states across pages
 * 
 * Used when an error occurs, with options to retry or navigate home.
 * 
 * @example
 * <ErrorState
 *   title="Something went wrong"
 *   message="Failed to load properties. Please try again."
 *   onRetry={() => refetch()}
 * />
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  showHome = false,
  children,
  className,
  size = "md",
  error,
}: ErrorStateProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center p-4",
        className
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div
            className={cn(
              "mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center",
              iconSizes[size]
            )}
          >
            <AlertCircle className={cn("text-destructive", iconSizes[size])} />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {onRetry && (
            <Button onClick={onRetry} className="w-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {showHome && (
            <Link href="/" className="block">
              <Button className="w-full" variant="secondary">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          )}
          
          {process.env.NODE_ENV === "development" && error && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Error Details (Development)
              </summary>
              <div className="mt-2 space-y-2">
                <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  <strong>Error:</strong> {error.message}
                </pre>
                {error.stack && (
                  <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    <strong>Stack:</strong> {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
          
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

