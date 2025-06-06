import * as z from "zod";

// Shared validation schemas for consistent validation across client and server

// Property validation schema
export const propertySchema = z.object({
  name: z.string()
    .min(2, "Property name must be at least 2 characters")
    .max(100, "Property name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Property name contains invalid characters"),
  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be less than 200 characters"),
  type: z.enum(["Single Family", "Duplex", "Apartment", "Condo", "Townhouse", "Other"], {
    errorMap: () => ({ message: "Please select a valid property type" })
  }),
  status: z.enum(["Available", "Occupied", "Maintenance", "Under Contract"], {
    errorMap: () => ({ message: "Please select a valid property status" })
  }),
  bedrooms: z.coerce.number()
    .min(0, "Bedrooms must be 0 or greater")
    .max(20, "Bedrooms must be 20 or less")
    .int("Bedrooms must be a whole number"),
  bathrooms: z.coerce.number()
    .min(0, "Bathrooms must be 0 or greater")
    .max(20, "Bathrooms must be 20 or less"),
  squareFeet: z.coerce.number()
    .min(50, "Square feet must be at least 50")
    .max(50000, "Square feet must be less than 50,000")
    .int("Square feet must be a whole number"),
  monthlyRent: z.coerce.number()
    .min(0, "Monthly rent must be 0 or greater")
    .max(100000, "Monthly rent must be less than $100,000"),
  purchaseDate: z.string()
    .min(1, "Purchase date is required")
    .refine((date) => {
      const parsedDate = new Date(date);
      const now = new Date();
      return parsedDate <= now;
    }, "Purchase date cannot be in the future"),
  imageUrl: z.string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal(""))
});

// Lease validation schema
export const leaseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantName: z.string()
    .min(2, "Tenant name must be at least 2 characters")
    .max(100, "Tenant name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'.]+$/, "Tenant name contains invalid characters"),
  tenantEmail: z.string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  tenantPhone: z.string()
    .regex(/^(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  rent: z.coerce.number()
    .min(0, "Rent must be 0 or greater")
    .max(100000, "Rent must be less than $100,000"),
  securityDeposit: z.coerce.number()
    .min(0, "Security deposit must be 0 or greater")
    .max(100000, "Security deposit must be less than $100,000")
    .optional(),
  status: z.enum(["active", "expired", "pending"], {
    errorMap: () => ({ message: "Please select a valid lease status" })
  }),
  paymentDay: z.coerce.number()
    .min(1, "Payment day must be between 1 and 31")
    .max(31, "Payment day must be between 1 and 31")
    .int("Payment day must be a whole number")
    .optional(),
  notes: z.string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  leaseDocumentUrl: z.string()
    .refine((val) => {
      if (!val || val === "") return true; // Allow empty strings
      // Accept either valid URLs or Convex storage IDs (which start with "k" and are long)
      const isUrl = /^https?:\/\//.test(val);
      const isStorageId = /^k[a-zA-Z0-9_-]{20,}$/.test(val);
      return isUrl || isStorageId;
    }, "Must be a valid URL or storage ID")
    .optional()
    .or(z.literal(""))
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => {
  // If security deposit is provided, it shouldn't exceed 3 months rent
  if (data.securityDeposit && data.rent) {
    return data.securityDeposit <= (data.rent * 3);
  }
  return true;
}, {
  message: "Security deposit should not exceed 3 months rent",
  path: ["securityDeposit"],
});


// Document validation schema
export const documentSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  name: z.string()
    .min(1, "Document name is required")
    .max(200, "Document name must be less than 200 characters"),
  type: z.string()
    .min(1, "Document type is required")
    .max(50, "Document type must be less than 50 characters"),
  url: z.string()
    .url("Must be a valid URL")
    .min(1, "Document URL is required"),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional()
});

// User input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Email validation helper
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation helper
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;
  return phoneRegex.test(phone);
};

// URL validation helper
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Date validation helpers
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
};

export const isPastDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
};

// Type exports for TypeScript
export type PropertyFormData = z.infer<typeof propertySchema>;
export type LeaseFormData = z.infer<typeof leaseSchema>;
export type DocumentFormData = z.infer<typeof documentSchema>;