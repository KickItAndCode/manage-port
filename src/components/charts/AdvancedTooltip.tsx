"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  className?: string;
}

export function AdvancedTooltip({
  active,
  payload,
  label,
  className
}: SimpleTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Get the first valid payload item
  const data = payload.find((item: any) => item && typeof item.value !== 'undefined' && item.value !== null);
  if (!data) return null;

  // Format value based on type
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      // If it's a large number, format as currency
      if (value >= 100) {
        return value.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      }
      // For small numbers (like counts), just show the number
      return value.toString();
    }
    return value?.toString() || 'N/A';
  };

  // Get the label - use the data name, dataKey, or label from props
  const itemLabel = data.name || data.dataKey || label || 'Value';

  return (
    <div className={cn(
      "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
      "border border-gray-200/80 dark:border-gray-700/80",
      "rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10",
      "px-4 py-3",
      "text-sm font-medium text-gray-900 dark:text-gray-100",
      "animate-in fade-in-0 zoom-in-95 duration-200",
      "min-w-[120px] max-w-[200px]",
      "relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-l-xl",
      className
    )}>
      {/* Clean two-line layout */}
      <div className="space-y-2">
        {/* Label */}
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
          {itemLabel}
        </div>
        
        {/* Value */}
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {formatValue(data.value)}
        </div>
      </div>

      {/* Optional: Show data point period/context if label exists */}
      {label && label !== itemLabel && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
          {label}
        </div>
      )}
    </div>
  );
}

// Simplified enhanced tooltip creator
export function createEnhancedTooltip(
  config: {
    formatValue?: (value: any) => string;
    getLabel?: (payload: any[], label: string) => string;
  } = {}
) {
  return function EnhancedTooltipWrapper(props: any) {
    const { active, payload, label } = props;
    
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const data = payload.find((item: any) => item && typeof item.value !== 'undefined' && item.value !== null);
    if (!data) return null;

    const formatValue = config.formatValue || ((value: any) => {
      if (typeof value === 'number') {
        if (value >= 100) {
          return value.toLocaleString('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          });
        }
        return value.toString();
      }
      return value?.toString() || 'N/A';
    });

    const itemLabel = config.getLabel ? 
      config.getLabel(payload, label) : 
      (data.name || data.dataKey || 'Value');

    return (
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 animate-in fade-in-0 zoom-in-95 duration-200 min-w-[120px] max-w-[200px] relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:rounded-l-xl">
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
            {itemLabel}
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatValue(data.value)}
          </div>
        </div>
        {label && label !== itemLabel && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
            {label}
          </div>
        )}
      </div>
    );
  };
}