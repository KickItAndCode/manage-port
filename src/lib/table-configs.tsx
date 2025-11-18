import React from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, AlertCircle, Building, Calendar, Zap, Droplets, Flame, Wifi, Receipt, FileText } from "lucide-react";
import { TableConfig, ColumnDefinition, BulkAction } from "@/components/ui/responsive-table";
import { DocumentViewer } from "@/components/DocumentViewer";
import { cn } from "@/lib/utils";
import { Id } from "@/../convex/_generated/dataModel";

// Type definitions for our data models
export interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyRent: number;
  purchaseDate?: string;
  monthlyMortgage?: number;
  monthlyCapEx?: number;
}

export interface UtilityBill {
  _id: Id<"utilityBills">;
  _creationTime: number;
  userId: string;
  createdAt: string;
  propertyId: Id<"properties">;
  utilityType: string;
  provider: string;
  billMonth: string;
  totalAmount: number;
  dueDate: string;
  billDate: string;
  billingPeriod?: string;
  notes?: string;
  updatedAt?: string;
  landlordPaidUtilityCompany: boolean;
  landlordPaidDate?: string;
  property?: Property;
}

export interface Lease {
  _id: string;
  userId: string;
  propertyId: string;
  unitId?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: string;
  endDate: string;
  rent: number;
  securityDeposit?: number;
  status?: string; // Deprecated, use computedStatus
  computedStatus?: "active" | "expired" | "pending";
  daysUntilExpiry?: number | null;
  notes?: string;
  leaseDocumentUrl?: string;
  createdAt: string;
  updatedAt?: string;
  unit?: {
    _id: string;
    unitIdentifier: string;
    status: string;
  };
}

// Utility helper functions
export const getUtilityIcon = (type: string) => {
  switch (type) {
    case "Electric": return Zap;
    case "Water": return Droplets;
    case "Gas": return Flame;
    case "Internet": case "Cable": return Wifi;
    case "Trash": return Trash2;
    default: return Receipt;
  }
};

