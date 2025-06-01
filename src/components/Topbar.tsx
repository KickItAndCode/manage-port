"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { Bell, Sun, Moon } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { isSignedIn, isLoaded } = useUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card text-foreground shadow-md transition-colors duration-300 md:ml-0 ml-16">
      <div className="flex-1 flex items-center gap-4">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-4">
        {mounted && (
          <button
            className="p-2 rounded-full hover:bg-muted/60 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
        <button className="relative p-2 rounded-full hover:bg-muted/60 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200">
          <Bell size={20} />
          {/* Notification dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        {isLoaded && isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <div className="flex gap-2">
            <Link href="/sign-in" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors duration-200">Sign in</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-muted text-foreground rounded border border-border hover:bg-muted/70 transition-colors duration-200">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
} 