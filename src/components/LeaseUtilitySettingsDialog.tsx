"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeaseUtilityResponsibilityForm } from "@/components/LeaseUtilityResponsibilityForm";
import { Id } from "@/../convex/_generated/dataModel";
import { Percent } from "lucide-react";

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
            // Close dialog after successful save
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}