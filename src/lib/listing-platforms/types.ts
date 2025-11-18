/**
 * Common types and interfaces for listing platform integrations
 */

import { Id } from "../../../convex/_generated/dataModel";

/**
 * Standard listing data format - normalized across all platforms
 */
export interface ListingData {
  // Property basics
  title: string;
  description: string;
  propertyType: 'single-family' | 'multi-family' | 'apartment' | 'condo' | 'townhouse';
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  
  // Property details
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  
  // Financial
  monthlyRent: number;
  securityDeposit?: number;
  applicationFee?: number;
  petDeposit?: number;
  
  // Availability
  availableDate: string; // ISO date string
  leaseDuration?: string; // "month-to-month", "12-month", etc.
  
  // Images
  images: ListingImage[];
  
  // Contact & policies
  contactMethod: 'phone' | 'email' | 'form';
  contactInfo: {
    name?: string;
    phone?: string;
    email?: string;
  };
  
  // Policies
  petPolicy?: 'allowed' | 'not-allowed' | 'cats-only' | 'dogs-only' | 'case-by-case';
  smokingPolicy?: 'allowed' | 'not-allowed';
  
  // Platform-specific overrides
  platformOverrides?: Record<string, any>;
}

export interface ListingImage {
  url: string;
  caption?: string;
  isPrimary: boolean;
  order: number;
}

/**
 * Platform adapter response types
 */
export interface ListingPublishResult {
  success: boolean;
  externalId?: string; // Platform's listing ID
  externalUrl?: string; // Direct URL to listing
  message?: string;
  errorCode?: string;
  errorDetails?: any;
}

export interface ListingUpdateResult {
  success: boolean;
  message?: string;
  errorCode?: string;
  errorDetails?: any;
}

export interface ListingStatusResult {
  status: 'active' | 'expired' | 'paused' | 'error';
  externalId: string;
  externalUrl?: string;
  lastUpdated: string;
  errorMessage?: string;
}

/**
 * OAuth configuration for platform authentication
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  tokenType?: string; // Usually "Bearer"
}

/**
 * Platform capabilities and limitations
 */
export interface PlatformCapabilities {
  // Features supported
  supportsImages: boolean;
  maxImages: number;
  supportedImageFormats: string[]; // ['jpeg', 'png', 'webp']
  maxImageSizeBytes: number;
  
  // Listing features
  supportsVirtualTours: boolean;
  supportsFloorPlans: boolean;
  supportsMultipleUnits: boolean;
  
  // Pricing & promotion
  supportsPaidPromotion: boolean;
  supportsFeaturedListings: boolean;
  
  // Update frequency
  allowsRealTimeUpdates: boolean;
  minUpdateIntervalMinutes: number;
  
  // Rate limiting
  requestsPerMinute: number;
  dailyRequestLimit?: number;
}

/**
 * Platform-specific settings and metadata
 */
export interface PlatformSettings {
  platform: string;
  displayName: string;
  websiteUrl: string;
  logoUrl?: string;
  
  // API configuration
  baseApiUrl: string;
  apiVersion?: string;
  
  // Authentication
  requiresOAuth: boolean;
  oauthConfig?: OAuthConfig;
  
  // Capabilities
  capabilities: PlatformCapabilities;
  
  // Cost structure
  pricing: {
    freeListings: number;
    paidListingCost?: number; // Per listing per month
    featuredListingCost?: number;
    currency: string;
  };
}

/**
 * Base interface that all platform adapters must implement
 */
export interface PlatformAdapter {
  readonly platform: string;
  readonly settings: PlatformSettings;

  // Authentication
  getAuthUrl(state: string): string;
  exchangeCodeForTokens(code: string, state: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  
  // Listing operations
  publishListing(data: ListingData, tokens: OAuthTokens): Promise<ListingPublishResult>;
  updateListing(externalId: string, data: ListingData, tokens: OAuthTokens): Promise<ListingUpdateResult>;
  deleteListing(externalId: string, tokens: OAuthTokens): Promise<void>;
  
  // Status checking
  getListingStatus(externalId: string, tokens: OAuthTokens): Promise<ListingStatusResult>;
  
  // Data transformation
  transformPropertyData(propertyData: any): ListingData;
  validateListingData(data: ListingData): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Platform registry for managing multiple adapters
 */
export interface PlatformRegistry {
  register(adapter: PlatformAdapter): void;
  get(platform: string): PlatformAdapter | undefined;
  getAll(): PlatformAdapter[];
  getAvailable(): PlatformAdapter[]; // Only platforms with valid credentials
}

/**
 * Listing publication job configuration
 */
export interface ListingPublishJob {
  id: string;
  userId: string;
  propertyId: Id<"properties">;
  platforms: string[];
  listingData: ListingData;
  createdAt: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  results: Record<string, ListingPublishResult>;
  errors: Record<string, string>;
}

/**
 * Bulk operation configuration
 */
export interface BulkPublishConfig {
  propertyIds: Id<"properties">[];
  platforms: string[];
  publishImmediately: boolean;
  scheduledFor?: string; // ISO date string
}

/**
 * Real-time progress tracking
 */
export interface PublishProgress {
  jobId: string;
  totalPlatforms: number;
  completedPlatforms: number;
  currentPlatform?: string;
  status: 'starting' | 'in-progress' | 'completed' | 'failed';
  results: Record<string, ListingPublishResult>;
  startedAt: string;
  completedAt?: string;
}