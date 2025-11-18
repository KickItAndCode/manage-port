"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { Sun, Moon } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { QuickActions } from "@/components/ui/quick-actions";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { isSignedIn, isLoaded } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-card text-foreground shadow-md transition-colors duration-300">
      <div className="flex-1 flex items-center gap-2 sm:gap-4 ml-12 sm:ml-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {isLoaded && isSignedIn && (
          <QuickActions variant="dropdown" className="hidden sm:flex" />
        )}
        {mounted && (
          <button
            className="p-2 rounded-full hover:bg-muted/60 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
        {isLoaded ? (
          isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="flex gap-1 sm:gap-2">
              <Link href="/sign-in" className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors duration-200 text-sm">Sign in</Link>
              <Link href="/sign-up" className="px-3 sm:px-4 py-2 bg-muted text-foreground rounded border border-border hover:bg-muted/70 transition-colors duration-200 text-sm">Sign up</Link>
            </div>
          )
        ) : (
          // Show minimal placeholder when auth is loading
          <div className="w-20 h-8" />
        )}
      </div>
    </header>
  );
} 