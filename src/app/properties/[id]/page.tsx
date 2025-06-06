"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  Zap, 
  Phone,
  Mail,
  ExternalLink,
  Bed,
  Bath,
  Square,
  Tag,
  Edit,
  Plus,
  FileUp,
  UserPlus,
  Archive,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { useMutation } from "convex/react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { PropertyImageGallery } from "@/components/PropertyImageGallery";
import { PropertyImageUpload } from "@/components/PropertyImageUpload";
import { UnitList } from "@/components/UnitList";
import { UnitForm } from "@/components/UnitForm";
import { BulkUnitCreator } from "@/components/BulkUnitCreator";
import { UniversalUtilityAllocation } from "@/components/UniversalUtilityAllocation";
import { TenantStatementGenerator } from "@/components/TenantStatementGenerator";

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const propertyId = params?.id as string;
  const [showCapEx, setShowCapEx] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [bulkUnitDialogOpen, setBulkUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [showExpiredLeases, setShowExpiredLeases] = useState(false);
  
  const updateProperty = useMutation(api.properties.updateProperty);
  const addUnit = useMutation(api.units.addUnit);
  const updateUnit = useMutation(api.units.updateUnit);
  const bulkCreateUnits = useMutation(api.units.bulkCreateUnits);

  // Validate propertyId - it should not be a storage ID (starts with kg, jt, etc.) or URL
  const isValidPropertyId = propertyId && 
    !propertyId.startsWith('http') && 
    !propertyId.startsWith('kg') && 
    !propertyId.startsWith('jt') && 
    propertyId.length > 10;

  const property = useQuery(
    api.properties.getProperty,
    user && isValidPropertyId ? { id: propertyId as any, userId: user.id } : "skip"
  );
  const leases = useQuery(
    api.leases.getLeases,
    user && isValidPropertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const documents = useQuery(
    api.documents.getDocuments,
    user && isValidPropertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const propertyImages = useQuery(
    api.propertyImages.getPropertyImages,
    user && isValidPropertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const propertyWithUnits = useQuery(
    api.properties.getPropertyWithUnits,
    user && isValidPropertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };


  const getLeaseStatusBadge = (status: string, endDate?: string) => {
    if (status === "active" && endDate) {
      const daysLeft = Math.floor((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 60 && daysLeft >= 0) {
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={status} variant="compact" />
            <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">
              Expires in {daysLeft} days
            </Badge>
          </div>
        );
      }
    }
    return <StatusBadge status={status} variant="compact" />;
  };


  const getActiveLeases = () => {
    if (!leases) return [];
    return leases.filter((lease: any) => lease.status === "active");
  };

  const getCurrentTenant = () => {
    const activeLeases = getActiveLeases();
    return activeLeases.length > 0 ? activeLeases[0] : null;
  };
  
  const getExpiredLeases = () => {
    if (!leases) return [];
    return leases.filter((lease: any) => lease.status === "expired");
  };
  
  const getDisplayedLeases = () => {
    if (!leases) return [];
    if (showExpiredLeases) {
      return leases;
    }
    return leases.filter((lease: any) => lease.status !== "expired");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">Sign in to view property details.</div>
      </div>
    );
  }

  if (!isValidPropertyId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Invalid Property ID</h3>
              <p className="text-muted-foreground mb-4">
                The property ID in the URL is not valid.
              </p>
              <Link href="/properties">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (property === undefined) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Property Not Found</h1>
          <p className="text-muted-foreground mb-4">The property you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/properties" className="text-primary hover:underline">
            ← Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const currentTenant = getCurrentTenant();
  // No longer tracking utilities at property level - use utility bills instead
  const monthlyExpenses = (property?.monthlyMortgage || 0) + 
    (showCapEx ? (property?.monthlyCapEx || 0) : 0);
  const netIncome = (property?.monthlyRent || 0) - monthlyExpenses;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/properties" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{property.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center text-muted-foreground">
                  <Home className="w-4 h-4 mr-1" />
                  {property.type}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.address}
                </div>
                <StatusBadge status={property.status} />
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit Property
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => router.push(`/leases?propertyId=${propertyId}`)}
              >
                <UserPlus className="h-4 w-4" />
                Add Lease
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => setImageUploadOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Upload Images
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-xl sm:text-2xl font-bold">${property.monthlyRent?.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Square Feet</p>
                <p className="text-xl sm:text-2xl font-bold">{property.squareFeet?.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Square className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bedrooms</p>
                <p className="text-xl sm:text-2xl font-bold">{property.bedrooms}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Bed className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bathrooms</p>
                <p className="text-xl sm:text-2xl font-bold">{property.bathrooms}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Bath className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-4 lg:space-y-6">
            {/* Property Images Gallery */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileUp className="w-5 h-5 mr-2" />
                      Property Images
                    </CardTitle>
                    <CardDescription>
                      {propertyImages === undefined 
                        ? "Loading images..." 
                        : `${propertyImages.length} image${propertyImages.length !== 1 ? 's' : ''} uploaded`
                      }
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setImageUploadOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Images
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PropertyImageGallery propertyId={propertyId} />
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Bedrooms</span>
                    </div>
                    <span className="font-semibold">{property.bedrooms}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <Bath className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Bathrooms</span>
                    </div>
                    <span className="font-semibold">{property.bathrooms}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <Square className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Sq Ft</span>
                    </div>
                    <span className="font-semibold">{property.squareFeet?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    </div>
                    <span className="font-semibold text-green-600">${property.monthlyRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Purchase Date</span>
                    </div>
                    <span className="font-semibold">{formatDate(property.purchaseDate)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-lg">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Type</span>
                    </div>
                    <span className="font-semibold">{property.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Units Management - Only show for multi-family properties */}
            {(property.propertyType === "multi-family" || (propertyWithUnits?.units && propertyWithUnits.units.length > 0)) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Home className="w-5 h-5 mr-2" />
                        Units
                      </CardTitle>
                      <CardDescription>
                        Manage individual units in this property
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => setBulkUnitDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Bulk Add
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <UnitList 
                    propertyId={propertyId as any}
                    userId={user.id}
                    onEditUnit={(unit) => {
                      setEditingUnit(unit);
                      setUnitDialogOpen(true);
                    }}
                    onAddUnit={() => {
                      setEditingUnit(null);
                      setUnitDialogOpen(true);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Convert to Multi-Unit Property */}
            {property.propertyType !== "multi-family" && !propertyWithUnits?.units?.length && (
              <Card className="border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="w-5 h-5 mr-2" />
                    Multi-Unit Property
                  </CardTitle>
                  <CardDescription>
                    Convert this property to support multiple units
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Managing a duplex, triplex, or apartment building? Add units to track multiple tenants and split utilities.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setBulkUnitDialogOpen(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Units
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* All Leases */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Leases
                    </CardTitle>
                    <CardDescription>
                      {getActiveLeases().length > 0 && (
                        <span className="text-green-600 font-medium">{getActiveLeases().length} active</span>
                      )}
                      {getActiveLeases().length > 0 && getDisplayedLeases().length > getActiveLeases().length && ' • '}
                      {getDisplayedLeases().length - getActiveLeases().length > 0 && (
                        <span>{getDisplayedLeases().length - getActiveLeases().length} other</span>
                      )}
                      {getExpiredLeases().length > 0 && !showExpiredLeases && (
                        <span className="text-muted-foreground"> • {getExpiredLeases().length} hidden</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Expired Leases Toggle */}
                    {getExpiredLeases().length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowExpiredLeases(!showExpiredLeases)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            showExpiredLeases ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                          aria-label="Toggle expired leases"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              showExpiredLeases ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <div className={`flex items-center gap-1 text-xs ${
                          showExpiredLeases ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {showExpiredLeases ? (
                            <><Eye className="w-3 h-3" /> Show expired</>
                          ) : (
                            <><EyeOff className="w-3 h-3" /> Hide expired</>
                          )}
                        </div>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => router.push(`/leases?propertyId=${propertyId}`)}
                    >
                      <Plus className="h-4 w-4" />
                      New Lease
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {leases === undefined ? (
                  <div className="text-muted-foreground">Loading leases...</div>
                ) : leases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No leases found for this property.
                  </div>
                ) : getDisplayedLeases().length === 0 ? (
                  <div className="text-center py-8">
                    {showExpiredLeases ? (
                      <div className="space-y-3">
                        <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                        <p className="text-muted-foreground">No leases found for this property.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <Users className="h-12 w-12 text-yellow-500/30 mx-auto" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
                        </div>
                        <p className="text-muted-foreground font-medium">Property is vacant</p>
                        <p className="text-sm text-muted-foreground">No active or pending leases</p>
                        {getExpiredLeases().length > 0 && (
                          <button
                            onClick={() => setShowExpiredLeases(true)}
                            className="text-sm text-primary hover:underline"
                          >
                            View {getExpiredLeases().length} past lease{getExpiredLeases().length !== 1 ? 's' : ''}
                          </button>
                        )}
                        <Button 
                          className="gap-2 mt-4"
                          onClick={() => router.push(`/leases?propertyId=${propertyId}`)}
                        >
                          <UserPlus className="h-4 w-4" />
                          Add New Lease
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Leases */}
                    {getActiveLeases().map((lease: any) => (
                      <div 
                        key={lease._id} 
                        className="border rounded-lg p-4 border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 sm:mb-2">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{lease.tenantName}</h4>
                              {lease.unit && (
                                <Badge variant="outline" className="text-xs">
                                  Unit {lease.unit.unitIdentifier}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getLeaseStatusBadge(lease.status, lease.endDate)}
                              <Badge variant="default" className="bg-green-600 text-xs">
                                Current Tenant
                              </Badge>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-semibold">${lease.rent?.toLocaleString()}/mo</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                          {lease.tenantEmail && (
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {lease.tenantEmail}
                            </div>
                          )}
                          {lease.tenantPhone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {lease.tenantPhone}
                            </div>
                          )}
                          {lease.leaseDocumentUrl && (
                            <a 
                              href={lease.leaseDocumentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Lease Document
                            </a>
                          )}
                        </div>
                        {lease.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Notes:</strong> {lease.notes}
                          </div>
                        )}
                        {/* Contact buttons for active leases */}
                        {(lease.tenantEmail || lease.tenantPhone) && (
                          <div className="mt-3 pt-3 border-t flex gap-2">
                            {lease.tenantEmail && (
                              <Button size="sm" variant="outline" className="gap-2" asChild>
                                <a href={`mailto:${lease.tenantEmail}`}>
                                  <Mail className="h-3 w-3" />
                                  Email
                                </a>
                              </Button>
                            )}
                            {lease.tenantPhone && (
                              <Button size="sm" variant="outline" className="gap-2" asChild>
                                <a href={`tel:${lease.tenantPhone}`}>
                                  <Phone className="h-3 w-3" />
                                  Call
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Non-Active Leases (pending, etc.) */}
                    {leases?.filter((lease: any) => lease.status !== "active" && lease.status !== "expired").map((lease: any) => (
                      <div 
                        key={lease._id} 
                        className="border rounded-lg p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 sm:mb-2">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold">{lease.tenantName}</h4>
                              {lease.unit && (
                                <Badge variant="outline" className="text-xs">
                                  Unit {lease.unit.unitIdentifier}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getLeaseStatusBadge(lease.status, lease.endDate)}
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-semibold">${lease.rent?.toLocaleString()}/mo</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                          {lease.tenantEmail && (
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {lease.tenantEmail}
                            </div>
                          )}
                          {lease.tenantPhone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {lease.tenantPhone}
                            </div>
                          )}
                          {lease.leaseDocumentUrl && (
                            <a 
                              href={lease.leaseDocumentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Lease Document
                            </a>
                          )}
                        </div>
                        {lease.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Notes:</strong> {lease.notes}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Expired Leases Section */}
                    {showExpiredLeases && getExpiredLeases().length > 0 && (
                      <div className="mt-6 pt-6 border-t border-muted-foreground/20">
                        <div className="flex items-center gap-2 mb-4">
                          <Archive className="w-4 h-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Past Tenants ({getExpiredLeases().length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {getExpiredLeases().map((lease: any, index: number) => (
                            <div 
                              key={lease._id} 
                              className="border rounded-lg p-4 border-muted-foreground/30 bg-muted/20 animate-in fade-in-0 slide-in-from-bottom-2"
                              style={{
                                animationDelay: `${index * 50}ms`
                              }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 sm:mb-2">
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-semibold">{lease.tenantName}</h4>
                                    {lease.unit && (
                                      <Badge variant="outline" className="text-xs">
                                        Unit {lease.unit.unitIdentifier}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getLeaseStatusBadge(lease.status, lease.endDate)}
                                  </div>
                                </div>
                                <div className="text-left sm:text-right">
                                  <div className="font-semibold">${lease.rent?.toLocaleString()}/mo</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                                {lease.tenantEmail && (
                                  <div className="flex items-center">
                                    <Mail className="w-3 h-3 mr-1" />
                                    {lease.tenantEmail}
                                  </div>
                                )}
                                {lease.tenantPhone && (
                                  <div className="flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {lease.tenantPhone}
                                  </div>
                                )}
                                {lease.leaseDocumentUrl && (
                                  <a 
                                    href={lease.leaseDocumentUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center text-primary hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Lease Document
                                  </a>
                                )}
                              </div>
                              {lease.notes && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                  <strong>Notes:</strong> {lease.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Financial Summary */}
            <Card className="bg-gradient-to-br from-card to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Financial Summary
                  </span>
                  <div className="flex flex-col items-start gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Include CapEx</span>
                    <button
                      onClick={() => setShowCapEx(!showCapEx)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        showCapEx 
                          ? 'bg-primary' 
                          : 'bg-muted'
                      }`}
                      role="switch"
                      aria-checked={showCapEx}
                      aria-label="Include CapEx in calculations"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          showCapEx ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Income */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground">Monthly Rent</span>
                      <span className="font-semibold text-lg">${property.monthlyRent?.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Expenses */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
                    {property.monthlyMortgage && property.monthlyMortgage > 0 && (
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-muted-foreground">Mortgage</span>
                        <span className="font-semibold">-${property.monthlyMortgage.toLocaleString()}</span>
                      </div>
                    )}
                    {/* Utility costs now tracked in utility bills section */}
                    {showCapEx && property.monthlyCapEx && property.monthlyCapEx > 0 && (
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-muted-foreground">
                          CapEx Reserve
                          <span className="text-xs text-muted-foreground ml-1">(10% of mortgage)</span>
                        </span>
                        <span className="font-semibold">-${property.monthlyCapEx.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Net Income */}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <span className="font-medium">Net Income</span>
                      <span className={`font-bold text-lg ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${netIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {currentTenant?.securityDeposit && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-muted-foreground">Security Deposit Held</span>
                        <span className="font-semibold">${currentTenant.securityDeposit.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Utilities now managed through Utility Bills section */}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Documents
                </CardTitle>
                <CardDescription>
                  {documents?.length || 0} document{(documents?.length || 0) !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents === undefined ? (
                  <div className="text-muted-foreground">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No documents uploaded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <DocumentViewer
                        key={doc._id}
                        storageId={doc.storageId || doc.url}
                        fileName={doc.name}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{doc.name}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </DocumentViewer>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Universal Utility Allocation */}
            {property && (property.propertyType === "multi-family" || (propertyWithUnits?.units && propertyWithUnits.units.length > 0)) && (
              <UniversalUtilityAllocation
                propertyId={property._id as any}
                userId={user!.id}
              />
            )}

            {/* Tenant Statement Generator */}
            {property && getActiveLeases().length > 0 && (
              <TenantStatementGenerator
                propertyId={property._id as any}
                userId={user!.id}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Property Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(isOpen) => {
        setEditDialogOpen(isOpen);
        if (!isOpen) {
          setError(null);
        }
      }}>
        <DialogContent className="bg-card border border-border shadow-xl rounded-xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          {property && (
            <PropertyForm
              initial={{
                name: property.name,
                address: property.address,
                type: property.type,
                status: property.status,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                squareFeet: property.squareFeet,
                monthlyRent: property.monthlyRent,
                purchaseDate: property.purchaseDate,
                imageUrl: property.imageUrl,
                monthlyMortgage: property.monthlyMortgage,
                monthlyCapEx: property.monthlyCapEx,
              }}
              onSubmit={async (data) => {
                if (!user) return;
                try {
                  setLoading(true);
                  setError(null);
                  await updateProperty({ 
                    ...data, 
                    id: property._id, 
                    userId: user.id 
                  });
                  setEditDialogOpen(false);
                } catch (err: any) {
                  setError(err.data?.message || err.message || "An error occurred");
                } finally {
                  setLoading(false);
                }
              }}
              onCancel={() => setEditDialogOpen(false)}
              loading={loading}
            />
          )}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
      

      {/* Image Upload Dialog */}
      <PropertyImageUpload
        propertyId={propertyId}
        open={imageUploadOpen}
        onOpenChange={setImageUploadOpen}
        onUploadComplete={() => {
          // Images will be automatically refreshed via Convex reactivity
        }}
      />

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={(open) => {
        setUnitDialogOpen(open);
        if (!open) setEditingUnit(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <UnitForm
            propertyId={propertyId as any}
            initial={editingUnit}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                if (editingUnit) {
                  await updateUnit({ ...data, userId: user.id });
                } else {
                  await addUnit({ ...data, userId: user.id });
                }
                setUnitDialogOpen(false);
                setEditingUnit(null);
              } catch (err: any) {
                console.error("Unit operation error:", err);
                toast.error(formatErrorForToast(err));
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => {
              setUnitDialogOpen(false);
              setEditingUnit(null);
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Unit Creation Dialog */}
      <Dialog open={bulkUnitDialogOpen} onOpenChange={setBulkUnitDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Multiple Units</DialogTitle>
          </DialogHeader>
          <BulkUnitCreator
            propertyId={propertyId as any}
            onSubmit={async (units) => {
              setLoading(true);
              try {
                await bulkCreateUnits({ 
                  propertyId: propertyId as any, 
                  units, 
                  userId: user.id 
                });
                setBulkUnitDialogOpen(false);
              } catch (err: any) {
                console.error("Bulk unit creation error:", err);
                toast.error(formatErrorForToast(err));
              } finally {
                setLoading(false);
              }
            }}
            onCancel={() => setBulkUnitDialogOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 