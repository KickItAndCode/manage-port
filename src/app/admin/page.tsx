"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Database, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user } = useUser();
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const clearAllData = useMutation(api.admin.clearAllData);
  const dataCounts = useQuery(api.admin.getDataCounts, 
    user?.id ? { userId: user.id } : "skip"
  );

  const handleClearDatabase = async () => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    if (confirmationPhrase !== "DELETE ALL DATA") {
      toast.error("Confirmation phrase must be exactly 'DELETE ALL DATA'");
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearAllData({
        userId: user.id,
        confirmationPhrase,
      });

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} records`, {
          description: "All your data has been permanently removed from the database",
          duration: 5000,
        });
        setConfirmationPhrase("");
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error clearing database:", error);
      toast.error("Failed to clear database", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        duration: 5000,
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Please sign in to access the admin panel</p>
        </div>
      </div>
    );
  }

  const isConfirmationValid = confirmationPhrase === "DELETE ALL DATA";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Admin Panel
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administrative tools and database management
        </p>
      </div>

      {/* Data Overview Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Overview
          </CardTitle>
          <CardDescription>
            Current data stored in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataCounts ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(dataCounts.breakdown).map(([key, count]) => (
                  <div key={key} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center pt-4 border-t">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Total Records: {dataCounts.totalCount}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading data overview...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently delete your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> The following action will permanently delete ALL of your data including properties, leases, documents, utility bills, and settings. This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="confirmation" className="text-sm font-medium">
                Type <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-600 dark:text-red-400">DELETE ALL DATA</code> to confirm:
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="mt-1 font-mono"
                disabled={isClearing}
              />
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={!isConfirmationValid || isClearing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isClearing ? "Clearing Database..." : "Clear All Database Data"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600 dark:text-red-400">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All properties and units</li>
                      <li>All leases and tenant information</li>
                      <li>All documents and folders</li>
                      <li>All utility bills and charges</li>
                      <li>All payment records</li>
                      <li>All settings and configurations</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                      Total records to be deleted: {dataCounts?.totalCount || 0}
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearDatabase}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Yes, delete everything
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>
            How to use the admin panel safely
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Database Clear Function:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Only deletes data associated with your user account</li>
              <li>Requires exact confirmation phrase for safety</li>
              <li>Deletes records in proper dependency order to avoid conflicts</li>
              <li>Provides detailed breakdown of what was deleted</li>
              <li>Cannot be undone - make sure you have backups if needed</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">When to use:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Testing scenarios where you need a clean database</li>
              <li>Development/staging environment cleanup</li>
              <li>Complete account reset</li>
              <li><strong>NOT recommended for production data</strong></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}