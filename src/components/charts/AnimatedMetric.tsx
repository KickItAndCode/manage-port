"use client";
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedMetricProps {
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percentage';
  prefix?: string;
  suffix?: string;
  className?: string;
  animationDuration?: number;
  showChange?: boolean;
  changeFormat?: 'absolute' | 'percentage' | 'both';
}

export function AnimatedMetric({
  value,
  previousValue,
  format = 'number',
  prefix = '',
  suffix = '',
  className,
  animationDuration = 1000,
  showChange = false,
  changeFormat = 'both'
}: AnimatedMetricProps) {
  const [displayValue, setDisplayValue] = useState(previousValue || 0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      
      const startValue = displayValue;
      const endValue = value;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = startValue + (endValue - startValue) * easedProgress;
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, displayValue, animationDuration]);

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const calculateChange = () => {
    if (!previousValue || previousValue === 0) return null;
    
    const absoluteChange = value - previousValue;
    const percentageChange = (absoluteChange / previousValue) * 100;
    
    return { absoluteChange, percentageChange };
  };

  const change = showChange ? calculateChange() : null;

  return (
    <div className={cn("space-y-1", className)}>
      {/* Main value */}
      <div className={cn(
        "font-bold transition-all duration-200",
        isAnimating && "scale-105"
      )}>
        {prefix}
        {formatValue(displayValue)}
        {suffix}
      </div>
      
      {/* Change indicator */}
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-xs transition-all duration-200",
          change.absoluteChange > 0 && "text-green-600",
          change.absoluteChange < 0 && "text-red-600",
          change.absoluteChange === 0 && "text-gray-500"
        )}>
          {change.absoluteChange > 0 && "↗"}
          {change.absoluteChange < 0 && "↘"}
          {change.absoluteChange === 0 && "→"}
          
          <span>
            {changeFormat === 'absolute' && formatValue(Math.abs(change.absoluteChange))}
            {changeFormat === 'percentage' && `${Math.abs(change.percentageChange).toFixed(1)}%`}
            {changeFormat === 'both' && 
              `${formatValue(Math.abs(change.absoluteChange))} (${Math.abs(change.percentageChange).toFixed(1)}%)`
            }
          </span>
        </div>
      )}
    </div>
  );
}

// Hook for animated metrics with staggered animations
export function useStaggeredAnimation(
  items: any[],
  delay: number = 100
) {
  const [animatedItems, setAnimatedItems] = useState<number[]>([]);

  useEffect(() => {
    if (items.length === 0) return;

    setAnimatedItems([]);
    
    items.forEach((_, index) => {
      setTimeout(() => {
        setAnimatedItems(prev => [...prev, index]);
      }, index * delay);
    });
  }, [items, delay]);

  return animatedItems;
}

// Enhanced metric card with animation
interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percentage';
  icon?: React.ReactNode;
  className?: string;
  showChange?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

export function AnimatedMetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  icon,
  className,
  showChange = true,
  trend
}: AnimatedMetricCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card text-card-foreground",
      "hover:shadow-md transition-all duration-200",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <AnimatedMetric
            value={value}
            previousValue={previousValue}
            format={format}
            showChange={showChange}
            className="text-2xl"
          />
        </div>
        
        {icon && (
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            trend === 'up' && "text-green-600 bg-green-100",
            trend === 'down' && "text-red-600 bg-red-100",
            trend === 'neutral' && "text-gray-600 bg-gray-100",
            !trend && "text-muted-foreground"
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}