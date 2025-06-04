"use client";
import { SignIn } from "@clerk/nextjs";
import { Building2, Home, Key, Shield, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export default function SignInPage() {
  const { theme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Detect system dark mode for Playwright tests
  const [systemTheme, setSystemTheme] = useState<string>('light');
  
  useEffect(() => {
    // Check if browser prefers dark mode (for Playwright tests)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  useEffect(() => {
    // Add a small delay to prevent flash of loading content
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Use system theme if theme is not set (for Playwright tests)
  const effectiveTheme = theme || systemTheme;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='gray' stroke-width='0.5' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo and branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 group hover:scale-110 transition-transform">
            <Building2 className="w-8 h-8 text-primary group-hover:rotate-12 transition-transform" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your properties</p>
        </div>

        {/* Sign in card */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-50 animate-pulse" />
          
          {/* Card content */}
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            {!isLoaded ? (
              /* Loading skeleton */
              <div className="space-y-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
                <div className="h-10 bg-primary/20 rounded"></div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 h-px bg-muted"></div>
                  <div className="h-4 bg-muted rounded w-8"></div>
                  <div className="flex-1 h-px bg-muted"></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </div>
            ) : (
              <SignIn 
                forceRedirectUrl="/dashboard"
                appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: effectiveTheme === "dark" 
                    ? "!bg-white !hover:bg-gray-100 !border-gray-300 !text-gray-900 !font-semibold !shadow-lg" 
                    : "!bg-white !hover:bg-gray-50 !border-gray-200 !text-gray-900 !font-semibold",
                  socialButtonsBlockButtonText: effectiveTheme === "dark" ? "!text-gray-900 !font-semibold" : "!text-gray-900",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
                  footerActionLink: "text-primary hover:text-primary/80",
                  formFieldInput: effectiveTheme === "dark" 
                    ? "bg-white/5 border-white/20 text-white placeholder:text-white/60" 
                    : "bg-white border-gray-200 text-gray-900",
                  formFieldLabel: effectiveTheme === "dark" ? "text-white font-medium" : "text-gray-900",
                  identityPreviewEditButton: "text-primary hover:text-primary/80",
                  formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
                  dividerLine: effectiveTheme === "dark" ? "bg-white/20" : "bg-gray-200",
                  dividerText: effectiveTheme === "dark" ? "text-white/70" : "text-gray-500",
                  formFieldError: "text-destructive",
                  footerActionText: effectiveTheme === "dark" ? "text-white/70" : "text-gray-500",
                  identityPreviewText: "text-muted-foreground",
                  identityPreviewEditButtonIcon: "text-muted-foreground",
                },
                variables: {
                  colorPrimary: effectiveTheme === "dark" ? "#00DDEB" : "#21093a",
                  colorBackground: effectiveTheme === "dark" ? "#23272F" : "#ffffff",
                  colorText: effectiveTheme === "dark" ? "#F5F5F5" : "#0d0d19",
                  colorTextSecondary: effectiveTheme === "dark" ? "#C0C0C0" : "#646983",
                  colorInputBackground: effectiveTheme === "dark" ? "#181A20" : "#ffffff",
                  colorInputText: effectiveTheme === "dark" ? "#F5F5F5" : "#0d0d19",
                  borderRadius: "0.625rem",
                }
              }}
              />
            )}
          </div>
        </div>

        {/* Features showcase */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-md w-full">
          <div className="text-center group cursor-pointer">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl mb-2 group-hover:bg-muted/80 transition-colors">
              <Home className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground">Manage Properties</p>
          </div>
          <div className="text-center group cursor-pointer">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl mb-2 group-hover:bg-muted/80 transition-colors">
              <Shield className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground">Secure Platform</p>
          </div>
          <div className="text-center group cursor-pointer">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted/50 rounded-xl mb-2 group-hover:bg-muted/80 transition-colors">
              <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground">Smart Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}