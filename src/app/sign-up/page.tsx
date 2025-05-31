"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8 transition-colors duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-8 flex flex-col items-center w-full max-w-md">
        <SignUp />
      </div>
    </div>
  );
} 