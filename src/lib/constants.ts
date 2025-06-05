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