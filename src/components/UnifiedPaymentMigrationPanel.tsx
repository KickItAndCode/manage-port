"use client";
import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Database,
  ArrowRight
} from "lucide-react";

export function UnifiedPaymentMigrationPanel() {
  const { user } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // Mutations
  // const runMigration = useMutation(api.migrations.migrateToUnifiedPaymentSystem);

  const handleDryRun = async () => {
    if (!user) return;
    
    setIsRunning(true);
    try {
      // const result = await runMigration({
      //   userId: user.id,
      //   dryRun: true,
      // });
      // setDryRunResult(result);
      toast.success("Migration function not available");
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsRunning(false);
    }
  };

  const handleActualMigration = async () => {
    if (!user) return;
    
    setIsRunning(true);
    try {
      // const result = await runMigration({
      //   userId: user.id,
      //   dryRun: false,
      // });
      // setMigrationResult(result);
      toast.success("Migration function not available");
    } catch (error: any) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsRunning(false);
    }
  };

  const renderMigrationSummary = (result: any, isDryRun = false) => {
    if (!result) return null;

    const { billMigration, chargeMigration, summary } = result;

    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {isDryRun ? "Migration Preview" : "Migration Complete"}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Utility Bills Migration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Utility Bills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Bills:</span>
                <Badge variant="outline">{billMigration.totalBills}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isDryRun ? "Would Migrate:" : "Migrated:"}
                </span>
                <Badge variant={billMigration.billsToMigrate > 0 ? "default" : "secondary"}>
                  {isDryRun ? billMigration.billsToMigrate : billMigration.billsProcessed}
                </Badge>
              </div>
              {billMigration.errors.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-destructive">Errors:</span>
                  <Badge variant="destructive">{billMigration.errors.length}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenant Charges Migration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tenant Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Charges:</span>
                <Badge variant="outline">{chargeMigration.totalCharges}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {isDryRun ? "Would Migrate:" : "Migrated:"}
                </span>
                <Badge variant={chargeMigration.chargesToMigrate > 0 ? "default" : "secondary"}>
                  {isDryRun ? chargeMigration.chargesToMigrate : chargeMigration.chargesProcessed}
                </Badge>
              </div>
              {chargeMigration.errors.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-destructive">Errors:</span>
                  <Badge variant="destructive">{chargeMigration.errors.length}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overall Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overall Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Items:</span>
                <span className="ml-2 font-medium">{summary.totalItems}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {isDryRun ? "Items to Migrate:" : "Items Processed:"}
                </span>
                <span className="ml-2 font-medium">
                  {isDryRun ? summary.itemsToMigrate : summary.itemsProcessed}
                </span>
              </div>
              {summary.totalErrors > 0 && (
                <div className="col-span-2">
                  <span className="text-destructive">Total Errors:</span>
                  <span className="ml-2 font-medium text-destructive">{summary.totalErrors}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sample Data Preview (for dry run) */}
        {isDryRun && (billMigration.sampleBill || chargeMigration.sampleCharge) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sample Data Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {billMigration.sampleBill && (
                <div className="text-xs space-y-1">
                  <div className="font-medium">Sample Bill Migration:</div>
                  <div className="pl-2 text-muted-foreground">
                    <div>Utility: {billMigration.sampleBill.utilityType}</div>
                    <div>Old fields: isPaid={billMigration.sampleBill.hasOldFields.isPaid ? 'true' : 'false'}</div>
                    <div>New fields needed: landlordPaidUtilityCompany={billMigration.sampleBill.missingNewFields.landlordPaidUtilityCompany ? 'true' : 'false'}</div>
                  </div>
                </div>
              )}
              
              {chargeMigration.sampleCharge && (
                <div className="text-xs space-y-1">
                  <div className="font-medium">Sample Charge Migration:</div>
                  <div className="pl-2 text-muted-foreground">
                    <div>Tenant: {chargeMigration.sampleCharge.tenantName}</div>
                    <div>Old fields: isPaid={chargeMigration.sampleCharge.hasOldFields.isPaid ? 'true' : 'false'}</div>
                    <div>New fields needed: fullyPaid={chargeMigration.sampleCharge.missingNewFields.fullyPaid ? 'true' : 'false'}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Details */}
        {(billMigration.errors.length > 0 || chargeMigration.errors.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-destructive">Migration Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                {billMigration.errors.map((error: string, index: number) => (
                  <div key={index} className="text-destructive">
                    Bill Error: {error}
                  </div>
                ))}
                {chargeMigration.errors.map((error: string, index: number) => (
                  <div key={index} className="text-destructive">
                    Charge Error: {error}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Please sign in to run the migration.</p>
        </CardContent>
      </Card>
    );
  }

  const hasItemsToMigrate = dryRunResult && 
    (dryRunResult.summary.itemsToMigrate > 0);

  const migrationComplete = migrationResult && 
    (migrationResult.summary.itemsProcessed > 0 || migrationResult.summary.itemsToMigrate === 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Unified Payment System Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This migration updates your utility bills and tenant charges to use the new unified payment system. 
              The new system clearly distinguishes between landlord payments to utility companies and tenant payments to landlords.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="text-sm">
              <strong>What this migration does:</strong>
              <ul className="mt-2 ml-4 space-y-1 text-muted-foreground">
                <li>• Updates utility bills: <code>isPaid</code> → <code>landlordPaidUtilityCompany</code></li>
                <li>• Updates tenant charges: <code>isPaid</code> → <code>fullyPaid</code></li>
                <li>• Adds <code>tenantPaidAmount</code> tracking for partial payments</li>
                <li>• Preserves all existing payment dates and amounts</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDryRun}
                disabled={isRunning}
                variant="outline"
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Info className="w-4 h-4 mr-2" />
                )}
                Preview Migration (Dry Run)
              </Button>

              {dryRunResult && (
                <Button
                  onClick={handleActualMigration}
                  disabled={isRunning || !hasItemsToMigrate}
                  className="bg-primary"
                >
                  {isRunning ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Run Migration
                  {hasItemsToMigrate && (
                    <Badge variant="secondary" className="ml-2">
                      {dryRunResult.summary.itemsToMigrate} items
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>

          {migrationComplete && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Migration completed successfully! Your utility billing system now uses the unified payment tracking.
              </AlertDescription>
            </Alert>
          )}

          {dryRunResult && !hasItemsToMigrate && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No migration needed. Your data is already using the unified payment system.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {dryRunResult && renderMigrationSummary(dryRunResult, true)}
      {migrationResult && renderMigrationSummary(migrationResult, false)}
    </div>
  );
}