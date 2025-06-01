"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { handleError } from "@/lib/error-handling";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Next.js Error Boundary:", error);
    }

    // Handle the error using our error handling system
    const appError = handleError(error, "Next.js Error Boundary");
    
    // TODO: Send to error reporting service in production
    // Example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while loading this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={reset} className="w-full" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Link href="/" className="block">
            <Button className="w-full" variant="secondary">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
          
          {process.env.NODE_ENV === "development" && (
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
                {error.digest && (
                  <pre className="p-2 bg-muted rounded text-xs">
                    <strong>Digest:</strong> {error.digest}
                  </pre>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}