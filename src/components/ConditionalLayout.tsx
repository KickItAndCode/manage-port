"use client";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ResponsiveSidebar } from "@/components/ResponsiveSidebar";
import { Topbar } from "@/components/Topbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/sign-out",
  "/landing"
];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const shouldShowAppLayout = isLoaded && isSignedIn && !isPublicRoute;

  if (shouldShowAppLayout) {
    return (
      <div className="flex min-h-screen">
        <ResponsiveSidebar />
        <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
          <Topbar />
          <ErrorBoundary>
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return <main className="min-h-screen">{children}</main>;
}