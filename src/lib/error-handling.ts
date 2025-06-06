import { ConvexError } from "convex/values";

// Error types for different scenarios
export enum ErrorType {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  RATE_LIMIT = "RATE_LIMIT",
  NETWORK = "NETWORK",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN"
}

// Standard error interface
export interface AppError {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
  code?: string;
  retryable?: boolean;
}

// Error class for application errors
export class ApplicationError extends Error implements AppError {
  public type: ErrorType;
  public details?: Record<string, any>;
  public code?: string;
  public retryable?: boolean;

  constructor(
    type: ErrorType,
    message: string,
    details?: Record<string, any>,
    code?: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = "ApplicationError";
    this.type = type;
    this.details = details;
    this.code = code;
    this.retryable = retryable;
  }
}

// Extract user-friendly message from Convex error
const extractConvexErrorMessage = (error: any): string => {
  let errorMessage = error.message || error.data?.message || "An unexpected error occurred";
  
  // Clean up Convex server error format
  if (errorMessage.includes("Server Error\nUncaught Error:")) {
    errorMessage = errorMessage.split("Server Error\nUncaught Error:")[1]?.trim() || errorMessage;
  }
  if (errorMessage.includes("Uncaught Error:")) {
    errorMessage = errorMessage.split("Uncaught Error:")[1]?.trim() || errorMessage;
  }
  
  // Handle specific common errors with user-friendly messages
  if (errorMessage.includes("already exists")) {
    if (errorMessage.includes("Electric bill") || errorMessage.includes("utility bill")) {
      const match = errorMessage.match(/A (.+) bill for (.+) already exists/);
      if (match) {
        const [, utilityType, month] = match;
        const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return `A ${utilityType.toLowerCase()} bill for ${monthName} already exists. Please edit the existing bill or choose a different month.`;
      }
    }
    if (errorMessage.includes("Property")) {
      return "A property with this name already exists. Please choose a different name.";
    }
    if (errorMessage.includes("lease")) {
      return "A lease already exists for this tenant and property. Please check existing leases or edit the current one.";
    }
    return "This item already exists. Please check for duplicates or choose different details.";
  }
  
  if (errorMessage.includes("not found")) {
    if (errorMessage.includes("Property")) {
      return "The selected property was not found. It may have been deleted by another user.";
    }
    if (errorMessage.includes("lease")) {
      return "The lease was not found. It may have been deleted or modified.";
    }
    if (errorMessage.includes("User")) {
      return "User not found. Please sign in again.";
    }
    return "The requested item was not found. It may have been deleted or moved.";
  }
  
  if (errorMessage.includes("unauthorized") || errorMessage.includes("Unauthorized")) {
    return "You don't have permission to perform this action.";
  }
  
  if (errorMessage.includes("unauthenticated") || errorMessage.includes("Not authenticated")) {
    return "Please sign in to continue.";
  }
  
  if (errorMessage.includes("validation") || errorMessage.includes("Invalid")) {
    return "Please check your input and try again. Some required information may be missing or incorrect.";
  }
  
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  
  // Return cleaned up message for other cases
  return errorMessage;
};

// Convex error handlers
export const handleConvexError = (error: any): AppError => {
  const cleanMessage = extractConvexErrorMessage(error);
  
  // Handle ConvexError instances
  if (error instanceof ConvexError) {
    return {
      type: ErrorType.SERVER,
      message: cleanMessage,
      details: error.data,
      code: error.data?.code,
      retryable: false
    };
  }

  // Handle network errors
  if (error.message?.includes("network") || error.message?.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      message: "Network error. Please check your connection and try again.",
      retryable: true
    };
  }

  // Handle authentication errors
  if (error.message?.includes("Unauthenticated") || error.message?.includes("401") || error.message?.includes("Not authenticated")) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: "Please sign in to continue",
      retryable: false
    };
  }

  // Handle authorization errors
  if (error.message?.includes("Unauthorized") || error.message?.includes("403")) {
    return {
      type: ErrorType.AUTHORIZATION,
      message: "You don't have permission to perform this action",
      retryable: false
    };
  }

  // Handle not found errors
  if (error.message?.includes("not found") || error.message?.includes("404")) {
    return {
      type: ErrorType.NOT_FOUND,
      message: cleanMessage,
      retryable: false
    };
  }

  // Handle conflict errors (already exists)
  if (error.message?.includes("already exists")) {
    return {
      type: ErrorType.CONFLICT,
      message: cleanMessage,
      retryable: false
    };
  }

  // Handle rate limiting
  if (error.message?.includes("rate limit") || error.message?.includes("429")) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: "Too many requests. Please wait a moment and try again.",
      retryable: true
    };
  }

  // Default to server error with cleaned message
  return {
    type: ErrorType.SERVER,
    message: cleanMessage,
    retryable: false
  };
};

