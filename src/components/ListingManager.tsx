/**
 * Listing Manager Component
 * Main interface for publishing and managing property listings across platforms
 */

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ExternalLink, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Plus,
  Send,
  Eye,
  Settings,
  DollarSign,
  Calendar,
  Building,
  Map,
  Bed,
  Bath,
  Square,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getPlatformDisplayInfo } from "@/lib/listing-platforms";

interface Property {
  _id: Id<"properties">;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  monthlyRent?: number;
}

interface ListingPublication {
  _id: Id<"listingPublications">;
  platform: string;
  status: "pending" | "active" | "error" | "expired" | "paused";
  externalId?: string;
  externalUrl?: string;
  publishedAt?: string;
  errorMessage?: string;
  listingTitle?: string;
  monthlyRent?: number;
  availableDate?: string;
}

interface PublishProgress {
  isPublishing: boolean;
  currentPlatform?: string;
  completed: number;
  total: number;
  results: Record<string, any>;
  errors: Record<string, string>;
}

export function ListingManager({ propertyId }: { propertyId: Id<"properties"> }) {
  const { user } = useUser();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customRent, setCustomRent] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [publishProgress, setPublishProgress] = useState<PublishProgress>({
    isPublishing: false,
    completed: 0,
    total: 0,
    results: {},
    errors: {},
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get platform info
  const platformInfo = getPlatformDisplayInfo();

  // Convex queries
  const property = useQuery(api.properties.getProperty, 
    user && propertyId ? { id: propertyId, userId: user.id } : "skip"
  ) as Property | null | undefined;

  const publications = useQuery(api.listingPublications.getPropertyPublications, 
    propertyId ? { propertyId } : "skip"
  ) as ListingPublication[] | undefined;

  const userConnections = useQuery(api.platformTokens.getUserConnections, 
    user ? { userId: user.id } : "skip"
  );

  // Initialize form with property data
  useEffect(() => {
    if (property && !customTitle) {
      setCustomTitle(property.name);
      setCustomDescription(`Beautiful ${property.bedrooms} bedroom, ${property.bathrooms} bathroom property located at ${property.address}`);
      setCustomRent(property.monthlyRent?.toString() || "");
      setAvailableDate(new Date().toISOString().split('T')[0]);
    }
  }, [property, customTitle]);

  const getConnectedPlatforms = () => {
    if (!userConnections) return [];
    return userConnections
      .filter(conn => conn.isValid)
      .map(conn => conn.platform);
  };

  const getPublicationStatus = (platform: string) => {
    if (!publications) return null;
    return publications.find(pub => pub.platform === platform);
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (!property || !user || selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setPublishProgress({
      isPublishing: true,
      completed: 0,
      total: selectedPlatforms.length,
      results: {},
      errors: {},
    });

    try {
      const listingData = {
        title: customTitle || property.name,
        description: customDescription,
        monthlyRent: parseFloat(customRent) || property.monthlyRent || 0,
        availableDate: availableDate || new Date().toISOString(),
      };

      const response = await fetch('/api/listings/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          platforms: selectedPlatforms,
          listingData,
          publishImmediately: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPublishProgress(prev => ({
          ...prev,
          isPublishing: false,
          completed: selectedPlatforms.length,
          results: result.results || {},
          errors: result.errors || {},
        }));

        const successCount = Object.keys(result.results || {}).length;
        const errorCount = Object.keys(result.errors || {}).length;

        if (successCount > 0) {
          toast.success(`Successfully published to ${successCount} platform${successCount > 1 ? 's' : ''}`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to publish to ${errorCount} platform${errorCount > 1 ? 's' : ''}`);
        }
      } else {
        throw new Error(result.error || 'Failed to publish listings');
      }

    } catch (error) {
      console.error('Publishing error:', error);
      toast.error('Failed to publish listings');
      setPublishProgress(prev => ({
        ...prev,
        isPublishing: false,
      }));
    }
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: "Publishing...", variant: "secondary" },
      active: { label: "Live", variant: "default" },
      error: { label: "Failed", variant: "destructive" },
      expired: { label: "Expired", variant: "outline" },
      paused: { label: "Paused", variant: "secondary" },
    };
    return statusMap[status] || { label: status, variant: "outline" };
  };

  const connectedPlatforms = getConnectedPlatforms();

  if (!property) {
    return <div>Loading property...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Property Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {property.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Map className="h-4 w-4" />
              {property.address}
            </div>
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {property.bedrooms} bed
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms} bath
            </div>
            {property.squareFeet && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                {property.squareFeet} sq ft
              </div>
            )}
          </div>
          {property.monthlyRent && (
            <div className="flex items-center gap-1 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              ${property.monthlyRent.toLocaleString()}/month
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Platforms</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which platforms to publish this property to
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {platformInfo.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform.platform);
            const publication = getPublicationStatus(platform.platform);
            const isSelected = selectedPlatforms.includes(platform.platform);

            return (
              <div key={platform.platform} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handlePlatformToggle(platform.platform)}
                    disabled={!isConnected || publishProgress.isPublishing}
                  />
                  {platform.logoUrl && (
                    <img 
                      src={platform.logoUrl} 
                      alt={platform.displayName}
                      className="h-6 w-6 rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{platform.displayName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {platform.pricing.freeListings > 0 
                        ? `${platform.pricing.freeListings} free listing${platform.pricing.freeListings > 1 ? 's' : ''}`
                        : `$${platform.pricing.paidListingCost}/month`
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {publication && (
                    <div className="flex items-center gap-2">
                      <Badge variant={formatStatus(publication.status).variant}>
                        {formatStatus(publication.status).label}
                      </Badge>
                      {publication.externalUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={publication.externalUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {!isConnected && (
                    <Badge variant="outline">Not Connected</Badge>
                  )}
                </div>
              </div>
            );
          })}

          {connectedPlatforms.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No platforms connected. Please connect to platforms in Settings to start publishing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Listing Details */}
      <Card>
        <CardHeader>
          <CardTitle>Listing Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Listing Title</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter listing title"
              />
            </div>
            <div>
              <Label htmlFor="rent">Monthly Rent</Label>
              <Input
                id="rent"
                type="number"
                value={customRent}
                onChange={(e) => setCustomRent(e.target.value)}
                placeholder="2500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your property..."
              rows={3}
            />
          </div>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="availableDate">Available Date</Label>
                <Input
                  id="availableDate"
                  type="date"
                  value={availableDate}
                  onChange={(e) => setAvailableDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publishing Progress */}
      {publishProgress.isPublishing && (
        <Card>
          <CardHeader>
            <CardTitle>Publishing Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress 
              value={(publishProgress.completed / publishProgress.total) * 100} 
              className="h-2"
            />
            <p className="text-sm text-muted-foreground">
              {publishProgress.currentPlatform 
                ? `Publishing to ${publishProgress.currentPlatform}...`
                : `${publishProgress.completed} of ${publishProgress.total} platforms completed`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Publish Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePublish}
          disabled={selectedPlatforms.length === 0 || publishProgress.isPublishing || !customTitle.trim()}
          size="lg"
        >
          {publishProgress.isPublishing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}