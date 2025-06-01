import { cn } from "@/lib/utils";
import { 
  Home, 
  Users, 
  Wrench, 
  FileSignature,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "compact";
  className?: string;
}

const statusConfig = {
  // Property statuses
  "Available": {
    label: "Available",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    iconClassName: "text-green-600 dark:text-green-400"
  },
  "Vacant": {
    label: "Vacant",
    icon: Home,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    iconClassName: "text-yellow-600 dark:text-yellow-400"
  },
  "Occupied": {
    label: "Occupied",
    icon: Users,
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    iconClassName: "text-blue-600 dark:text-blue-400"
  },
  "Under Maintenance": {
    label: "Maintenance",
    icon: Wrench,
    className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    iconClassName: "text-orange-600 dark:text-orange-400"
  },
  "Maintenance": {
    label: "Maintenance",
    icon: Wrench,
    className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    iconClassName: "text-orange-600 dark:text-orange-400"
  },
  "Under Contract": {
    label: "Under Contract",
    icon: FileSignature,
    className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    iconClassName: "text-purple-600 dark:text-purple-400"
  },
  // Lease statuses
  "active": {
    label: "Active",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    iconClassName: "text-green-600 dark:text-green-400"
  },
  "pending": {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
    iconClassName: "text-yellow-600 dark:text-yellow-400"
  },
  "expired": {
    label: "Expired",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    iconClassName: "text-red-600 dark:text-red-400"
  },
  // Default fallback
  "default": {
    label: "Unknown",
    icon: AlertCircle,
    className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
    iconClassName: "text-gray-600 dark:text-gray-400"
  }
};

export function StatusBadge({ status, variant = "default", className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.default;
  const Icon = config.icon;

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          config.className,
          className
        )}
      >
        <Icon className={cn("h-3 w-3", config.iconClassName)} />
        {config.label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium border transition-all duration-200 hover:shadow-sm",
        config.className,
        className
      )}
    >
      <Icon className={cn("h-4 w-4", config.iconClassName)} />
      <span>{config.label}</span>
    </div>
  );
}