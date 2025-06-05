"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeaseUtilityResponsibilityForm } from "@/components/LeaseUtilityResponsibilityForm";
import { Id } from "@/../convex/_generated/dataModel";
import { Percent, X } from "lucide-react";

interface LeaseUtilitySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: Id<"leases">;
  propertyId: Id<"properties">;
  tenantName: string;
  userId: string;
}

export function LeaseUtilitySettingsDialog({
  open,
  onOpenChange,
  leaseId,
  propertyId,
  tenantName,
  userId,
}: LeaseUtilitySettingsDialogProps) {
  const [saved, setSaved] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Utility Responsibilities - {tenantName}
          </DialogTitle>
        </DialogHeader>
        <LeaseUtilityResponsibilityForm
          leaseId={leaseId}
          propertyId={propertyId}
          tenantName={tenantName}
          userId={userId}
          onSave={() => {
            setSaved(true);
            // Don't auto-close anymore - let user close manually
          }}
        />
        {saved && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              ✅ Utility settings saved successfully! You can continue editing or close this dialog.
            </p>
          </div>
        )}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}