// Clerk error handlers
export const handleClerkError = (error: any): AppError => {
  const errorCode = error.errors?.[0]?.code || error.code;
  const errorMessage = error.errors?.[0]?.message || error.message;

  switch (errorCode) {
    case "form_identifier_not_found":
      return {
        type: ErrorType.AUTHENTICATION,
        message: "Email address not found. Please check your email or sign up.",
        retryable: false
      };
    
    case "form_password_incorrect":
      return {
        type: ErrorType.AUTHENTICATION,
        message: "Incorrect password. Please try again.",
        retryable: false
      };
    
    case "form_identifier_exists":
      return {
        type: ErrorType.CONFLICT,
        message: "An account with this email already exists. Please sign in instead.",
        retryable: false
      };
    
    case "form_password_pwned":
      return {
        type: ErrorType.VALIDATION,
        message: "This password has been compromised. Please choose a different password.",
        retryable: false
      };
    
    case "form_password_validation_failed":
      return {
        type: ErrorType.VALIDATION,
        message: "Password must be at least 8 characters long.",
        retryable: false
      };
    
    case "session_exists":
      return {
        type: ErrorType.CONFLICT,
        message: "You are already signed in.",
        retryable: false
      };
    
    default:
      return {
        type: ErrorType.AUTHENTICATION,
        message: errorMessage || "Authentication error occurred",
        retryable: false
      };
  }
};

// Form validation error handler
export const handleValidationError = (error: any): AppError => {
  if (error.issues && Array.isArray(error.issues)) {
    // Zod validation error
    const fieldErrors = error.issues.reduce((acc: Record<string, string>, issue: any) => {
      const field = issue.path.join('.');
      acc[field] = issue.message;
      return acc;
    }, {});

    return {
      type: ErrorType.VALIDATION,
      message: "Please correct the errors below",
      details: { fieldErrors }
    };
  }

  return {
    type: ErrorType.VALIDATION,
    message: error.message || "Validation failed",
    details: error.details
  };
};

// Generic error handler that routes to specific handlers
export const handleError = (error: any, context?: string): AppError => {
  // Log error for debugging (in development)
  if (process.env.NODE_ENV === "development") {
    console.error(`Error in ${context || "unknown context"}:`, error);
  }

  // Handle different error types
  if (error.name === "ZodError") {
    return handleValidationError(error);
  }

  if (error.name === "ConvexError" || error.data) {
    return handleConvexError(error);
  }

  if (error.errors && error.errors[0]?.code) {
    return handleClerkError(error);
  }

  if (error instanceof ApplicationError) {
    return error;
  }

  // Default error handling
  return handleConvexError(error);
};

// User-friendly error messages
export const getErrorMessage = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return error.message;
    
    case ErrorType.AUTHENTICATION:
      return "Please sign in to continue";
    
    case ErrorType.AUTHORIZATION:
      return "You don't have permission to perform this action";
    
    case ErrorType.NOT_FOUND:
      return "The requested item was not found";
    
    case ErrorType.CONFLICT:
      return error.message || "A conflict occurred with existing data";
    
    case ErrorType.RATE_LIMIT:
      return "Too many requests. Please wait a moment and try again.";
    
    case ErrorType.NETWORK:
      return "Network error. Please check your connection and try again.";
    
    case ErrorType.SERVER:
      return "A server error occurred. Please try again.";
    
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

// Check if error is retryable
export const isRetryableError = (error: AppError): boolean => {
  return error.retryable === true || 
         error.type === ErrorType.NETWORK || 
         error.type === ErrorType.RATE_LIMIT;
};

// Create toast-friendly error object
export const createToastError = (error: AppError) => {
  return {
    title: error.type === ErrorType.VALIDATION ? "Validation Error" : "Error",
    description: getErrorMessage(error),
    variant: "destructive" as const,
    action: isRetryableError(error) ? "Retry" : undefined
  };
};

// Simple helper to format any error for toast display
export const formatErrorForToast = (error: any): string => {
  const appError = handleError(error);
  return appError.message;
};

// Async error boundary helper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    return { error: handleError(error, context) };
  }
};

// React error boundary helper
export const createErrorBoundaryFallback = (error: Error, resetError: () => void) => {
  const appError = handleError(error, "React Error Boundary");
  
  return {
    title: "Something went wrong",
    message: getErrorMessage(appError),
    canRetry: isRetryableError(appError),
    onRetry: resetError
  };
};