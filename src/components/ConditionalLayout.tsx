"use client";
import { useEffect, useState } from "react";
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

  // Clerk cannot resolve a session during SSR, so isLoaded is always false on
  // the server and the plain layout is what gets rendered into the HTML. On the
  // client the session resolves and this component switches to the sidebar
  // layout — a different element tree — so React found the two disagreed and
  // discarded the server markup:
  //
  //   <div className="flex min-h-screen">   (client)
  //   <div className={null}>                (server)
  //
  // Whether it surfaced depended on how quickly Clerk resolved relative to
  // hydration, which made it look intermittent. Waiting for mount makes the
  // first client render match the server by construction; the real layout
  // appears immediately afterwards.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const shouldShowAppLayout = mounted && isLoaded && isSignedIn && !isPublicRoute;

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