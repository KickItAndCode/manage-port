"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UtilityBillForm } from "@/components/UtilityBillForm";
import { BulkUtilityBillEntry } from "@/components/BulkUtilityBillEntry";
import { BillSplitPreview } from "@/components/BillSplitPreview";
import { LoadingContent } from "@/components/LoadingContent";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { 
  Plus, 
  Receipt, 
  Calendar,
  DollarSign,
  Home,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Trash
} from "lucide-react";

export default function UtilityBillsPage() {
  const { user } = useUser();
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7);
  });
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const { dialog: confirmDialog, confirm } = useConfirmationDialog();

  // Queries
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );
  
  const bills = useQuery(api.utilityBills.getUtilityBills, 
    user ? { 
      userId: user.id,
      propertyId: selectedProperty ? selectedProperty as any : undefined,
      billMonth: selectedMonth || undefined,
    } : "skip"
  );

  const unpaidBills = useQuery(api.utilityBills.getUnpaidBills,
    user ? { userId: user.id } : "skip"
  );

  // Mutations
  const addBill = useMutation(api.utilityBills.addUtilityBill);
  const updateBill = useMutation(api.utilityBills.updateUtilityBill);
  const deleteBill = useMutation(api.utilityBills.deleteUtilityBill);
  const bulkAddBills = useMutation(api.utilityBills.bulkAddUtilityBills);
  const markPaid = useMutation(api.utilityPayments.markUtilityPaid);

  const getUtilityIcon = (type: string) => {
    switch (type) {
      case "Electric": return Zap;
      case "Water": return Droplets;
      case "Gas": return Flame;
      case "Internet": case "Cable": return Wifi;
      case "Trash": return Trash;
      default: return Receipt;
    }
  };

  const getUtilityColor = (type: string) => {
    switch (type) {
      case "Electric": return "text-yellow-600";
      case "Water": return "text-blue-600";
      case "Gas": return "text-orange-600";
      case "Internet": case "Cable": return "text-purple-600";
      case "Trash": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const toggleBillExpanded = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const handleDeleteBill = async (bill: any) => {
    confirm({
      title: "Delete Utility Bill",
      description: `Are you sure you want to delete the ${bill.utilityType} bill for ${bill.billMonth}? This will also delete all associated tenant charges.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteBill({ id: bill._id, userId: user!.id });
        } catch (error: any) {
          alert(error.message || "Failed to delete bill");
        }
      }
    });
  };

  const groupBillsByProperty = () => {
    if (!bills || !properties) return {};
    
    const grouped: Record<string, any[]> = {};
    bills.forEach(bill => {
      const property = properties.find(p => p._id === bill.propertyId);
      const key = property?.name || "Unknown Property";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...bill, property });
    });
    
    return grouped;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Sign in to manage utility bills.
        </div>
      </div>
    );
  }

  const groupedBills = groupBillsByProperty();
  const selectedPropertyData = properties?.find(p => p._id === selectedProperty);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Utility Bills</h1>
            <p className="text-muted-foreground mt-1">
              Manage monthly utility bills and tenant charges
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Bulk Entry
            </Button>
            <Button onClick={() => setBillDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Bill
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="property">Property</Label>
                <select
                  id="property"
                  className="w-full h-10 px-3 rounded-md border bg-background"
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  <option value="">All Properties</option>
                  {properties?.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="month">Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedProperty("");
                    setSelectedMonth("");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-2xl font-bold">{bills?.length || 0}</p>
                </div>
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unpaid Bills</p>
                  <p className="text-2xl font-bold">{unpaidBills?.length || 0}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    ${bills?.filter(b => b.billMonth === selectedMonth)
                      .reduce((sum, b) => sum + b.totalAmount, 0)
                      .toFixed(2) || "0.00"}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Properties</p>
                  <p className="text-2xl font-bold">{Object.keys(groupedBills).length}</p>
                </div>
                <Home className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bills List */}
        <LoadingContent loading={!bills} skeletonRows={6}>
          {Object.entries(groupedBills).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bills Found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedProperty || selectedMonth 
                    ? "Try adjusting your filters"
                    : "Start by adding your first utility bill"}
                </p>
                <Button onClick={() => setBillDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedBills).map(([propertyName, propertyBills]) => (
                <Card key={propertyName}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      {propertyName}
                    </CardTitle>
                    <CardDescription>
                      {propertyBills.length} bill{propertyBills.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {propertyBills
                      .filter(bill => 
                        searchTerm === "" ||
                        bill.utilityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        bill.provider.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((bill) => {
                        const Icon = getUtilityIcon(bill.utilityType);
                        const iconColor = getUtilityColor(bill.utilityType);
                        const isExpanded = expandedBills.has(bill._id);
                        
                        return (
                          <div key={bill._id} className="border rounded-lg">
                            <div
                              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleBillExpanded(bill._id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{bill.utilityType}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {bill.provider} • {bill.billMonth}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="font-semibold">${bill.totalAmount.toFixed(2)}</div>
                                    <div className="flex items-center gap-2">
                                      {bill.isPaid ? (
                                        <Badge variant="outline" className="text-green-600">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Paid
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-orange-600">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Unpaid
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="border-t p-4 bg-muted/20">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Bill Date</p>
                                      <p className="font-medium">{bill.billDate}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Due Date</p>
                                      <p className="font-medium">{bill.dueDate}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Status</p>
                                      <p className="font-medium">{bill.isPaid ? "Paid" : "Unpaid"}</p>
                                    </div>
                                    {bill.paidDate && (
                                      <div>
                                        <p className="text-muted-foreground">Paid Date</p>
                                        <p className="font-medium">{bill.paidDate}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {bill.notes && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">Notes</p>
                                      <p className="text-sm">{bill.notes}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingBill(bill);
                                      }}
                                    >
                                      <Users className="w-4 h-4 mr-2" />
                                      View Charges
                                    </Button>
                                    {!bill.isPaid && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await updateBill({
                                              id: bill._id,
                                              userId: user.id,
                                              isPaid: true,
                                              paidDate: new Date().toISOString().split('T')[0],
                                            });
                                          } catch (error: any) {
                                            alert(error.message || "Failed to mark as paid");
                                          }
                                        }}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Mark Paid
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBill(bill);
                                        setBillDialogOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBill(bill);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </LoadingContent>
      </div>

      {/* Add/Edit Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={(open) => {
        setBillDialogOpen(open);
        if (!open) setSelectedBill(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBill ? "Edit Bill" : "Add Utility Bill"}</DialogTitle>
          </DialogHeader>
          {selectedPropertyData ? (
            <UtilityBillForm
              propertyId={selectedPropertyData._id as any}
              propertyName={selectedPropertyData.name}
              initial={selectedBill}
              onSubmit={async (data) => {
                try {
                  if (selectedBill) {
                    await updateBill({
                      id: selectedBill._id,
                      userId: user.id,
                      ...data,
                    });
                  } else {
                    await addBill({
                      userId: user.id,
                      propertyId: selectedPropertyData._id as any,
                      ...data,
                    });
                  }
                  setBillDialogOpen(false);
                  setSelectedBill(null);
                } catch (error: any) {
                  alert(error.message || "Failed to save bill");
                }
              }}
              onCancel={() => {
                setBillDialogOpen(false);
                setSelectedBill(null);
              }}
            />
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Please select a property from the filters first.
              </p>
              <Button onClick={() => setBillDialogOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Entry Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Utility Bill Entry</DialogTitle>
          </DialogHeader>
          {selectedPropertyData ? (
            <BulkUtilityBillEntry
              propertyId={selectedPropertyData._id as any}
              propertyName={selectedPropertyData.name}
              onSubmit={async (billsData) => {
                const result = await bulkAddBills({
                  userId: user.id,
                  propertyId: selectedPropertyData._id as any,
                  billMonth: selectedMonth,
                  bills: billsData,
                });
                if (result.createdBillIds.length > 0) {
                  setBulkDialogOpen(false);
                }
                return result;
              }}
              onCancel={() => setBulkDialogOpen(false)}
            />
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                Please select a property from the filters first.
              </p>
              <Button onClick={() => setBulkDialogOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Charges Dialog */}
      <Dialog open={!!viewingBill} onOpenChange={(open) => !open && setViewingBill(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Charges</DialogTitle>
          </DialogHeader>
          {viewingBill && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{viewingBill.utilityType} - {viewingBill.billMonth}</h3>
                  <span className="text-lg font-semibold">${viewingBill.totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{viewingBill.provider}</p>
              </div>
              
              <BillSplitPreview
                propertyId={viewingBill.propertyId}
                utilityType={viewingBill.utilityType}
                totalAmount={viewingBill.totalAmount}
                userId={user.id}
              />
              
              <div className="flex justify-end">
                <Button onClick={() => setViewingBill(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
}