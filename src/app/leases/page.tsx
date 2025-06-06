"use client";
import { useState, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaseForm } from "@/components/LeaseForm";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { formatErrorForToast } from "@/lib/error-handling";
import { FileText, AlertCircle, DollarSign, Archive, Eye, EyeOff, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LeasesPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const preSelectedPropertyId = searchParams.get('propertyId');
  
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const leases = useQuery(api.leases.getLeases, user ? { userId: user.id } : "skip");
  const allDocuments = useQuery(api.documents.getDocuments, user ? { userId: user.id } : "skip");
  const addLease = useMutation(api.leases.addLease);
  const updateLease = useMutation(api.leases.updateLease);
  const deleteLease = useMutation(api.leases.deleteLease);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpiredLeases, setShowExpiredLeases] = useState(false);
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Auto-open modal if coming from property page
  useEffect(() => {
    if (preSelectedPropertyId && properties) {
      // Check if the property exists and belongs to the user
      const property = properties.find(p => p._id === preSelectedPropertyId);
      if (property) {
        setEditLease(null);
        setModalOpen(true);
      }
    }
  }, [preSelectedPropertyId, properties]);

  // Calculate days until expiry for active leases
  const calculateDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Filtering
  const filtered = (leases || []).filter((l: any) => {
    if (search && !l.tenantName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterProperty && l.propertyId !== filterProperty) return false;
    return true;
  });

  // Separate active/pending and expired leases
  const activeAndPendingLeases = filtered.filter((l: any) => l.status === "active" || l.status === "pending");
  const expiredLeases = filtered.filter((l: any) => l.status === "expired");

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get documents for a specific lease
  const getLeaseDocuments = (leaseId: string) => {
    if (!allDocuments) return [];
    return allDocuments.filter(doc => doc.leaseId === leaseId);
  };

  // Get status badge
  const getStatusBadge = (status: string, endDate?: string) => {
    if (status === "active" && endDate) {
      const daysLeft = calculateDaysUntilExpiry(endDate);
      if (daysLeft <= 60 && daysLeft >= 0) {
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={status} variant="compact" />
            <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">
              {daysLeft}d left
            </Badge>
          </div>
        );
      }
    }
    return <StatusBadge status={status} variant="compact" />;
  };

  // Handlers
  async function handleSubmit(form: any) {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (editLease) {
        await updateLease({ 
          ...form, 
          id: editLease._id, 
          userId: user.id, 
          propertyId: form.propertyId as any,
          unitId: form.unitId as any
        });
      } else {
        await addLease({ ...form, userId: user.id, propertyId: form.propertyId as any });
      }
      
      // Document creation is handled by the addLease mutation
      // No need to create documents here to avoid duplicates
      
      setModalOpen(false);
      setEditLease(null);
    } catch (err: any) {
      setError(formatErrorForToast(err));
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <div className="text-center text-muted-foreground">Sign in to manage leases.</div>;
  if (!properties) return <div className="text-center text-muted-foreground">Loading properties...</div>;

  const LeaseTable = ({ leases: leaseList, title }: { leases: any[], title: string }) => {
    return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {leaseList.map((lease) => {
          const property = properties?.find((p: any) => p._id === lease.propertyId);
          const daysUntilExpiry = calculateDaysUntilExpiry(lease.endDate);
          const leaseDocuments = getLeaseDocuments(lease._id);
          return (
            <Card key={lease._id} className="p-4 border">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{lease.tenantName}</h3>
                      {leaseDocuments.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {leaseDocuments.length} doc{leaseDocuments.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{property?.name || "Unknown Property"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${lease.rent.toLocaleString()}/mo</p>
                    {getStatusBadge(lease.status, lease.endDate)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start:</span>
                    <p className="font-medium">{formatDate(lease.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End:</span>
                    <p className="font-medium">{formatDate(lease.endDate)}</p>
                  </div>
                  {lease.securityDeposit && (
                    <div>
                      <span className="text-muted-foreground">Deposit:</span>
                      <p className="font-medium">${lease.securityDeposit.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                {(lease.tenantEmail || lease.tenantPhone) && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {lease.tenantEmail && <p>{lease.tenantEmail}</p>}
                    {lease.tenantPhone && <p>{lease.tenantPhone}</p>}
                  </div>
                )}
                
                {lease.status === "active" && daysUntilExpiry <= 60 && daysUntilExpiry >= 0 && (
                  <div className="flex items-center gap-1 text-orange-500 text-sm">
                    <AlertCircle className="w-3 h-3" />
                    <span>{daysUntilExpiry} days left</span>
                  </div>
                )}
                
                <div className="flex items-center justify-end pt-2 border-t">
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-3">
                          <MoreHorizontal className="h-4 w-4 mr-1" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* View Lease Documents */}
                        {leaseDocuments.length > 0 && (
                          <>
                            {leaseDocuments.map(doc => (
                              <DropdownMenuItem key={doc._id} asChild>
                                <DocumentViewer
                                  storageId={doc.storageId || doc.url}
                                  fileName={doc.name}
                                >
                                  <div className="flex items-center w-full cursor-pointer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    View {doc.name}
                                  </div>
                                </DocumentViewer>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => {
                          setEditLease(lease);
                          setModalOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Lease
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            confirm({
                              title: "Delete Lease",
                              description: "Delete this lease? This will also delete any associated documents.",
                              variant: "destructive",
                              onConfirm: async () => {
                                setLoading(true);
                                setError(null);
                                try {
                                  await deleteLease({ id: lease._id as any, userId: user.id });
                                } catch (err: any) {
                                  const errorMessage = formatErrorForToast(err);
                                  toast.error(errorMessage);
                                  console.error("Delete lease error:", err);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Lease
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {leaseList.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No {title.toLowerCase()} found.
          </div>
        )}
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaseList.map((lease) => {
              const property = properties?.find((p: any) => p._id === lease.propertyId);
              const daysUntilExpiry = calculateDaysUntilExpiry(lease.endDate);
              const leaseDocuments = getLeaseDocuments(lease._id);
              return (
                <TableRow key={lease._id} className="hover:bg-muted/50 transition-colors duration-200">
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{lease.tenantName}</p>
                        {leaseDocuments.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {leaseDocuments.length} doc{leaseDocuments.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {lease.tenantEmail && (
                        <p className="text-sm text-muted-foreground">{lease.tenantEmail}</p>
                      )}
                      {lease.tenantPhone && (
                        <p className="text-sm text-muted-foreground">{lease.tenantPhone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="truncate max-w-[150px] inline-block">
                          {property?.name || "Unknown"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {property?.name} - {property?.address}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</p>
                      {lease.status === "active" && daysUntilExpiry <= 60 && daysUntilExpiry >= 0 && (
                        <p className="text-orange-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {daysUntilExpiry} days left
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>${lease.rent.toLocaleString()}/mo</TableCell>
                  <TableCell>
                    {lease.securityDeposit ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${lease.securityDeposit.toLocaleString()}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Security Deposit</TooltipContent>
                      </Tooltip>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(lease.status, lease.endDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View Lease Documents */}
                          {leaseDocuments.length > 0 && (
                            <>
                              {leaseDocuments.map(doc => (
                                <DropdownMenuItem key={doc._id} asChild>
                                  <DocumentViewer
                                    storageId={doc.storageId || doc.url}
                                    fileName={doc.name}
                                  >
                                    <div className="flex items-center w-full cursor-pointer">
                                      <FileText className="h-4 w-4 mr-2" />
                                      View {doc.name}
                                    </div>
                                  </DocumentViewer>
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setEditLease(lease);
                            setModalOpen(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Lease
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              confirm({
                                title: "Delete Lease",
                                description: "Delete this lease? This will also delete any associated documents.",
                                variant: "destructive",
                                onConfirm: async () => {
                                  setLoading(true);
                                  setError(null);
                                  try {
                                    await deleteLease({ id: lease._id as any, userId: user.id });
                                  } catch (err: any) {
                                    const errorMessage = formatErrorForToast(err);
                                    toast.error(errorMessage);
                                    console.error("Delete lease error:", err);
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lease
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {leaseList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No {title.toLowerCase()} found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Leases</h1>
        <Button 
          onClick={() => {
            setEditLease(null);
            setModalOpen(true);
          }} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors duration-200" 
          disabled={!properties || properties.length === 0}
        >
          Add Lease
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6 items-start sm:items-end">
        <Input
          placeholder="Search tenant name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs bg-input text-foreground border border-border transition-colors duration-200"
        />
        <select
          className="w-full sm:w-auto bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        
        {/* Expired Leases Toggle */}
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg border border-border transition-all duration-200 hover:bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Archive className="w-4 h-4" />
            <span>History</span>
            {expiredLeases.length > 0 && (
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {expiredLeases.length}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setShowExpiredLeases(!showExpiredLeases)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              showExpiredLeases ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                showExpiredLeases ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
            showExpiredLeases ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {showExpiredLeases ? (
              <>
                <Eye className="w-3 h-3" />
                <span>Showing</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" />
                <span>Hidden</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {activeAndPendingLeases.length > 0 && (
          <LeaseTable leases={activeAndPendingLeases} title="Active & Pending Leases" />
        )}
        
        {/* Expired Leases - Only show when toggle is enabled */}
        {showExpiredLeases && expiredLeases.length > 0 && (
          <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Archive className="w-4 h-4" />
              <span className="text-sm font-medium">Lease History</span>
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <LeaseTable leases={expiredLeases} title="Expired Leases" />
            </div>
          </div>
        )}
        
        {/* Show helpful message when history is hidden but expired leases exist */}
        {!showExpiredLeases && expiredLeases.length > 0 && (
          <div className="flex items-center justify-center p-8 bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg animate-in fade-in-0 duration-300">
            <div className="text-center space-y-2">
              <Archive className="w-8 h-8 mx-auto text-muted-foreground animate-in zoom-in-50 duration-500" />
              <p className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-500 delay-100">
                {expiredLeases.length} expired lease{expiredLeases.length !== 1 ? 's' : ''} hidden
              </p>
              <button
                onClick={() => setShowExpiredLeases(true)}
                className="text-sm text-primary hover:underline transition-colors duration-200 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 delay-200"
              >
                Show lease history
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLease ? "Edit Lease" : "Add Lease"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <LeaseForm
            initial={editLease || (preSelectedPropertyId ? { propertyId: preSelectedPropertyId } : undefined)}
            onSubmit={handleSubmit}
            loading={loading}
            userId={user!.id}
            onCancel={() => {
              setModalOpen(false);
              setEditLease(null);
              setError(null);
            }}
            properties={properties || []}
          />
        </DialogContent>
      </Dialog>

      {/* Utility settings moved to universal allocation in property details */}

      {confirmDialog}
    </div>
  );
}

export default function LeasesPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <LeasesPageContent />
    </Suspense>
  );
}