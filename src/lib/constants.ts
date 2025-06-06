// Standardized utility types across the application
export const UTILITY_TYPES = [
  "Electric",
  "Water", 
  "Gas",
  "Sewer",
  "Trash",
  "Internet",
  "Cable",
] as const;

export type UtilityType = typeof UTILITY_TYPES[number];

// Utility type configuration with UI metadata
export const UTILITY_CONFIG = [
  { type: "Electric" as const, label: "Electric", color: "text-yellow-600" },
  { type: "Water" as const, label: "Water", color: "text-blue-600" },
  { type: "Gas" as const, label: "Gas", color: "text-orange-600" },
  { type: "Sewer" as const, label: "Sewer", color: "text-green-600" },
  { type: "Trash" as const, label: "Trash", color: "text-gray-600" },
  { type: "Internet" as const, label: "Internet", color: "text-purple-600" },
  { type: "Cable" as const, label: "Cable", color: "text-purple-600" },
] as const;

// Document types for the document management system
export const DOCUMENT_TYPES = {
  LEASE: "lease",
  UTILITY_BILL: "utility_bill",
  PROPERTY: "property", 
  INSURANCE: "insurance",
  TAX: "tax",
  MAINTENANCE: "maintenance",
  OTHER: "other",
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
} as const;

// Folder icons
export const FOLDER_ICONS = {
  DEFAULT: "folder",
  LEASE: "file-text",
  UTILITY_BILL: "zap",
  PROPERTY: "home",
  INSURANCE: "shield",
  TAX: "calculator",
  MAINTENANCE: "wrench",
  OTHER: "file",
} as const;

// Document type labels
export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.LEASE]: "Lease Agreement",
  [DOCUMENT_TYPES.UTILITY_BILL]: "Utility Bill",
  [DOCUMENT_TYPES.PROPERTY]: "Property Document",
  [DOCUMENT_TYPES.INSURANCE]: "Insurance Document",
  [DOCUMENT_TYPES.TAX]: "Tax Document",
  [DOCUMENT_TYPES.MAINTENANCE]: "Maintenance Record",
  [DOCUMENT_TYPES.OTHER]: "Other Document",
} as const;