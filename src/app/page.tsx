"use client";
import { useClerk, useUser } from "@clerk/nextjs";

export default function Home() {
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 transition-colors duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-xl">
        <h1 className="text-4xl font-bold mb-4">Hello World</h1>
        <p className="text-lg mb-6">Welcome to Manage Port!</p>
        {isSignedIn ? (
          <>
            <p className="mb-2">Signed in as <span className="font-mono text-primary">{user?.primaryEmailAddress?.emailAddress}</span></p>
            <button
              className="px-4 py-2 bg-destructive text-white rounded hover:bg-destructive/90 transition-colors duration-200"
              onClick={() => signOut()}
            >
              Sign out
            </button>
          </>
        ) : (
          <a
            href="/sign-in"
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors duration-200"
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}
