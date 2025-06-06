"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { formatErrorForToast } from "@/lib/error-handling";

export function QuickCleanup() {
  const { user } = useUser();
  const cleanupDuplicates = useMutation(api.migrate.cleanupDuplicateLeaseDocuments);

  const runCleanup = async () => {
    if (!user) return;
    
    try {
      // First check what we would remove
      const dryRun = await cleanupDuplicates({ 
        userId: user.id, 
        dryRun: true 
      });
      
      console.log("Dry run result:", dryRun);
      
      if (dryRun.duplicatesFound === 0) {
        toast.success("No duplicate documents found!");
        return;
      }
      
      // Actually remove duplicates
      const result = await cleanupDuplicates({ 
        userId: user.id, 
        dryRun: false 
      });
      
      toast.success(`Cleaned up ${result.duplicatesRemoved} duplicate documents!`);
      console.log("Cleanup result:", result);
      
    } catch (error) {
      toast.error(formatErrorForToast(error));
      console.error("Cleanup error:", error);
    }
  };

  if (!user) {
    return <div>Please sign in first</div>;
  }

  return (
    <div className="p-4">
      <Button onClick={runCleanup} variant="destructive">
        Clean Up Duplicate Lease Documents
      </Button>
    </div>
  );
}