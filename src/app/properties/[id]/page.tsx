"use client";
import { useParams } from "next/navigation";
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
  Tag
} from "lucide-react";

export default function PropertyDetailsPage() {
  const params = useParams();
  const { user } = useUser();
  const propertyId = params?.id as string;

  const property = useQuery(
    api.properties.getProperty,
    user && propertyId ? { id: propertyId as any, userId: user.id } : "skip"
  );
  const utilities = useQuery(
    api.utilities.getUtilities,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const leases = useQuery(
    api.leases.getLeases,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
  );
  const documents = useQuery(
    api.documents.getDocuments,
    user && propertyId ? { userId: user.id, propertyId: propertyId as any } : "skip"
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/properties" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{property.name}</h1>
              <div className="flex items-center gap-3 mb-4">
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Image */}
            {property.imageUrl && (
              <Card>
                <CardContent className="p-0">
                  <img 
                    src={property.imageUrl} 
                    alt={property.name} 
                    className="w-full h-64 object-cover rounded-lg" 
                  />
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                    <span className="font-semibold">{property.bedrooms}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                    <span className="font-semibold">{property.bathrooms}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Square className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sq Ft</span>
                    <span className="font-semibold">{property.squareFeet?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    <span className="font-semibold">${property.monthlyRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Purchase Date</span>
                    <span className="font-semibold">{formatDate(property.purchaseDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="font-semibold">{property.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Tenant */}
            {currentTenant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Current Tenant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{currentTenant.tenantName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getLeaseStatusBadge(currentTenant.status, currentTenant.endDate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">${currentTenant.rent?.toLocaleString()}/mo</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(currentTenant.startDate)} - {formatDate(currentTenant.endDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
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
            )}

            {/* All Leases */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Lease History
                </CardTitle>
                <CardDescription>
                  {leases?.length || 0} total lease{(leases?.length || 0) !== 1 ? 's' : ''}
                </CardDescription>
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
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{lease.tenantName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {getLeaseStatusBadge(lease.status, lease.endDate)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${lease.rent?.toLocaleString()}/mo</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
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
          <div className="space-y-6">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Rent</span>
                    <span className="font-semibold">${property.monthlyRent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utility Costs</span>
                    <span className="font-semibold">${totalUtilityCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Income</span>
                    <span className="font-semibold text-green-600">
                      ${((property.monthlyRent || 0) - totalUtilityCost).toLocaleString()}
                    </span>
                  </div>
                  {currentTenant?.securityDeposit && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="font-semibold">${currentTenant.securityDeposit.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Utilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Utilities
                </CardTitle>
                <CardDescription>
                  {utilities?.length || 0} service{(utilities?.length || 0) !== 1 ? 's' : ''}
                </CardDescription>
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
                      <a
                        key={doc._id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{doc.name}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 