"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Core interfaces for responsive table system
export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  priority: 'essential' | 'important' | 'contextual' | 'administrative';
  sortable?: boolean;
  width?: string;
  className?: string;
  render?: (value: any, item: T) => React.ReactNode;
  mobileHidden?: boolean;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  action: (selectedItems: T[]) => void | Promise<void>;
  disabled?: boolean;
}

export interface TableConfig<T> {
  columns: ColumnDefinition<T>[];
  defaultSort?: {
    column: keyof T;
    direction: 'asc' | 'desc';
  };
  bulkActions?: BulkAction<T>[];
  mobileCardTemplate?: string;
  selectable?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  config: TableConfig<T>;
  loading?: boolean;
  emptyState?: React.ReactNode;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
  onSelect?: (items: T[]) => void;
  selectedItems?: T[];
  getItemId: (item: T) => string;
  mobileCardRenderer?: (item: T, config: { 
    selected: boolean; 
    onSelect: () => void; 
    actions?: React.ReactNode;
  }) => React.ReactNode;
  className?: string;
}

// Hook for responsive breakpoint detection
function useIsDesktop(breakpoint: number = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= breakpoint);
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, [breakpoint]);
  
  return isDesktop;
}

// Main ResponsiveTable component
export function ResponsiveTable<T>({
  data,
  config,
  loading = false,
  emptyState,
  onSort,
  onSelect,
  selectedItems = [],
  getItemId,
  mobileCardRenderer,
  className
}: ResponsiveTableProps<T>) {
  const isDesktop = useIsDesktop();
  const [sortColumn, setSortColumn] = useState<keyof T | null>(
    config.defaultSort?.column || null
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    config.defaultSort?.direction || 'asc'
  );

  // Handle sorting
  const handleSort = (column: keyof T) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (sortColumn === column) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

  // Filter columns based on screen size and priority
  const visibleColumns = useMemo(() => {
    if (isDesktop) {
      return config.columns;
    }
    // On mobile, only show essential and important columns in table header
    // But this is mainly for reference since we'll use cards on mobile
    return config.columns.filter(col => 
      col.priority === 'essential' || col.priority === 'important'
    );
  }, [config.columns, isDesktop]);

  // Selection handling
  const selectedIds = useMemo(() => 
    selectedItems.map(item => getItemId(item)), 
    [selectedItems, getItemId]
  );

  const handleSelectItem = (item: T) => {
    const itemId = getItemId(item);
    const newSelection = selectedIds.includes(itemId)
      ? selectedItems.filter(selected => getItemId(selected) !== itemId)
      : [...selectedItems, item];
    onSelect?.(newSelection);
  };

  const handleSelectAll = () => {
    const allSelected = selectedItems.length === data.length;
    onSelect?.(allSelected ? [] : [...data]);
  };

  const isItemSelected = (item: T) => 
    selectedIds.includes(getItemId(item));

  // Render mobile card view
  const renderMobileView = () => (
    <div className="lg:hidden space-y-3">
      {data.map((item) => {
        const selected = isItemSelected(item);
        
        // Use custom renderer if provided
        if (mobileCardRenderer) {
          return (
            <div key={getItemId(item)}>
              {mobileCardRenderer(item, {
                selected,
                onSelect: () => handleSelectItem(item),
                actions: undefined // Can be implemented later for action dropdowns
              })}
            </div>
          );
        }
        
        // Default card renderer
        return (
          <Card 
            key={getItemId(item)} 
            className={cn(
              "p-4 hover:shadow-md transition-shadow duration-200",
              selected && "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary"
            )}
          >
            <div className="space-y-3">
              {config.selectable !== false && (
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => handleSelectItem(item)}
                    aria-label="Select item"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <DefaultMobileCardContent item={item} columns={config.columns} />
                  </div>
                </div>
              )}
              {config.selectable === false && (
                <DefaultMobileCardContent item={item} columns={config.columns} />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  // Render desktop table view
  const renderDesktopView = () => (
    <div className="hidden lg:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {config.selectable !== false && (
              <TableHead className="w-8">
                <Checkbox
                  checked={selectedItems.length === data.length && data.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {visibleColumns.map((column) => (
              <TableHead 
                key={String(column.key)}
                className={cn(
                  "text-muted-foreground",
                  column.sortable && "cursor-pointer hover:text-foreground",
                  column.className
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortColumn === column.key && (
                    sortDirection === 'asc' 
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const selected = isItemSelected(item);
            
            return (
              <TableRow 
                key={getItemId(item)}
                className={cn(
                  "hover:bg-muted/50 transition-colors duration-200",
                  selected && "bg-primary/10 dark:bg-primary/15 border-l-4 border-l-primary"
                )}
              >
                {config.selectable !== false && (
                  <TableCell className="w-8">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => handleSelectItem(item)}
                      aria-label="Select item"
                    />
                  </TableCell>
                )}
                {visibleColumns.map((column) => (
                  <TableCell 
                    key={String(column.key)}
                    className={column.className}
                  >
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || '')
                    }
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // Enhanced loading state that matches actual table structure
  if (loading) {
    return (
      <div className={cn("", className)}>
        {/* Mobile Cards Loading */}
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-3">
                    {/* Essential info skeleton */}
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    
                    {/* Important info grid skeleton */}
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j} className="space-y-1">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Actions skeleton */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      {Array.from({ length: 3 }).map((_, k) => (
                        <Skeleton key={k} className="h-8 w-16" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop Table Loading */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {config.selectable !== false && (
                  <TableHead className="w-8">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                )}
                {visibleColumns.map((column, i) => (
                  <TableHead key={i} className={column.className} style={{ width: column.width }}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {config.selectable !== false && (
                    <TableCell className="w-8">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {visibleColumns.map((column, j) => (
                    <TableCell key={j} className={column.className}>
                      {/* Different skeleton sizes based on column priority */}
                      {column.priority === 'essential' ? (
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      ) : column.priority === 'important' ? (
                        <Skeleton className="h-6 w-16 rounded-full" />
                      ) : (
                        <Skeleton className="h-4 w-20" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={cn("", className)}>
        {emptyState || (
          <div className="text-center text-muted-foreground py-12">
            <p>No data to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {renderMobileView()}
      {renderDesktopView()}
    </div>
  );
}

// Default mobile card content renderer
function DefaultMobileCardContent<T>({ 
  item, 
  columns 
}: { 
  item: T; 
  columns: ColumnDefinition<T>[];
}) {
  const essentialColumns = columns.filter(col => col.priority === 'essential');
  const importantColumns = columns.filter(col => col.priority === 'important');
  
  return (
    <div className="space-y-3">
      {/* Essential information - prominently displayed */}
      <div className="space-y-1">
        {essentialColumns.map((column) => (
          <div key={String(column.key)}>
            {column.render 
              ? column.render(item[column.key], item)
              : (
                <div>
                  <span className="font-medium">{String(item[column.key] || '')}</span>
                </div>
              )
            }
          </div>
        ))}
      </div>
      
      {/* Important information - secondary display */}
      {importantColumns.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {importantColumns.map((column) => (
            <div key={String(column.key)} className="space-y-1">
              <p className="text-xs text-muted-foreground">{column.label}</p>
              <div>
                {column.render 
                  ? column.render(item[column.key], item)
                  : <span>{String(item[column.key] || '')}</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Bulk actions toolbar component
export function BulkActionsToolbar<T>({
  selectedItems,
  actions,
  onClearSelection,
  className
}: {
  selectedItems: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  className?: string;
}) {
  if (selectedItems.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2",
      className
    )}>
      <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
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
                onClick={onClearSelection}
              >
                Clear Selection
              </Button>
              
              {actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant || 'default'}
                  onClick={() => action.action(selectedItems)}
                  disabled={action.disabled}
                  className="gap-2"
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}