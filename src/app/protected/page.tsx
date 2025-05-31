"use client";
import { useUser } from "@clerk/nextjs";

export default function ProtectedPage() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Redirecting to sign in...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Protected Page</h1>
      <p className="mb-2">You are signed in as <span className="font-mono text-blue-700">{user?.primaryEmailAddress?.emailAddress}</span></p>
      <p className="text-lg">This page is only accessible to authenticated users.</p>
    </div>
  );
} 