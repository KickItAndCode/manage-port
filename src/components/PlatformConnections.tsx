/**
 * Platform Connections Component
 * Manages OAuth connections to listing platforms
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Settings,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPlatformDisplayInfo } from "@/lib/listing-platforms";

interface PlatformConnection {
  _id: string;
  platform: string;
  isValid: boolean;
  expiresAt?: number;
  platformAccountName?: string;
  platformUserEmail?: string;
  issuedAt: string;
  lastRefreshedAt?: string;
}

export function PlatformConnections() {
  const { user } = useUser();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Get platform display info
  const platformInfo = getPlatformDisplayInfo();

  // Convex queries
  const connections = useQuery(api.platformTokens.getUserConnections, 
    user ? { userId: user.id } : "skip"
  ) as PlatformConnection[] | undefined;

  const deleteConnection = useMutation(api.platformTokens.deleteConnection);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (platform: string) => {
    if (!user) return;
    
    setConnecting(platform);
    try {
      // Make API call to initiate OAuth flow
      const response = await fetch(`/api/oauth/${platform}/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow');
      }

      const { authUrl } = await response.json();
      
      // Redirect to OAuth authorization
      window.location.href = authUrl;

    } catch (error) {
      console.error('OAuth initiation failed:', error);
      toast.error('Failed to connect to platform');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!user) return;

    try {
      await deleteConnection({
        userId: user.id,
        platform,
      });
      
      toast.success('Platform disconnected');
    } catch (error) {
      console.error('Disconnection failed:', error);
      toast.error('Failed to disconnect platform');
    }
  };

  const getConnectionStatus = (platform: string) => {
    if (!connections) return null;
    return connections.find(conn => conn.platform === platform);
  };

  const isTokenExpiringSoon = (connection: PlatformConnection) => {
    if (!connection.expiresAt) return false;
    const now = Date.now();
    const expiresIn = connection.expiresAt - now;
    const hoursUntilExpiry = expiresIn / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  const isTokenExpired = (connection: PlatformConnection) => {
    if (!connection.expiresAt) return false;
    return Date.now() > connection.expiresAt;
  };

  const formatExpiryDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Platform Connections
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your listing platforms to publish properties automatically
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {platformInfo.map((platform) => {
          const connection = getConnectionStatus(platform.platform);
          const isConnected = connection && connection.isValid;
          const isExpiring = connection && isTokenExpiringSoon(connection);
          const isExpired = connection && isTokenExpired(connection);

          return (
            <div key={platform.platform} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {platform.logoUrl && (
                    <img 
                      src={platform.logoUrl} 
                      alt={platform.displayName}
                      className="h-8 w-8 rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{platform.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {platform.pricing.freeListings > 0 
                        ? `${platform.pricing.freeListings} free listing${platform.pricing.freeListings > 1 ? 's' : ''}`
                        : `$${platform.pricing.paidListingCost}/month`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(platform.platform)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      {connection && !connection.isValid && (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform.platform)}
                        disabled={connecting === platform.platform || !platform.isAvailable}
                      >
                        {connecting === platform.platform ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Connect
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Connection details */}
              {connection && (
                <div className="ml-11 space-y-2">
                  {connection.platformAccountName && (
                    <p className="text-sm text-muted-foreground">
                      Account: {connection.platformAccountName}
                    </p>
                  )}
                  
                  {connection.expiresAt && (
                    <p className="text-sm text-muted-foreground">
                      Expires: {formatExpiryDate(connection.expiresAt)}
                    </p>
                  )}

                  {isExpiring && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Connection expires soon. It will refresh automatically.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isExpired && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Connection has expired. Please reconnect to continue listing.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {platform.platform !== platformInfo[platformInfo.length - 1].platform && (
                <Separator className="mt-4" />
              )}
            </div>
          );
        })}

        {/* Connection status summary */}
        {connections && connections.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Connection Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Connections:</span>
                <span className="ml-2 font-medium">{connections.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Active:</span>
                <span className="ml-2 font-medium text-green-600">
                  {connections.filter(c => c.isValid).length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-6 p-4 border border-dashed rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Getting Started
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Connect to platforms to automatically sync your property listings</li>
            <li>• Each platform has different requirements and pricing</li>
            <li>• Connections are automatically refreshed when needed</li>
            <li>• You can disconnect platforms at any time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}