"use client";
import { useClerk, useUser } from "@clerk/nextjs";

export default function Home() {
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Hello World</h1>
      <p className="text-lg mb-6">Welcome to Manage Port!</p>
      {isSignedIn ? (
        <>
          <p className="mb-2">Signed in as {user?.primaryEmailAddress?.emailAddress}</p>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </>
      ) : (
        <a
          href="/sign-in"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in
        </a>
      )}
    </div>
  );
}
