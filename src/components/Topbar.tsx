"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import Link from "next/link";

export function Topbar() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-900 bg-zinc-950">
      <div className="flex-1 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search properties..."
          className="bg-zinc-900 text-zinc-100 px-4 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-96"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-zinc-900 text-zinc-400">
          <Bell size={20} />
          {/* Notification dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        {isLoaded && isSignedIn ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <div className="flex gap-2">
            <Link href="/sign-in" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sign in</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded border border-zinc-700 hover:bg-zinc-700">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
} 