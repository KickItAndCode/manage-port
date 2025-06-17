import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  "data-testid"?: string;
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, "data-testid": dataTestId, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-gray-900/50 dark:border-gray-700",
          "hover:border-gray-400 dark:hover:border-gray-600",
          "focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30",
          "focus:border-primary dark:focus:border-primary",
          className
        )}
        data-testid={dataTestId}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    )
  }
)
SelectNative.displayName = "SelectNative"

export { SelectNative }