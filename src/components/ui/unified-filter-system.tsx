"use client";
import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectNative } from "@/components/ui/select-native";
import { Search, Filter, RotateCcw, ChevronDown, ChevronUp, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Core filter types
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'date-range' | 'search' | 'text';
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: any;
  width?: 'sm' | 'md' | 'lg' | 'full';
  required?: boolean;
  dependency?: string; // Key of another filter this depends on
}

export interface SearchConfig {
  placeholder: string;
  searchableFields: string[];
  debounceMs?: number;
}

export interface UnifiedFilterSystemProps {
  searchConfig?: SearchConfig;
  filterConfigs: FilterConfig[];
  data: any[];
  onFilteredDataChange: (filteredData: any[], activeFilters: Record<string, any>) => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showActiveFilterBadges?: boolean;
  enableQuickFilters?: boolean;
}

// Hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Main UnifiedFilterSystem component
export function UnifiedFilterSystem({
  searchConfig,
  filterConfigs,
  data,
  onFilteredDataChange,
  className,
  collapsible = true,
  defaultCollapsed = false,
  showActiveFilterBadges = true,
  enableQuickFilters = true
}: UnifiedFilterSystemProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const initialFilters: Record<string, any> = {};
    filterConfigs.forEach(config => {
      if (config.defaultValue !== undefined) {
        initialFilters[config.key] = config.defaultValue;
      }
    });
    return initialFilters;
  });
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(
    searchTerm, 
    searchConfig?.debounceMs || 300
  );

  // Stabilize searchConfig and filterConfigs to prevent infinite loops
  const searchConfigKey = useMemo(() => {
    if (!searchConfig) return '';
    return `${searchConfig.placeholder || ''}-${(searchConfig.searchableFields || []).join(',')}-${searchConfig.debounceMs || 300}`;
  }, [searchConfig]);
  
  const stableSearchConfig = useMemo(() => searchConfig, [searchConfigKey]);
  
  const filterConfigsKey = useMemo(() => {
    return filterConfigs.map(c => `${c.key}-${c.type}-${c.label}`).join(',');
  }, [filterConfigs]);
  
  const stableFilterConfigs = useMemo(() => filterConfigs, [filterConfigsKey]);

  // Calculate filtered data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (debouncedSearchTerm && stableSearchConfig) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(item => {
        return stableSearchConfig.searchableFields.some(field => {
          const value = getNestedProperty(item, field);
          return String(value || '').toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply individual filters
    stableFilterConfigs.forEach(config => {
      const filterValue = filters[config.key];
      if (filterValue !== undefined && filterValue !== '' && filterValue !== null) {
        const beforeCount = result.length;
        result = result.filter(item => {
          const itemValue = getNestedProperty(item, config.key);
          
          switch (config.type) {
            case 'select':
              // Handle boolean fields stored as strings in filter configs
              if (typeof itemValue === 'boolean') {
                return itemValue === (filterValue === 'true');
              }
              return itemValue === filterValue;
            case 'multi-select':
              if (Array.isArray(filterValue) && filterValue.length > 0) {
                return filterValue.includes(itemValue);
              }
              return true;
            case 'date-range':
              if (filterValue.start && filterValue.end) {
                const itemDate = new Date(itemValue);
                const startDate = new Date(filterValue.start);
                const endDate = new Date(filterValue.end);
                return itemDate >= startDate && itemDate <= endDate;
              }
              return true;
            case 'text':
            case 'search':
              return String(itemValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
            default:
              return true;
          }
        });
        
        // Debug logging for filter performance
        if (process.env.NODE_ENV === 'development') {
          console.log(`Filter ${config.key} (${config.type}): ${beforeCount} → ${result.length} items`, {
            filterValue,
            config: config.key,
            type: config.type
          });
        }
      }
    });

    return result;
  }, [data, debouncedSearchTerm, filters, stableSearchConfig, stableFilterConfigs]);

  // Stable reference for callback to prevent infinite loops
  const onFilteredDataChangeRef = React.useRef(onFilteredDataChange);
  React.useEffect(() => {
    onFilteredDataChangeRef.current = onFilteredDataChange;
  });

  // Notify parent of filtered data changes
  React.useEffect(() => {
    const activeFilters = { ...filters };
    if (debouncedSearchTerm) {
      activeFilters._search = debouncedSearchTerm;
    }
    onFilteredDataChangeRef.current(filteredData, activeFilters);
  }, [filteredData, filters, debouncedSearchTerm]);

  // Helper function to get nested property
  function getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Update filter value
  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    const defaultFilters: Record<string, any> = {};
    stableFilterConfigs.forEach(config => {
      if (config.defaultValue !== undefined) {
        defaultFilters[config.key] = config.defaultValue;
      }
    });
    setFilters(defaultFilters);
  }, [stableFilterConfigs]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearchTerm) count++;
    count += Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== null &&
      !(Array.isArray(value) && value.length === 0)
    ).length;
    return count;
  }, [filters, debouncedSearchTerm]);

  // Get available options for dependent filters
  const getFilterOptions = useCallback((config: FilterConfig): FilterOption[] => {
    if (!config.dependency) {
      return config.options || [];
    }

    const dependencyValue = filters[config.dependency];
    if (!dependencyValue) {
      return [];
    }

    // Filter options based on dependency - this would need custom logic per use case
    return config.options || [];
  }, [filters]);

  // Render filter input based on type
  const renderFilterInput = (config: FilterConfig) => {
    const value = filters[config.key] || '';
    const options = getFilterOptions(config);
    const widthClass = {
      sm: 'w-32',
      md: 'w-48',
      lg: 'w-64',
      full: 'w-full'
    }[config.width || 'md'];

    switch (config.type) {
      case 'select':
        return (
          <SelectNative
            className={widthClass}
            value={value}
            onChange={(e) => updateFilter(config.key, e.target.value)}
          >
            <option value="">{config.placeholder || `All ${config.label}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {option.count ? `(${option.count})` : ''}
              </option>
            ))}
          </SelectNative>
        );

      case 'date-range':
        return (
          <div className={cn("flex flex-col sm:flex-row gap-2", widthClass)}>
            <div className="relative flex-1">
              <Input
                type="date"
                value={value?.start || ''}
                onChange={(e) => updateFilter(config.key, { ...value, start: e.target.value })}
                className="pr-8"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <Input
                type="date"
                value={value?.end || ''}
                onChange={(e) => updateFilter(config.key, { ...value, end: e.target.value })}
                className="pr-8"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        );

      case 'text':
      case 'search':
        return (
          <Input
            className={widthClass}
            placeholder={config.placeholder}
            value={value}
            onChange={(e) => updateFilter(config.key, e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Search Bar */}
          {searchConfig && (
            <div>
              <Label htmlFor="unified-search" className="text-sm font-medium">
                Search
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="unified-search"
                  placeholder={searchConfig.placeholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stableFilterConfigs.map((config) => (
              <div key={config.key}>
                <Label htmlFor={config.key} className="text-sm font-medium">
                  {config.label} {config.required && <span className="text-destructive">*</span>}
                </Label>
                <div className="mt-1">
                  {renderFilterInput(config)}
                </div>
              </div>
            ))}
          </div>

          {/* Active Filter Badges */}
          {showActiveFilterBadges && activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {debouncedSearchTerm && (
                <Badge variant="outline" className="gap-1">
                  Search: &quot;{debouncedSearchTerm}&quot;
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              {stableFilterConfigs.map((config) => {
                const value = filters[config.key];
                if (value !== undefined && value !== '' && value !== null &&
                    !(Array.isArray(value) && value.length === 0)) {
                  
                  // Get human-readable display value
                  let displayValue: string;
                  
                  if (Array.isArray(value)) {
                    // Multi-select: map each value to its label
                    const labels = value.map(v => {
                      const option = config.options?.find(opt => opt.value === v);
                      return option ? option.label : String(v);
                    });
                    displayValue = labels.join(', ');
                  } else if (typeof value === 'object' && value.start) {
                    // Date range
                    displayValue = `${value.start} - ${value.end}`;
                  } else {
                    // Single select or text: find the matching option label
                    const option = config.options?.find(opt => opt.value === value);
                    displayValue = option ? option.label : String(value);
                  }
                      
                  return (
                    <Badge key={config.key} variant="outline" className="gap-1">
                      {config.label}: {displayValue}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => updateFilter(config.key, config.defaultValue || '')}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground pt-2 border-t">
            Showing {filteredData.length} of {data.length} results
            {filteredData.length === 0 && activeFilterCount > 0 && (
              <span className="text-orange-600 ml-2">
                - No items match current filters
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Utility hooks for common filter patterns
export function useUtilityBillFilters(bills: any[], properties: any[], _leases: any[]) {
  const propertyOptions = (properties || []).map(p => ({ value: p._id, label: p.name || 'Unnamed Property' }));
  
  // Debug logging for filter options
  if (process.env.NODE_ENV === 'development') {
    console.log('Filter Debug - Properties:', properties?.length || 0, 'Bills:', bills?.length || 0);
    console.log('Filter Debug - Property options:', propertyOptions);
    console.log('Filter Debug - Utility types found:', [...new Set((bills || []).map(b => b.utilityType))]);
  }
  
  const filterConfigs: FilterConfig[] = [
    {
      key: 'propertyId',
      label: 'Property',
      type: 'select',
      options: propertyOptions,
      width: 'md'
    },
    {
      key: 'utilityType',
      label: 'Utility Type',
      type: 'select',
      options: [
        { value: 'Electric', label: 'Electric' },
        { value: 'Gas', label: 'Gas' },
        { value: 'Water', label: 'Water' },
        { value: 'Sewer', label: 'Sewer' },
        { value: 'Trash', label: 'Trash' },
        { value: 'Internet', label: 'Internet' },
        { value: 'Cable', label: 'Cable' },
        { value: 'Phone', label: 'Phone' }
      ].concat(
        // Add any additional utility types found in actual bills data
        [...new Set((bills || []).map(b => b.utilityType))]
          .filter(type => type && !['Electric', 'Gas', 'Water', 'Sewer', 'Trash', 'Internet', 'Cable', 'Phone'].includes(type))
          .sort()
          .map(type => ({ value: type, label: type }))
      ),
      width: 'sm'
    },
    {
      key: 'landlordPaidUtilityCompany',
      label: 'Payment Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Paid' },
        { value: 'false', label: 'Unpaid' }
      ],
      width: 'sm'
    },
    {
      key: 'billMonth',
      label: 'Date Range',
      type: 'date-range',
      width: 'lg'
    }
  ];

  const searchConfig: SearchConfig = {
    placeholder: "Search bills, providers, notes...",
    searchableFields: ['utilityType', 'provider', 'notes']
  };

  return { filterConfigs, searchConfig };
}

export function usePropertyFilters(properties: any[]) {
  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Property Type',
      type: 'select',
      options: [...new Set(properties.map(p => p.type))]
        .sort()
        .map(type => ({ value: type, label: type })),
      width: 'md'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [...new Set(properties.map(p => p.status))]
        .sort()
        .map(status => ({ value: status, label: status })),
      width: 'sm'
    }
  ];

  const searchConfig: SearchConfig = {
    placeholder: "Search properties by name, address, type...",
    searchableFields: ['name', 'address', 'type']
  };

  return { filterConfigs, searchConfig };
}