"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main heading text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
    icon?: LucideIcon;
  };
  /** Additional content to render below description */
  children?: ReactNode;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * EmptyState - Shared component for consistent empty states across pages
 * 
 * Used when there's no data to display, with optional action buttons
 * to guide users to create their first item.
 * 
 * @example
 * <EmptyState
 *   icon={Building}
 *   title="No properties found"
 *   description="Add your first property to get started"
 *   action={{
 *     label: "Add Property",
 *     onClick: () => setWizardOpen(true),
 *     icon: Plus
 *   }}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  size = "md",
}: EmptyStateProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-4 text-muted-foreground/30",
            iconSizes[size]
          )}
        >
          <Icon className="h-full w-full" />
        </div>
      )}
      
      <h3
        className={cn(
          "font-medium mb-2 text-foreground",
          titleSizes[size]
        )}
      >
        {title}
      </h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 text-sm max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="gap-2"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
      
      {children}
    </div>
  );
}

