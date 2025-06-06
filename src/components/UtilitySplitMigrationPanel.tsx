"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
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
  Home, 
  ArrowRight,
  RefreshCw,
  Wrench
} from "lucide-react";
import { formatErrorForToast } from "@/lib/error-handling";

export function UtilitySplitMigrationPanel() {
  const { user } = useUser();
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  const migrationData = useQuery(
    api.migrations.checkMigrationStatus,
    user ? { userId: user.id } : "skip"
  );
  
  const migrateProperties = useMutation(api.migrations.migrateExistingPropertiesToHaveUnits);
  const createDefaultResponsibilities = useMutation(api.migrations.createDefaultUtilityResponsibilities);

  const handleDryRun = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      const result = await migrateProperties({ 
        userId: user.id, 
        dryRun: true 
      });
      setMigrationStatus(result);
      toast.info(result.message);
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsChecking(false);
    }
  };

  const handleMigration = async () => {
    if (!user) return;
    
    if (!confirm("Run migration to add default units to your properties? This will create a 'Main Unit' for properties without units.")) {
      return;
    }
    
    setIsMigrating(true);
    try {
      const result = await migrateProperties({ 
        userId: user.id, 
        dryRun: false 
      });
      
      toast.success(result.message);
      setMigrationStatus(result);
      
      // Auto-refresh migration data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsMigrating(false);
    }
  };

  if (!user) {
    return null;
  }

  const needsMigration = migrationData && !migrationData.migrationComplete;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Utility Split System Update
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {migrationData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Properties</p>
                    <p className="text-2xl font-bold">{migrationData.totalProperties}</p>
                  </div>
                  <Home className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Need Units</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {migrationData.propertiesWithoutUnits}
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
                    <p className="text-sm text-muted-foreground">Ready</p>
                    <p className="text-2xl font-bold text-green-600">
                      {migrationData.propertiesWithUnits}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Migration Status */}
        {migrationData && (
          <Alert className={migrationData.migrationComplete ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {migrationData.migrationComplete ? (
                "✅ All properties are ready for the new utility split system!"
              ) : (
                `⚠️ ${migrationData.propertiesWithoutUnits} propert${migrationData.propertiesWithoutUnits !== 1 ? 'ies' : 'y'} need${migrationData.propertiesWithoutUnits === 1 ? 's' : ''} to be updated for the new utility system.`
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        {migrationData && migrationData.totalProperties > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Migration Progress</span>
              <span>
                {migrationData.propertiesWithUnits} / {migrationData.totalProperties}
              </span>
            </div>
            <Progress 
              value={(migrationData.propertiesWithUnits / migrationData.totalProperties) * 100} 
              className="w-full"
            />
          </div>
        )}

        {/* Migration Status Details */}
        {migrationStatus && (
          <div className="space-y-3">
            <h4 className="font-medium">Migration Results:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Properties Found:</span>
                <p className="font-medium">{migrationStatus.totalProperties}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Need Updates:</span>
                <p className="font-medium">{migrationStatus.propertiesNeedingUnits}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Processed:</span>
                <p className="font-medium">{migrationStatus.propertiesProcessed}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Units Created:</span>
                <p className="font-medium">{migrationStatus.unitsCreated}</p>
              </div>
            </div>
            
            {migrationStatus.errors && migrationStatus.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-medium text-red-600">Errors:</h5>
                <div className="space-y-1 text-sm">
                  {migrationStatus.errors.map((error: string, index: number) => (
                    <p key={index} className="text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => window.location.reload()}
            disabled={isChecking || isMigrating}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>

          {needsMigration && (
            <>
              <Button
                onClick={handleDryRun}
                disabled={isChecking || isMigrating}
                variant="outline"
              >
                <Database className="w-4 h-4 mr-2" />
                {isChecking ? "Checking..." : "Preview Changes"}
              </Button>

              <Button
                onClick={handleMigration}
                disabled={isChecking || isMigrating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {isMigrating ? "Updating..." : "Run Migration"}
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>What this update does:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Creates a "Main Unit" for each property that doesn't have units</li>
              <li>Enables the new utility bill splitting system</li>
              <li>Prepares your properties for better lease and tenant management</li>
              <li>Maintains all existing data - this is a safe update</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}