/**
 * Listings Dashboard Component
 * Overview of all property listings across platforms
 */

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Building,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListingManager } from "./ListingManager";
import { getPlatformDisplayInfo } from "@/lib/listing-platforms";

interface ListingPublication {
  _id: Id<"listingPublications">;
  propertyId: Id<"properties">;
  platform: string;
  status: "pending" | "active" | "error" | "expired" | "paused";
  externalId?: string;
  externalUrl?: string;
  publishedAt?: string;
  errorMessage?: string;
  listingTitle?: string;
  monthlyRent?: number;
  createdAt: string;
}

interface Property {
  _id: Id<"properties">;
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent?: number;
}

export function ListingsDashboard() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<Id<"properties"> | null>(null);

  // Get platform display info
  const platformInfo = getPlatformDisplayInfo();
  const platformMap = Object.fromEntries(
    platformInfo.map(p => [p.platform, p])
  );

  // Convex queries
  const publications = useQuery(api.listingPublications.getUserPublications, 
    user ? { userId: user.id } : "skip"
  ) as ListingPublication[] | undefined;

  const stats = useQuery(api.listingPublications.getPublicationStats, 
    user ? { userId: user.id } : "skip"
  );

  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  ) as Property[] | undefined;

  // Filter publications
  const filteredPublications = publications?.filter(pub => {
    const matchesSearch = !searchTerm || 
      pub.listingTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.platform.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || pub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Group publications by property
  const publicationsByProperty = filteredPublications.reduce((acc, pub) => {
    const propertyId = pub.propertyId;
    if (!acc[propertyId]) {
      acc[propertyId] = [];
    }
    acc[propertyId].push(pub);
    return acc;
  }, {} as Record<string, ListingPublication[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "expired":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "paused":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Live",
      pending: "Publishing",
      error: "Failed",
      expired: "Expired",
      paused: "Paused",
    };
    return labels[status] || status;
  };

  const getProperty = (propertyId: Id<"properties">) => {
    return properties?.find(p => p._id === propertyId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Publishing</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.expired}</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Listing Publications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Live</option>
              <option value="pending">Publishing</option>
              <option value="error">Failed</option>
              <option value="expired">Expired</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Properties with Listings */}
          <div className="space-y-6">
            {Object.entries(publicationsByProperty).map(([propertyId, propertyPublications]) => {
              const property = getProperty(propertyId as Id<"properties">);
              if (!property) return null;

              return (
                <div key={propertyId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {property.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Manage Listings
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Manage Listings - {property.name}</DialogTitle>
                        </DialogHeader>
                        <ListingManager propertyId={property._id} />
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {propertyPublications.map((publication) => {
                      const platformDisplay = platformMap[publication.platform];
                      
                      return (
                        <div key={publication._id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            {platformDisplay?.logoUrl && (
                              <img 
                                src={platformDisplay.logoUrl} 
                                alt={platformDisplay.displayName}
                                className="h-5 w-5 rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {platformDisplay?.displayName || publication.platform}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(publication.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(publication.status)}
                              <Badge 
                                variant={
                                  publication.status === "active" ? "default" :
                                  publication.status === "error" ? "destructive" :
                                  "secondary"
                                }
                                className="text-xs"
                              >
                                {getStatusLabel(publication.status)}
                              </Badge>
                            </div>
                            
                            {publication.externalUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a 
                                  href={publication.externalUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {propertyPublications.some(pub => pub.status === "error" && pub.errorMessage) && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <strong>Errors:</strong> {propertyPublications
                        .filter(pub => pub.status === "error" && pub.errorMessage)
                        .map(pub => pub.errorMessage)
                        .join(', ')
                      }
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(publicationsByProperty).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No listings match your filters"
                  : "No listings published yet"
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}