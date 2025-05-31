"use client";
import { useUser } from "@clerk/nextjs";

export default function ProtectedPage() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8 transition-colors duration-300"><div className="bg-card border border-border rounded-2xl shadow-xl p-8 flex flex-col items-center w-full max-w-md">Loading...</div></div>;
  if (!isSignedIn) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8 transition-colors duration-300"><div className="bg-card border border-border rounded-2xl shadow-xl p-8 flex flex-col items-center w-full max-w-md">Redirecting to sign in...</div></div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 transition-colors duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-xl">
        <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
        <p className="mb-2">You are signed in as <span className="font-mono text-primary">{user?.primaryEmailAddress?.emailAddress}</span></p>
        <p className="text-lg">This page is only accessible to authenticated users.</p>
      </div>
    </div>
  );
} 