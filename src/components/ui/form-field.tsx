import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface FormFieldProps {
  label?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
  description?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, required, children, className, htmlFor, description, ...props }, ref) => {
    return (
      <div
        className={cn("space-y-2", className)}
        ref={ref}
        {...props}
      >
        {label && (
          <Label 
            htmlFor={htmlFor}
            className={cn(
              required && "after:content-['*'] after:ml-1 after:text-destructive"
            )}
          >
            {label}
          </Label>
        )}
        
        {children}
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
FormField.displayName = "FormField"

export { FormField }