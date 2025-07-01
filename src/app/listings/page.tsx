/**
 * Listings Page - Main interface for managing property listings
 */

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2,
  Settings,
  BarChart3,
  Plus,
  ExternalLink,
  Wand2
} from "lucide-react";
import { ListingsDashboard } from "@/components/ListingsDashboard";
import { PlatformConnections } from "@/components/PlatformConnections";
import { getPlatformDisplayInfo } from "@/lib/listing-platforms";
import Link from "next/link";

export default function ListingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Get user properties for quick access
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );

  const stats = useQuery(api.listingPublications.getPublicationStats, 
    user ? { userId: user.id } : "skip"
  );

  const userConnections = useQuery(api.platformTokens.getUserConnections, 
    user ? { userId: user.id } : "skip"
  );

  // Get platform info
  const platformInfo = getPlatformDisplayInfo();
  const connectedPlatforms = userConnections?.filter(conn => conn.isValid)?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Listing Management</h1>
            <p className="text-muted-foreground">
              Publish and manage your property listings across multiple platforms
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/listings/enhance">
                <Wand2 className="h-4 w-4 mr-2" />
                AI Enhancement
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/properties">
                <Building2 className="h-4 w-4 mr-2" />
                View Properties
              </Link>
            </Button>
            {properties && properties.length > 0 && (
              <Button asChild>
                <Link href="/properties">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="text-2xl font-bold">{properties?.length || 0}</p>
                  </div>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Connected Platforms</p>
                    <p className="text-2xl font-bold">{connectedPlatforms}</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Platforms</p>
                    <p className="text-2xl font-bold">{platformInfo.length}</p>
                  </div>
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="platforms">
              <Settings className="h-4 w-4 mr-2" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="properties">
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {stats && stats.total > 0 ? (
              <ListingsDashboard />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Welcome to Listing Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Get started by connecting to listing platforms and publishing your first property.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Connect Platforms</p>
                        <p className="text-sm text-muted-foreground">
                          Link your accounts with listing platforms like Apartments.com
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Add Properties</p>
                        <p className="text-sm text-muted-foreground">
                          Create property listings with photos and details
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Publish & Manage</p>
                        <p className="text-sm text-muted-foreground">
                          Publish to multiple platforms and track performance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button onClick={() => setActiveTab("platforms")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Connect Platforms
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/properties">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Property
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <PlatformConnections />
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            {properties && properties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => (
                  <Card key={property._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{property.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{property.bedrooms} bed</span>
                        <span>{property.bathrooms} bath</span>
                        {property.squareFeet && <span>{property.squareFeet} sq ft</span>}
                      </div>
                      
                      {property.monthlyRent && (
                        <p className="font-semibold text-green-600">
                          ${property.monthlyRent.toLocaleString()}/month
                        </p>
                      )}

                      <Button className="w-full" size="sm" asChild>
                        <Link href={`/properties/${property._id}`}>
                          Manage Listings
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first property to start creating listings
                  </p>
                  <Button asChild>
                    <Link href="/properties">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}