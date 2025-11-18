"use client";

import { Building, Receipt, FileText, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
}

export interface QuickActionsProps {
  /** Custom actions to display */
  actions?: QuickAction[];
  /** Show as dropdown menu (compact) or button group (expanded) */
  variant?: "dropdown" | "buttons";
  /** Custom className */
  className?: string;
  /** Callback when action is triggered */
  onAction?: (actionId: string) => void;
}

/**
 * QuickActions - Surface-level quick actions for common CRUD operations
 * 
 * Provides quick access to "Add property", "Log bill", "Upload doc" actions
 * from anywhere in the app. Can be displayed as dropdown or button group.
 * 
 * @example
 * <QuickActions
 *   variant="dropdown"
 *   onAction={(id) => console.log(`Action: ${id}`)}
 * />
 */
export function QuickActions({
  actions,
  variant = "dropdown",
  className,
  onAction,
}: QuickActionsProps) {
  const router = useRouter();

  const defaultActions: QuickAction[] = [
    {
      id: "add-property",
      label: "Add Property",
      icon: Building,
      onClick: () => {
        router.push("/properties?wizard=true");
        onAction?.("add-property");
      },
    },
    {
      id: "add-lease",
      label: "Add Lease",
      icon: Layers,
      onClick: () => {
        router.push("/leases?new=true");
        onAction?.("add-lease");
      },
    },
    {
      id: "log-bill",
      label: "Log Bill",
      icon: Receipt,
      onClick: () => {
        router.push("/utility-bills?new=true");
        onAction?.("log-bill");
      },
    },
    {
      id: "upload-doc",
      label: "Upload Document",
      icon: FileText,
      onClick: () => {
        router.push("/documents?upload=true");
        onAction?.("upload-doc");
      },
    },
  ];

  const quickActions = actions || defaultActions;

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className={cn("gap-2", className)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Actions</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={action.id}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={action.onClick}
                  className="cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button group variant
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

