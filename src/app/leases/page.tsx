"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeaseForm } from "@/components/LeaseForm";
import { Card } from "@/components/ui/card";
import { LoadingContent } from "@/components/LoadingContent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, FileText, AlertCircle, DollarSign } from "lucide-react";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Table, TableHeader, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

export default function LeasesPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const preSelectedPropertyId = searchParams.get('propertyId');
  
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const leases = useQuery(api.leases.getLeases, user ? { userId: user.id } : "skip");
  const addLease = useMutation(api.leases.addLease);
  const updateLease = useMutation(api.leases.updateLease);
  const deleteLease = useMutation(api.leases.deleteLease);
  const linkDocumentToLease = useMutation(api.documents.linkDocumentToLease);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLease, setEditLease] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (filterStatus && l.status !== filterStatus) return false;
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
      let leaseId;
      if (editLease) {
        await updateLease({ ...form, id: editLease._id, userId: user.id, propertyId: form.propertyId as any });
        leaseId = editLease._id;
      } else {
        leaseId = await addLease({ ...form, userId: user.id, propertyId: form.propertyId as any });
      }
      
      // If a document was uploaded (leaseDocumentUrl contains a storage ID), link it to the lease
      if (form.leaseDocumentUrl && !form.leaseDocumentUrl.startsWith('http')) {
        try {
          await linkDocumentToLease({
            storageId: form.leaseDocumentUrl,
            leaseId: leaseId,
            userId: user.id,
          });
        } catch (linkError) {
          console.error("Failed to link document to lease:", linkError);
          // Don't fail the lease creation if document linking fails
        }
      }
      
      setModalOpen(false);
      setEditLease(null);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
    setLoading(false);
  }

  if (!user) return <div className="text-center text-muted-foreground">Sign in to manage leases.</div>;
  if (!properties) return <div className="text-center text-muted-foreground">Loading properties...</div>;

  const LeaseTable = ({ leases: leaseList, title }: { leases: any[], title: string }) => (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Info</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaseList.map((lease) => {
              const property = properties?.find((p: any) => p._id === lease.propertyId);
              const daysUntilExpiry = calculateDaysUntilExpiry(lease.endDate);
              return (
                <TableRow key={lease._id} className="hover:bg-muted/50 transition-colors duration-200">
                  <TableCell>
                    <div>
                      <p className="font-medium">{lease.tenantName}</p>
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
                    {lease.paymentDay ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            {lease.paymentDay}{lease.paymentDay === 1 ? "st" : lease.paymentDay === 2 ? "nd" : lease.paymentDay === 3 ? "rd" : "th"}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Rent due on the {lease.paymentDay}{lease.paymentDay === 1 ? "st" : lease.paymentDay === 2 ? "nd" : lease.paymentDay === 3 ? "rd" : "th"} of each month</TooltipContent>
                      </Tooltip>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {lease.leaseDocumentUrl && (
                        <Tooltip>
                          <TooltipTrigger>
                            <DocumentViewer
                              storageId={lease.leaseDocumentUrl}
                              fileName={`${lease.tenantName} - Lease Document`}
                            >
                              <FileText className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
                            </DocumentViewer>
                          </TooltipTrigger>
                          <TooltipContent>View Lease Document</TooltipContent>
                        </Tooltip>
                      )}
                      {lease.notes && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{lease.notes}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setEditLease(lease);
                          setModalOpen(true);
                        }}
                        className="h-8 px-2"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                                const errorMessage = err.data?.message || err.message || "Failed to delete lease";
                                setError(errorMessage);
                                console.error("Delete lease error:", err);
                              }
                              setLoading(false);
                            }
                          });
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {leaseList.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No {title.toLowerCase()} found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8 transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Leases</h1>
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
      
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <Input
          placeholder="Search tenant name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs bg-input text-foreground border border-border transition-colors duration-200"
        />
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={filterProperty}
          onChange={e => setFilterProperty(e.target.value)}
        >
          <option value="">All Properties</option>
          {properties?.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          className="bg-input text-foreground px-4 py-2 rounded-lg border border-border transition-colors duration-200"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="space-y-6">
        {(activeAndPendingLeases.length > 0 || (!filterStatus || filterStatus === "active" || filterStatus === "pending")) && (
          <LeaseTable leases={activeAndPendingLeases} title="Active & Pending Leases" />
        )}
        
        {(expiredLeases.length > 0 || filterStatus === "expired") && (
          <LeaseTable leases={expiredLeases} title="Expired Leases" />
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
            onCancel={() => {
              setModalOpen(false);
              setEditLease(null);
              setError(null);
            }}
            properties={properties || []}
          />
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}