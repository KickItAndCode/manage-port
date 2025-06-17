import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ 
  className, 
  type, 
  "data-testid": dataTestId,
  ...props 
}: React.ComponentProps<"input"> & {
  "data-testid"?: string
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-testid={dataTestId}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "flex h-10 w-full min-w-0 rounded-md border px-3 py-2 text-sm transition-all outline-none",
        "bg-background dark:bg-gray-900/50",
        "border-input dark:border-gray-700",
        "focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary",
        "hover:border-gray-400 dark:hover:border-gray-600",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
