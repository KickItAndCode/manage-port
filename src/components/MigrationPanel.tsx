"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  AlertCircle, 
  Database, 
  FileText, 
  ArrowRight,
  Trash2
} from "lucide-react";
import { formatErrorForToast } from "@/lib/error-handling";

export function MigrationPanel() {
  const { user } = useUser();
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  
  const validateMigration = useMutation(api.migrate.validateMigration);
  const migrateLegacyDocs = useMutation(api.migrate.migrateLegacyLeaseDocuments);
  const cleanupLegacy = useMutation(api.migrate.cleanupLegacyLeaseDocuments);
  const cleanupDuplicates = useMutation(api.migrate.cleanupDuplicateLeaseDocuments);

  const handleValidation = async () => {
    if (!user) return;
    
    setIsValidating(true);
    try {
      const status = await validateMigration({ userId: user.id });
      setMigrationStatus(status);
      toast.success("Migration status validated");
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsValidating(false);
    }
  };

  const handleMigration = async (dryRun = false) => {
    if (!user) return;
    
    setIsMigrating(true);
    try {
      const result = await migrateLegacyDocs({ 
        userId: user.id, 
        dryRun 
      });
      
      if (dryRun) {
        toast.info(`Dry run complete: ${result.summary.migrated} documents would be migrated`);
      } else {
        toast.success(`Migration complete: ${result.summary.migrated} documents migrated`);
        // Refresh status after migration
        handleValidation();
      }
      
      console.log("Migration result:", result);
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCleanup = async () => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to remove legacy document references? This cannot be undone.")) {
      return;
    }
    
    setIsCleaning(true);
    try {
      const result = await cleanupLegacy({ 
        userId: user.id, 
        confirmCleanup: true 
      });
      
      toast.success(`Cleanup complete: ${result.cleaned} legacy references removed`);
      handleValidation(); // Refresh status
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDuplicateCleanup = async (dryRun = false) => {
    if (!user) return;
    
    setIsCleaningDuplicates(true);
    try {
      const result = await cleanupDuplicates({ 
        userId: user.id, 
        dryRun 
      });
      
      if (dryRun) {
        toast.info(`Found ${result.duplicatesFound} duplicate documents that would be removed`);
      } else {
        toast.success(`Cleanup complete: ${result.duplicatesRemoved} duplicate documents removed`);
      }
      
      console.log("Duplicate cleanup result:", result);
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Legacy Document Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {migrationStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leases</p>
                    <p className="text-2xl font-bold">{migrationStatus.totalLeases}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Legacy Documents</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {migrationStatus.leasesWithLegacyDocs}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Modern Documents</p>
                    <p className="text-2xl font-bold text-green-600">
                      {migrationStatus.leasesWithNewDocs}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Migration Status */}
        {migrationStatus && (
          <Alert className={migrationStatus.migrationComplete ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {migrationStatus.migrationComplete ? (
                "✅ Migration complete! All lease documents are using the modern system."
              ) : (
                `⚠️ ${migrationStatus.leasesWithLegacyDocs} lease(s) still using legacy document storage.`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        {migrationStatus && migrationStatus.totalLeases > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Migration Progress</span>
              <span>
                {migrationStatus.leasesWithNewDocs} / {migrationStatus.totalLeases}
              </span>
            </div>
            <Progress 
              value={(migrationStatus.leasesWithNewDocs / migrationStatus.totalLeases) * 100} 
              className="w-full"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleValidation}
            disabled={isValidating}
            variant="outline"
          >
            {isValidating ? "Checking..." : "Check Migration Status"}
          </Button>

          {migrationStatus && !migrationStatus.migrationComplete && (
            <>
              <Button
                onClick={() => handleMigration(true)}
                disabled={isMigrating}
                variant="outline"
              >
                {isMigrating ? "Running..." : "Dry Run Migration"}
              </Button>

              <Button
                onClick={() => handleMigration(false)}
                disabled={isMigrating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {isMigrating ? "Migrating..." : "Run Migration"}
              </Button>
            </>
          )}

          {migrationStatus && migrationStatus.migrationComplete && migrationStatus.leasesWithLegacyDocs > 0 && (
            <Button
              onClick={handleCleanup}
              disabled={isCleaning}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isCleaning ? "Cleaning..." : "Remove Legacy References"}
            </Button>
          )}

          <Button
            onClick={() => handleDuplicateCleanup(true)}
            disabled={isCleaningDuplicates}
            variant="outline"
          >
            {isCleaningDuplicates ? "Checking..." : "Check for Duplicates"}
          </Button>

          <Button
            onClick={() => handleDuplicateCleanup(false)}
            disabled={isCleaningDuplicates}
            variant="destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isCleaningDuplicates ? "Cleaning..." : "Remove Duplicates"}
          </Button>
        </div>

        {/* Legacy Documents List */}
        {migrationStatus && migrationStatus.legacyDocuments.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Legacy Documents to Migrate:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {migrationStatus.legacyDocuments.map((doc: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{doc.tenantName}</span>
                  <Badge variant="outline">Legacy</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Migration Steps:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Click "Check Migration Status" to see current state</li>
              <li>Run "Dry Run Migration" to preview changes</li>
              <li>Click "Run Migration" to move legacy documents to new system</li>
              <li>After verifying everything works, "Remove Legacy References" to clean up</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}