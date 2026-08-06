# Responsive Table System - Technical Implementation Specification

## Component Architecture

### 1. Core Component Structure

```typescript
// src/components/ui/responsive-table.tsx
import React, { useState, useMemo } from 'react';
import { Card } from './card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './table';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Badge } from './badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface ColumnDefinition<T = any> {
  key: keyof T;
  label: string;
  priority: 'essential' | 'important' | 'contextual' | 'administrative';
  sortable?: boolean;
  width?: string;
  className?: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  mobileHidden?: boolean;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface BulkAction<T = any> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  action: (selectedItems: T[]) => void | Promise<void>;
  disabled?: (selectedItems: T[]) => boolean;
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: ColumnDefinition<T>[];
  // Mobile card renderer - can be custom or use default
  mobileCardRenderer?: (item: T, index: number, isSelected: boolean, onSelect: () => void) => React.ReactNode;
  // Selection
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (selectedItems: T[]) => void;
  getItemId?: (item: T) => string;
  // Sorting
  sortable?: boolean;
  sortConfig?: SortConfig;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  // Bulk actions
  bulkActions?: BulkAction<T>[];
  // Loading and empty states
  loading?: boolean;
  emptyState?: React.ReactNode;
  loadingRows?: number;
  // Responsive behavior
  mobileBreakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  // Styling
  className?: string;
  tableClassName?: string;
  mobileClassName?: string;
}

// Default mobile card renderer
const DefaultMobileCard = <T,>({ 
  item, 
  columns, 
  isSelected, 
  onSelect, 
  getItemId 
}: {
  item: T;
  columns: ColumnDefinition<T>[];
  isSelected: boolean;
  onSelect: () => void;
  getItemId?: (item: T) => string;
}) => {
  const essentialColumns = columns.filter(col => col.priority === 'essential');
  const importantColumns = columns.filter(col => col.priority === 'important');
  
  return (
    <Card className={cn(
      "p-4 transition-all duration-200 hover:shadow-md cursor-pointer",
      isSelected && "bg-primary/10 border-primary shadow-md"
    )}>
      <div className="space-y-3">
        {/* Header with selection and primary info */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label={`Select ${getItemId ? getItemId(item) : 'item'}`}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            {essentialColumns.map((column) => (
              <div key={String(column.key)} className="mb-1">
                {column.render 
                  ? column.render(item[column.key], item, 0)
                  : <span className="font-medium">{String(item[column.key])}</span>
                }
              </div>
            ))}
          </div>
        </div>
        
        {/* Important details grid */}
        {importantColumns.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {importantColumns.map((column) => (
              <div key={String(column.key)}>
                <span className="text-muted-foreground block text-xs">{column.label}</span>
                {column.render 
                  ? column.render(item[column.key], item, 0)
                  : <span>{String(item[column.key])}</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// Main ResponsiveTable component
export const ResponsiveTable = <T,>({
  data,
  columns,
  mobileCardRenderer,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item: T) => String((item as any)?._id || (item as any)?.id),
  sortable = false,
  sortConfig,
  onSort,
  bulkActions = [],
  loading = false,
  emptyState,
  loadingRows = 5,
  mobileBreakpoint = 'lg',
  className,
  tableClassName,
  mobileClassName
}: ResponsiveTableProps<T>) => {
  const [internalSort, setInternalSort] = useState<SortConfig | null>(null);
  
  const currentSort = sortConfig || internalSort;
  
  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    const newDirection = 
      currentSort?.column === columnKey && currentSort?.direction === 'asc' 
        ? 'desc' 
        : 'asc';
    
    const newSort = { column: columnKey, direction: newDirection };
    
    if (onSort) {
      onSort(columnKey, newDirection);
    } else {
      setInternalSort(newSort);
    }
  };
  
  const isSelected = (item: T) => {
    const itemId = getItemId(item);
    return selectedItems.some(selected => getItemId(selected) === itemId);
  };
  
  const handleSelect = (item: T) => {
    if (!onSelectionChange) return;
    
    const itemId = getItemId(item);
    const currentlySelected = isSelected(item);
    
    if (currentlySelected) {
      onSelectionChange(selectedItems.filter(selected => getItemId(selected) !== itemId));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };
  
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedItems.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...data]);
    }
  };
  
  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0;
  
  // Responsive classes based on breakpoint
  const mobileHiddenClass = `${mobileBreakpoint}:hidden`;
  const desktopHiddenClass = `hidden ${mobileBreakpoint}:block`;
  
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Mobile skeleton */}
        <div className={cn("space-y-3", mobileHiddenClass, mobileClassName)}>
          {Array.from({ length: loadingRows }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-3 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Desktop skeleton */}
        <Card className={cn("overflow-hidden", desktopHiddenClass, tableClassName)}>
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && <TableHead className="w-12" />}
                {columns.map((column) => (
                  <TableHead key={String(column.key)}>{column.label}</TableHead>
                ))}
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && (
                    <TableCell>
                      <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className={cn("", className)}>
        {emptyState || (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No data available</p>
          </Card>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Bulk Actions Toolbar */}
      {someSelected && bulkActions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2">
          <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                  >
                    {allSelected ? 'Clear All' : `Select All (${data.length})`}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectionChange?.([])}
                  >
                    Clear Selection
                  </Button>
                  
                  {bulkActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.variant || 'default'}
                      onClick={() => action.action(selectedItems)}
                      disabled={action.disabled?.(selectedItems)}
                      className="gap-2"
                    >
                      {action.icon && <action.icon className="h-4 w-4" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Mobile Card View */}
      <div className={cn("space-y-3", mobileHiddenClass, mobileClassName)}>
        {data.map((item, index) => {
          const itemSelected = isSelected(item);
          
          if (mobileCardRenderer) {
            return mobileCardRenderer(item, index, itemSelected, () => handleSelect(item));
          }
          
          return (
            <DefaultMobileCard
              key={getItemId(item)}
              item={item}
              columns={columns}
              isSelected={itemSelected}
              onSelect={() => handleSelect(item)}
              getItemId={getItemId}
            />
          );
        })}
      </div>
      
      {/* Desktop Table View */}
      <Card className={cn("overflow-hidden", desktopHiddenClass, tableClassName)}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all items"
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead 
                    key={String(column.key)}
                    className={cn(
                      column.className,
                      column.width && `w-[${column.width}]`,
                      sortable && column.sortable && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {sortable && column.sortable && currentSort?.column === column.key && (
                        currentSort.direction === 'asc' 
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const itemSelected = isSelected(item);
                
                return (
                  <TableRow 
                    key={getItemId(item)}
                    className={cn(
                      "transition-colors duration-200",
                      itemSelected && "bg-primary/10 border-l-4 border-l-primary"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={itemSelected}
                          onCheckedChange={() => handleSelect(item)}
                          aria-label={`Select ${getItemId(item)}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={String(column.key)}
                        className={column.className}
                      >
                        {column.render 
                          ? column.render(item[column.key], item, index)
                          : String(item[column.key])
                        }
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ResponsiveTable;
```

### 2. Configuration System

```typescript
// src/lib/table-configs.ts
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ColumnDefinition, BulkAction } from '@/components/ui/responsive-table';

