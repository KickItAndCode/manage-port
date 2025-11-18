import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center" | "between"
  gap?: "sm" | "md" | "lg"
}

/**
 * FormActions - Standardized form action buttons container
 * 
 * @example
 * <FormActions>
 *   <Button type="button" variant="outline" onClick={onCancel}>
 *     Cancel
 *   </Button>
 *   <Button type="submit" disabled={loading}>
 *     {loading ? 'Saving...' : 'Save'}
 *   </Button>
 * </FormActions>
 */
const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = "end", gap = "md", children, ...props }, ref) => {
    const alignClasses = {
      start: "justify-start",
      end: "justify-end",
      center: "justify-center",
      between: "justify-between",
    }

    const gapClasses = {
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    }

    return (
      <div
        className={cn(
          "flex items-center",
          alignClasses[align],
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
FormActions.displayName = "FormActions"

export { FormActions }

