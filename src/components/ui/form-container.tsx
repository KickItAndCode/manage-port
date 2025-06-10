import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated"
}

const FormContainer = React.forwardRef<HTMLDivElement, FormContainerProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        className={cn(
          // Base form container styling
          variant === "elevated" && [
            // Elevated variant with dark mode gradient
            "dark:bg-gradient-to-br dark:from-gray-900/50 dark:to-gray-800/30",
            "dark:border dark:border-gray-700/50 dark:rounded-lg dark:p-6"
          ],
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
FormContainer.displayName = "FormContainer"

export { FormContainer }