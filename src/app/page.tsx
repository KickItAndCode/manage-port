"use client";
import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, ArrowRight, LogOut, FileText, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { signOut } = useClerk();
  const { isSignedIn, user, isLoaded } = useUser();

  // Don't auto-redirect - let users choose to go to dashboard

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ManagePort
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your comprehensive real estate portfolio management solution
          </p>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-2xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">
              {isSignedIn ? `Welcome back, ${user?.firstName || 'User'}!` : 'Get Started'}
            </CardTitle>
            <CardDescription className="text-base">
              {isSignedIn 
                ? 'Manage your properties, track leases, and monitor utilities all in one place.'
                : 'Sign in to start managing your real estate portfolio'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSignedIn ? (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg" className="flex-1">
                    <Link href="/dashboard" className="flex items-center gap-2">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => signOut()}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
                
                {/* Quick Links for signed in users */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/properties">Properties</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/leases">Leases</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/utilities">Utilities</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/documents">Documents</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="flex-1">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="flex-1">
                  <Link href="/sign-up">Create Account</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Preview */}
        {!isSignedIn && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <Card className="border-0 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Building className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Property Management</h3>
                <p className="text-xs text-muted-foreground mt-1">Track all your properties in one place</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Lease Tracking</h3>
                <p className="text-xs text-muted-foreground mt-1">Monitor lease agreements and renewals</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-card/30 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Utility Management</h3>
                <p className="text-xs text-muted-foreground mt-1">Keep track of utility costs and providers</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}