export const getUtilityColor = (type: string) => {
  switch (type) {
    case "Electric": return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "Water": return "text-blue-600 bg-blue-50 border-blue-200";
    case "Gas": return "text-orange-600 bg-orange-50 border-orange-200";
    case "Internet": case "Cable": return "text-purple-600 bg-purple-50 border-purple-200";
    case "Trash": return "text-gray-600 bg-gray-50 border-gray-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

// Property table configuration
export function createPropertyTableConfig(
  onEdit: (property: Property) => void,
  onDelete: (property: Property) => void,
  onView: (property: Property) => void
): TableConfig<Property> {
  const columns: ColumnDefinition<Property>[] = [
    {
      key: 'name',
      label: 'Property Name',
      priority: 'essential',
      sortable: true,
      render: (value, item) => (
        <div>
          <p 
            className="font-medium cursor-pointer hover:text-primary transition-colors"
            onClick={() => onView(item)}
          >
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{item.address}</p>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      priority: 'essential',
      sortable: true,
      render: (value) => <Badge variant="outline" className="text-xs">{value}</Badge>
    },
    {
      key: 'status',
      label: 'Status',
      priority: 'essential',
      sortable: true,
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'monthlyRent',
      label: 'Rent',
      priority: 'important',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-green-600">
          {value > 0 ? `$${value.toLocaleString()}` : '$0'}
        </span>
      )
    },
    {
      key: 'bedrooms',
      label: 'Bed/Bath',
      priority: 'important',
      sortable: true,
      render: (value, item) => (
        <div className="text-sm">
          <p>{value} bed, {item.bathrooms} bath</p>
        </div>
      )
    },
    {
      key: 'squareFeet',
      label: 'Sq Ft',
      priority: 'contextual',
      sortable: true,
      render: (value) => `${value.toLocaleString()} ft²`
    },
    {
      key: '_id',
      label: 'Actions',
      priority: 'administrative',
      sortable: false,
      width: '64px',
      className: 'text-center',
      render: (value, item) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  const bulkActions: BulkAction<Property>[] = [
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      action: async (selectedItems) => {
        // This will be handled by the parent component
        console.log('Bulk delete:', selectedItems);
      }
    }
  ];

  return {
    columns,
    defaultSort: {
      column: 'name',
      direction: 'asc'
    },
    bulkActions,
    selectable: true,
    mobileCardTemplate: 'property-card'
  };
}

// Utility Bill table configuration
export function createUtilityBillTableConfig(
  onEdit: (bill: UtilityBill) => void,
  onDelete: (bill: UtilityBill) => void,
  onView: (bill: UtilityBill) => void,
  onTogglePaid: (bill: UtilityBill) => void,
  properties?: Property[]
): TableConfig<UtilityBill> {
  const columns: ColumnDefinition<UtilityBill>[] = [
    {
      key: 'utilityType',
      label: 'Utility',
      priority: 'essential',
      sortable: true,
      render: (value, item) => {
        const Icon = getUtilityIcon(value);
        const colorClasses = getUtilityColor(value);
        return (
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg flex-shrink-0", colorClasses)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">{value}</p>
              <p className="text-xs text-muted-foreground truncate">{item.provider}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'billMonth',
      label: 'Period',
      priority: 'essential',
      sortable: true,
      render: (value) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            {value}
          </Badge>
        </div>
      )
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      priority: 'essential',
      sortable: true,
      render: (value) => (
        <div className="text-right">
          <span className="font-semibold text-lg">${value.toFixed(2)}</span>
        </div>
      )
    },
    {
      key: 'landlordPaidUtilityCompany',
      label: 'Status',
      priority: 'essential',
      sortable: true,
      render: (value, item) => (
        <div className="space-y-1">
          {value ? (
            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Paid
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unpaid
            </Badge>
          )}
          {value && item.landlordPaidDate && (
            <p className="text-xs text-muted-foreground">
              {item.landlordPaidDate}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'propertyId',
      label: 'Property',
      priority: 'important',
      sortable: true,
      render: (value) => {
        const property = properties?.find(p => p._id === value);
        return property ? (
          <div className="flex items-center gap-1 text-sm">
            <Building className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{property.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Unknown Property</span>
        );
      }
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      priority: 'important',
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      )
    },
    {
      key: '_id',
      label: 'Actions',
      priority: 'administrative',
      sortable: false,
      width: '64px',
      className: 'text-center',
      render: (value, item) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(item)}>
                <Eye className="h-4 w-4 mr-2" />
                View Charges
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePaid(item)}>
                {item.landlordPaidUtilityCompany ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Unpaid
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Paid
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Bill
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  const bulkActions: BulkAction<UtilityBill>[] = [
    {
      id: 'mark-paid',
      label: 'Mark as Paid',
      icon: CheckCircle,
      variant: 'default',
      action: async (selectedItems) => {
        console.log('Bulk mark paid:', selectedItems);
      }
    },
    {
      id: 'mark-unpaid',
      label: 'Mark as Unpaid',
      icon: XCircle,
      variant: 'outline',
      action: async (selectedItems) => {
        console.log('Bulk mark unpaid:', selectedItems);
      }
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      action: async (selectedItems) => {
        console.log('Bulk delete:', selectedItems);
      }
    }
  ];

  return {
    columns,
    defaultSort: {
      column: 'billMonth',
      direction: 'desc'
    },
    bulkActions,
    selectable: true,
    mobileCardTemplate: 'utility-bill-card'
  };
}

// Custom mobile card renderer for utility bills
export function UtilityBillMobileCard({ 
  bill, 
  selected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onView,
  onTogglePaid,
  properties
}: {
  bill: UtilityBill;
  selected: boolean;
  onSelect: () => void;
  onEdit: (bill: UtilityBill) => void;
  onDelete: (bill: UtilityBill) => void;
  onView: (bill: UtilityBill) => void;
  onTogglePaid: (bill: UtilityBill) => void;
  properties?: Property[];
}) {
  const Icon = getUtilityIcon(bill.utilityType);
  const colorClasses = getUtilityColor(bill.utilityType);
  const property = properties?.find(p => p._id === bill.propertyId);

  return (
    <div className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label="Select utility bill"
            className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn("p-2 rounded-lg flex-shrink-0", colorClasses)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base truncate">{bill.utilityType}</h3>
                    <Badge variant="outline" className="text-xs shrink-0">{bill.billMonth}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 truncate">{bill.provider}</p>
                  {property && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Building className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{property.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>Due: {bill.dueDate}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right sm:text-right">
                <p className="font-bold text-lg text-green-600">
                  ${bill.totalAmount.toFixed(2)}
                </p>
                <div className="flex justify-end sm:justify-end mt-1">
                  {bill.landlordPaidUtilityCompany ? (
                    <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Unpaid
                    </Badge>
                  )}
                </div>
                {bill.landlordPaidUtilityCompany && bill.landlordPaidDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid: {bill.landlordPaidDate}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end pt-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(bill)}>
                <Eye className="h-4 w-4 mr-2" />
                View Charges
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePaid(bill)}>
                {bill.landlordPaidUtilityCompany ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark Unpaid
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Paid
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(bill)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Bill
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(bill)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Bill
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Custom mobile card renderer for properties
export function PropertyMobileCard({ 
  property, 
  selected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onView 
}: {
  property: Property;
  selected: boolean;
  onSelect: () => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onView: (property: Property) => void;
}) {
  return (
    <div className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label="Select property"
            className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 
                    className="font-semibold text-base cursor-pointer hover:text-primary transition-colors truncate"
                    onClick={() => onView(property)}
                  >
                    {property.name}
                  </h3>
                  <Badge variant="outline" className="text-xs shrink-0">{property.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{property.address}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={property.status} variant="compact" />
                </div>
              </div>
              
              <div className="text-right sm:text-right">
                <p className="font-bold text-lg text-green-600">
                  {property.monthlyRent > 0 
                    ? `$${property.monthlyRent.toLocaleString()}` 
                    : '$0'
                  }
                </p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-sm py-3 bg-muted/30 rounded-lg px-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Bedrooms</p>
                <p className="font-semibold">{property.bedrooms}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Bathrooms</p>
                <p className="font-semibold">{property.bathrooms}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Sq Ft</p>
                <p className="font-semibold">{property.squareFeet.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end pt-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(property)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(property)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(property)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Data priority mapping for properties
export const PropertyDataPriority = {
  essential: ['name', 'type', 'status'],
  important: ['address', 'monthlyRent', 'bedrooms', 'bathrooms'],
  contextual: ['squareFeet', 'purchaseDate', 'monthlyMortgage'],
  administrative: ['_id', 'userId', 'createdAt', 'updatedAt']
} as const;

// Data priority mapping for utility bills
export const UtilityBillDataPriority = {
  essential: ['utilityType', 'billMonth', 'totalAmount', 'landlordPaidUtilityCompany'],
  important: ['propertyId', 'provider', 'dueDate'],
  contextual: ['billDate', 'billingPeriod', 'landlordPaidDate', 'notes'],
  administrative: ['_id', 'userId', 'createdAt', 'updatedAt']
} as const;

// Lease table configuration
export function createLeaseTableConfig(
  onEdit: (lease: Lease) => void,
  onDelete: (lease: Lease) => void,
  onViewDocuments: (lease: Lease) => void,
  properties?: Property[],
  getLeaseDocuments?: (leaseId: string) => any[]
): TableConfig<Lease> {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const columns: ColumnDefinition<Lease>[] = [
    {
      key: 'tenantName',
      label: 'Tenant',
      priority: 'essential',
      sortable: true,
      render: (value, item) => {
        const leaseDocuments = getLeaseDocuments ? getLeaseDocuments(item._id) : [];
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{value}</p>
              {leaseDocuments.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {leaseDocuments.length} doc{leaseDocuments.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {item.tenantEmail && (
              <p className="text-sm text-muted-foreground">{item.tenantEmail}</p>
            )}
            {item.tenantPhone && (
              <p className="text-sm text-muted-foreground">{item.tenantPhone}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'propertyId',
      label: 'Property',
      priority: 'essential',
      sortable: true,
      render: (value) => {
        const property = properties?.find(p => p._id === value);
        return (
          <div className="flex items-center gap-1 text-sm">
            <Building className="w-3 h-3 text-muted-foreground" />
            <span className="truncate max-w-[150px]">{property?.name || "Unknown"}</span>
          </div>
        );
      }
    },
    {
      key: 'startDate',
      label: 'Term',
      priority: 'essential',
      sortable: true,
      render: (value, item) => (
        <div className="text-sm">
          <p>{formatDate(value)} - {formatDate(item.endDate)}</p>
          {item.computedStatus === "active" && item.daysUntilExpiry !== null && item.daysUntilExpiry <= 60 && item.daysUntilExpiry >= 0 && (
            <p className="text-orange-500 flex items-center gap-1 mt-1 text-xs">
              <AlertCircle className="w-3 h-3" />
              {item.daysUntilExpiry} days left
            </p>
          )}
        </div>
      )
    },
    {
      key: 'rent',
      label: 'Rent',
      priority: 'essential',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-green-600">
          ${value.toLocaleString()}/mo
        </span>
      )
    },
    {
      key: 'securityDeposit',
      label: 'Deposit',
      priority: 'important',
      sortable: true,
      render: (value) => (
        <span className="text-sm">
          {value ? `$${value.toLocaleString()}` : '-'}
        </span>
      )
    },
    {
      key: 'computedStatus',
      label: 'Status',
      priority: 'essential',
      sortable: true,
      render: (value) => {
        if (!value) return <StatusBadge status="pending" />;
        return <StatusBadge status={value === "active" ? "active" : value === "expired" ? "expired" : "pending"} />;
      }
    },
    {
      key: '_id',
      label: 'Actions',
      priority: 'administrative',
      sortable: false,
      width: '64px',
      className: 'text-center',
      render: (value, item) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {getLeaseDocuments && getLeaseDocuments(item._id).length > 0 && (
                <>
                  {getLeaseDocuments(item._id).map((doc: any) => (
                    <DropdownMenuItem key={doc._id} asChild>
                      <DocumentViewer
                        storageId={doc.storageId}
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
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Lease
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lease
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return {
    columns,
    defaultSort: {
      column: 'startDate',
      direction: 'desc'
    },
    selectable: true,
    mobileCardTemplate: 'lease-card'
  };
}

// Custom mobile card renderer for leases
export function LeaseMobileCard({ 
  lease, 
  selected, 
  onSelect, 
  onEdit, 
  onDelete, 
  onViewDocuments,
  properties,
  getLeaseDocuments
}: {
  lease: Lease;
  selected: boolean;
  onSelect: () => void;
  onEdit: (lease: Lease) => void;
  onDelete: (lease: Lease) => void;
  onViewDocuments: (lease: Lease) => void;
  properties?: Property[];
  getLeaseDocuments?: (leaseId: string) => any[];
}) {
  const property = properties?.find(p => p._id === lease.propertyId);
  const leaseDocuments = getLeaseDocuments ? getLeaseDocuments(lease._id) : [];
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label="Select lease"
            className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-base truncate">{lease.tenantName}</h3>
                  {leaseDocuments.length > 0 && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {leaseDocuments.length} doc{leaseDocuments.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{property?.name || "Unknown Property"}</p>
                {lease.tenantEmail && (
                  <p className="text-sm text-muted-foreground">{lease.tenantEmail}</p>
                )}
                {lease.tenantPhone && (
                  <p className="text-sm text-muted-foreground">{lease.tenantPhone}</p>
                )}
              </div>
              
              <div className="text-right sm:text-right">
                <p className="font-bold text-lg text-green-600">
                  ${lease.rent.toLocaleString()}/mo
                </p>
                <div className="flex justify-end sm:justify-end mt-1">
                  <StatusBadge 
                    status={lease.computedStatus === "active" ? "active" : lease.computedStatus === "expired" ? "expired" : "pending"} 
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm py-3 bg-muted/30 rounded-lg px-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start</p>
                <p className="font-medium">{formatDate(lease.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End</p>
                <p className="font-medium">{formatDate(lease.endDate)}</p>
              </div>
              {lease.securityDeposit && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deposit</p>
                  <p className="font-medium">${lease.securityDeposit.toLocaleString()}</p>
                </div>
              )}
            </div>

            {lease.computedStatus === "active" && lease.daysUntilExpiry !== null && lease.daysUntilExpiry <= 60 && lease.daysUntilExpiry >= 0 && (
              <div className="flex items-center gap-1 text-orange-500 text-sm mt-2">
                <AlertCircle className="w-3 h-3" />
                <span>{lease.daysUntilExpiry} days left</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end pt-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-4 font-medium">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {leaseDocuments.length > 0 && (
                <>
                  {leaseDocuments.map((doc: any) => (
                    <DropdownMenuItem key={doc._id} asChild>
                      <DocumentViewer
                        storageId={doc.storageId}
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
              <DropdownMenuItem onClick={() => onEdit(lease)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Lease
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(lease)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lease
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Data priority mapping for leases
export const LeaseDataPriority = {
  essential: ['tenantName', 'propertyId', 'startDate', 'rent', 'computedStatus'],
  important: ['endDate', 'securityDeposit'],
  contextual: ['tenantEmail', 'tenantPhone', 'notes', 'daysUntilExpiry'],
  administrative: ['_id', 'userId', 'createdAt', 'updatedAt']
} as const;

// Responsive breakpoints
export const ResponsiveBreakpoints = {
  MOBILE_CARD: 'lg:hidden',
  DESKTOP_TABLE: 'hidden lg:block',
  COMPACT_TEXT: 'hidden sm:inline',
  MOBILE_TEXT: 'sm:hidden',
  TABLET_ADJUSTMENTS: 'md:'
} as const;