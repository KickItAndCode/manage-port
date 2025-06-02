"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  AlertCircle,
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
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyForm } from "@/components/PropertyForm";
import { UtilityForm } from "@/components/UtilityForm";
import { useMutation } from "convex/react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { PropertyImageGallery } from "@/components/PropertyImageGallery";
import { PropertyImageUpload } from "@/components/PropertyImageUpload";

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const propertyId = params?.id as string;
  const [showCapEx, setShowCapEx] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [utilityModalOpen, setUtilityModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateProperty = useMutation(api.properties.updateProperty);
  const addUtility = useMutation(api.utilities.addUtility);

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
  const utilities = useQuery(
    api.utilities.getUtilities,
    user && isValidPropertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
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

  const calculateTotalUtilityCost = () => {
    if (!utilities) return 0;
    return utilities.reduce((sum: number, utility: any) => sum + utility.cost, 0);
  };

  const getActiveLeases = () => {
    if (!leases) return [];
    return leases.filter((lease: any) => lease.status === "active");
  };

  const getCurrentTenant = () => {
    const activeLeases = getActiveLeases();
    return activeLeases.length > 0 ? activeLeases[0] : null;
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
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/properties" className="text-primary hover:underline">
            ← Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const currentTenant = getCurrentTenant();
  const totalUtilityCost = calculateTotalUtilityCost();
  const monthlyExpenses = totalUtilityCost + 
    (property?.monthlyMortgage || 0) + 
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

            {/* Current Tenant */}
            {currentTenant ? (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Current Tenant
                    </span>
                    <Button size="sm" variant="ghost" className="gap-2">
                      <Mail className="h-4 w-4" />
                      Contact
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <div>
                        <h3 className="font-semibold text-lg">{currentTenant.tenantName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getLeaseStatusBadge(currentTenant.status, currentTenant.endDate)}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="font-semibold text-lg">${currentTenant.rent?.toLocaleString()}/mo</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(currentTenant.startDate)} - {formatDate(currentTenant.endDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      {currentTenant.tenantEmail && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 mr-1" />
                          {currentTenant.tenantEmail}
                        </div>
                      )}
                      {currentTenant.tenantPhone && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 mr-1" />
                          {currentTenant.tenantPhone}
                        </div>
                      )}
                    </div>
                    {currentTenant.securityDeposit && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Security Deposit:</span> 
                        <span className="font-semibold ml-1">${currentTenant.securityDeposit?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    No Current Tenant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">This property is currently vacant</p>
                    <Button 
                      className="gap-2"
                      onClick={() => router.push(`/leases?propertyId=${propertyId}`)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add New Lease
                    </Button>
                  </div>
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
                      Lease History
                    </CardTitle>
                    <CardDescription>
                      {leases?.length || 0} total lease{(leases?.length || 0) !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Lease
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {leases === undefined ? (
                  <div className="text-muted-foreground">Loading leases...</div>
                ) : leases.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No leases found for this property.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leases.map((lease: any) => (
                      <div key={lease._id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 sm:mb-2">
                          <div>
                            <h4 className="font-semibold">{lease.tenantName}</h4>
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
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground">Utilities</span>
                      <span className="font-semibold">-${totalUtilityCost.toLocaleString()}</span>
                    </div>
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

            {/* Utilities */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Utilities
                    </CardTitle>
                    <CardDescription>
                      {utilities?.length || 0} service{(utilities?.length || 0) !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => setUtilityModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {utilities === undefined ? (
                  <div className="text-muted-foreground">Loading utilities...</div>
                ) : utilities.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No utilities configured
                  </div>
                ) : (
                  <div className="space-y-3">
                    {utilities.map((utility: any) => (
                      <div key={utility._id} className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{utility.name}</div>
                          <div className="text-sm text-muted-foreground">{utility.provider}</div>
                          {utility.startDate && (
                            <div className="text-xs text-muted-foreground">
                              Since {formatDate(utility.startDate)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${utility.cost}</div>
                          <div className="text-xs text-muted-foreground">
                            {utility.billingCycle || 'Monthly'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-semibold">
                        <span>Total Monthly</span>
                        <span>${totalUtilityCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                        storageId={doc.url}
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
      
      {/* Add Utility Modal */}
      <Dialog open={utilityModalOpen} onOpenChange={setUtilityModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Utility</DialogTitle>
          </DialogHeader>
          <UtilityForm
            properties={property ? [{ _id: property._id, name: property.name }] : []}
            initial={{ propertyId: propertyId }}
            onSubmit={async (data) => {
              setLoading(true);
              try {
                await addUtility({ ...data, userId: user.id, propertyId: data.propertyId as any });
                setUtilityModalOpen(false);
              } catch (err: any) {
                console.error("Add utility error:", err);
                const errorMessage = err.data?.message || err.message || "Unknown error";
                alert("Failed to add utility: " + errorMessage);
              } finally {
                setLoading(false);
              }
            }}
            loading={loading}
          />
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
    </div>
  );
} 