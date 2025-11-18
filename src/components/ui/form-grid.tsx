import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4
  gap?: "sm" | "md" | "lg"
}

/**
 * FormGrid - Grid layout helper for multi-column forms
 * 
 * @example
 * <FormGrid cols={2}>
 *   <FormField label="Bedrooms">
 *     <Input type="number" />
 *   </FormField>
 *   <FormField label="Bathrooms">
 *     <Input type="number" />
 *   </FormField>
 * </FormGrid>
 */
const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  ({ className, cols = 2, gap = "md", children, ...props }, ref) => {
    const gapClasses = {
      sm: "gap-2",
      md: "gap-4",
      lg: "gap-6",
    }

    const gridColsClasses = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    }

    return (
      <div
        className={cn(
          "grid",
          gridColsClasses[cols],
          gapClasses[gap],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormGrid.displayName = "FormGrid"

export { FormGrid }