// Property table configuration
export interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  purchaseDate: string;
}

export const propertyTableConfig: {
  columns: ColumnDefinition<Property>[];
  bulkActions: BulkAction<Property>[];
} = {
  columns: [
    {
      key: 'name',
      label: 'Property',
      priority: 'essential',
      sortable: true,
      render: (value, item) => (
        <div>
          <p className="font-medium cursor-pointer hover:text-primary transition-colors">
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
      render: (value, item) => `${value} bed, ${item.bathrooms} bath`
    },
    {
      key: 'squareFeet',
      label: 'Sq Ft',
      priority: 'contextual',
      sortable: true,
      render: (value) => `${value.toLocaleString()} ft²`
    }
  ],
  bulkActions: [
    {
      id: 'delete',
      label: 'Delete',
      variant: 'destructive',
      action: async (properties) => {
        // Handle bulk delete
        console.log('Deleting properties:', properties);
      }
    }
  ]
};

// Lease table configuration
export interface Lease {
  _id: string;
  tenantName: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  rent: number;
  status: string;
  tenantEmail?: string;
  tenantPhone?: string;
  securityDeposit?: number;
}

export const leaseTableConfig: {
  columns: ColumnDefinition<Lease>[];
  bulkActions: BulkAction<Lease>[];
} = {
  columns: [
    {
      key: 'tenantName',
      label: 'Tenant',
      priority: 'essential',
      sortable: true,
      render: (value, item) => (
        <div>
          <p className="font-medium">{value}</p>
          {item.tenantEmail && (
            <p className="text-sm text-muted-foreground">{item.tenantEmail}</p>
          )}
          {item.tenantPhone && (
            <p className="text-sm text-muted-foreground">{item.tenantPhone}</p>
          )}
        </div>
      )
    },
    {
      key: 'propertyId',
      label: 'Property',
      priority: 'essential',
      render: (value, item, index, properties) => {
        // This would need property lookup
        return <span>Property Name</span>;
      }
    },
    {
      key: 'startDate',
      label: 'Term',
      priority: 'important',
      render: (value, item) => (
        <div className="text-sm">
          <p>{new Date(value).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</p>
        </div>
      )
    },
    {
      key: 'rent',
      label: 'Rent',
      priority: 'important',
      sortable: true,
      render: (value) => `$${value.toLocaleString()}/mo`
    },
    {
      key: 'securityDeposit',
      label: 'Deposit',
      priority: 'contextual',
      render: (value) => value ? `$${value.toLocaleString()}` : '-'
    },
    {
      key: 'status',
      label: 'Status',
      priority: 'essential',
      sortable: true,
      render: (value) => <StatusBadge status={value} variant="compact" />
    }
  ],
  bulkActions: [
    {
      id: 'export',
      label: 'Export',
      action: async (leases) => {
        console.log('Exporting leases:', leases);
      }
    }
  ]
};
```

### 3. Custom Mobile Card Components

```typescript
// src/components/ui/property-mobile-card.tsx
import React from 'react';
import { Card } from './card';
import { Badge } from './badge';
import { StatusBadge } from './status-badge';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  status: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
}

interface PropertyMobileCardProps {
  property: Property;
  isSelected: boolean;
  onSelect: () => void;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
}

export const PropertyMobileCard: React.FC<PropertyMobileCardProps> = ({
  property,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete
}) => {
  return (
    <Card className={cn(
      "p-4 hover:shadow-md transition-shadow duration-200",
      isSelected && "bg-primary/10 border-primary shadow-md"
    )}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            aria-label="Select property"
            className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 
                    className="font-semibold text-base cursor-pointer hover:text-primary transition-colors truncate"
                    onClick={() => onView?.(property)}
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
              <DropdownMenuItem onClick={() => onView?.(property)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(property)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(property)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};
```

### 4. Usage Examples

```typescript
// src/app/properties/page.tsx - Example migration
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { PropertyMobileCard } from '@/components/ui/property-mobile-card';
import { propertyTableConfig } from '@/lib/table-configs';

export default function PropertiesPage() {
  const { user } = useUser();
  const properties = useQuery(api.properties.getProperties, user ? { userId: user.id } : "skip");
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'name', direction: 'asc' });
  
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortConfig({ column, direction });
    // Apply sorting logic or trigger API call
  };
  
  const handleBulkDelete = async (propertiesToDelete: Property[]) => {
    // Implement bulk delete logic
    console.log('Deleting properties:', propertiesToDelete);
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Properties</h1>
        {/* Add property button */}
      </div>
      
      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search and filter components */}
      </div>
      
      {/* Responsive Table */}
      <ResponsiveTable
        data={properties || []}
        columns={propertyTableConfig.columns}
        selectable
        selectedItems={selectedProperties}
        onSelectionChange={setSelectedProperties}
        sortable
        sortConfig={sortConfig}
        onSort={handleSort}
        bulkActions={[
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            action: handleBulkDelete
          }
        ]}
        loading={!properties}
        mobileCardRenderer={(property, index, isSelected, onSelect) => (
          <PropertyMobileCard
            key={property._id}
            property={property}
            isSelected={isSelected}
            onSelect={onSelect}
            onView={(prop) => router.push(`/properties/${prop._id}`)}
            onEdit={setEditProperty}
            onDelete={handleDeleteProperty}
          />
        )}
        emptyState={
          <Card className="p-12 text-center">
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-6">Add your first property to get started</p>
            <Button onClick={() => setWizardOpen(true)}>
              Add Property
            </Button>
          </Card>
        }
      />
    </div>
  );
}
```

## Implementation Plan

### Phase 1: Core Component (Week 1)
1. **Day 1-2**: Build ResponsiveTable base component with table/card switching
2. **Day 3-4**: Implement selection, sorting, and bulk actions
3. **Day 5**: Add loading states and empty state handling

### Phase 2: Configuration System (Week 1-2)
1. **Day 6-7**: Create column configuration system and table configs
2. **Week 2 Day 1-2**: Build custom mobile card components
3. **Week 2 Day 3**: Add advanced features (virtualization prep)

### Phase 3: Migration (Week 2-3)
1. **Week 2 Day 4-5**: Migrate properties page
2. **Week 3 Day 1-2**: Migrate leases page
3. **Week 3 Day 3-4**: Implement documents page responsive table
4. **Week 3 Day 5**: Enhance utility bills page

### Phase 4: Polish (Week 4)
1. **Day 1-2**: Cross-device testing and bug fixes
2. **Day 3-4**: Performance optimization and accessibility audit
3. **Day 5**: Documentation and final testing

This technical specification provides the complete implementation details for creating a robust, reusable responsive table system that will unify the current ad-hoc implementations while providing enhanced mobile experiences.