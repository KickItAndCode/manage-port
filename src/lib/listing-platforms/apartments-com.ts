/**
 * Apartments.com Platform Adapter
 * Implements listing integration for Apartments.com
 */

import { ApiClient } from '../api-client';
import { 
  PlatformAdapter, 
  PlatformSettings, 
  ListingData, 
  ListingPublishResult, 
  ListingUpdateResult, 
  ListingStatusResult,
  OAuthTokens,
  ValidationResult,
  ValidationError
} from './types';

export class ApartmentsComAdapter implements PlatformAdapter {
  readonly platform = 'apartments_com';
  readonly settings: PlatformSettings;
  private apiClient: ApiClient;

  constructor() {
    this.settings = {
      platform: 'apartments_com',
      displayName: 'Apartments.com',
      websiteUrl: 'https://www.apartments.com',
      logoUrl: 'https://www.apartments.com/favicon.ico',
      
      baseApiUrl: 'https://api.apartments.com/v1',
      apiVersion: 'v1',
      
      requiresOAuth: true,
      oauthConfig: {
        clientId: process.env.APARTMENTS_COM_CLIENT_ID || '',
        clientSecret: process.env.APARTMENTS_COM_CLIENT_SECRET || '',
        redirectUri: process.env.APARTMENTS_COM_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/apartments-com/callback`,
        scope: ['listings:write', 'listings:read', 'account:read'],
        authUrl: 'https://auth.apartments.com/oauth/authorize',
        tokenUrl: 'https://auth.apartments.com/oauth/token',
      },
      
      capabilities: {
        supportsImages: true,
        maxImages: 20,
        supportedImageFormats: ['jpeg', 'jpg', 'png'],
        maxImageSizeBytes: 10 * 1024 * 1024, // 10MB limit
        
        supportsVirtualTours: true,
        supportsFloorPlans: true,
        supportsMultipleUnits: true,
        
        supportsPaidPromotion: true,
        supportsFeaturedListings: true,
        
        allowsRealTimeUpdates: true,
        minUpdateIntervalMinutes: 15,
        
        requestsPerMinute: 30,
        dailyRequestLimit: 1000,
      },
      
      pricing: {
        freeListings: 1, // 1 free listing per property
        paidListingCost: 49.99, // $49.99/month for additional listings
        featuredListingCost: 99.99, // $99.99/month for featured placement
        currency: 'USD',
      },
    };

    this.apiClient = new ApiClient(
      this.settings.baseApiUrl,
      {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      2000 // 2-second rate limit for Apartments.com
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state: string): string {
    const config = this.settings.oauthConfig!;
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<OAuthTokens> {
    const config = this.settings.oauthConfig!;
    
    const tokenData = {
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    };

    const response = await this.apiClient.post<any>(
      config.tokenUrl,
      tokenData,
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    const tokens = response.data;
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined,
      tokenType: tokens.token_type || 'Bearer',
    };
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = this.settings.oauthConfig!;
    
    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    };

    const response = await this.apiClient.post<any>(
      config.tokenUrl,
      refreshData,
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    const tokens = response.data;
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresAt: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined,
      tokenType: tokens.token_type || 'Bearer',
    };
  }

  /**
   * Publish listing to Apartments.com
   */
  async publishListing(data: ListingData, tokens: OAuthTokens): Promise<ListingPublishResult> {
    try {
      // Set authentication
      this.apiClient.setAuthHeader(tokens.accessToken, 'Bearer');

      // Transform data to Apartments.com format
      const apartmentsData = this.transformToApartmentsFormat(data);

      // Validate the data
      const validation = this.validateListingData(data);
      if (!validation.valid) {
        return {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          errorDetails: validation.errors,
        };
      }

      // Create the listing
      const response = await this.apiClient.post<any>('/listings', apartmentsData);
      const listingResult = response.data;

      return {
        success: true,
        externalId: listingResult.id,
        externalUrl: listingResult.url || `https://www.apartments.com/listing/${listingResult.id}`,
        message: 'Listing published successfully',
      };

    } catch (error: any) {
      return this.handleApiError(error, 'publish');
    }
  }

  /**
   * Update existing listing
   */
  async updateListing(externalId: string, data: ListingData, tokens: OAuthTokens): Promise<ListingUpdateResult> {
    try {
      this.apiClient.setAuthHeader(tokens.accessToken, 'Bearer');

      const apartmentsData = this.transformToApartmentsFormat(data);
      const validation = this.validateListingData(data);
      
      if (!validation.valid) {
        return {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          errorDetails: validation.errors,
        };
      }

      await this.apiClient.put(`/listings/${externalId}`, apartmentsData);

      return {
        success: true,
        message: 'Listing updated successfully',
      };

    } catch (error: any) {
      return this.handleApiError(error, 'update');
    }
  }

  /**
   * Delete listing from platform
   */
  async deleteListing(externalId: string, tokens: OAuthTokens): Promise<void> {
    this.apiClient.setAuthHeader(tokens.accessToken, 'Bearer');
    await this.apiClient.delete(`/listings/${externalId}`);
  }

  /**
   * Get listing status
   */
  async getListingStatus(externalId: string, tokens: OAuthTokens): Promise<ListingStatusResult> {
    this.apiClient.setAuthHeader(tokens.accessToken, 'Bearer');
    
    const response = await this.apiClient.get<any>(`/listings/${externalId}`);
    const listing = response.data;

    return {
      status: this.mapApartmentsStatus(listing.status),
      externalId: listing.id,
      externalUrl: listing.url,
      lastUpdated: listing.updated_at || new Date().toISOString(),
      errorMessage: listing.error_message,
    };
  }

  /**
   * Transform property data to Apartments.com format
   */
  transformPropertyData(propertyData: any): ListingData {
    return {
      title: propertyData.name || `${propertyData.bedrooms}BR/${propertyData.bathrooms}BA at ${propertyData.address}`,
      description: propertyData.description || `Beautiful ${propertyData.bedrooms} bedroom, ${propertyData.bathrooms} bathroom property`,
      propertyType: this.mapPropertyType(propertyData.type),
      
      address: {
        street: propertyData.address,
        city: propertyData.city || '',
        state: propertyData.state || '',
        zipCode: propertyData.zipCode || '',
        country: 'US',
      },
      
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      squareFeet: propertyData.squareFeet,
      
      monthlyRent: propertyData.monthlyRent || 0,
      securityDeposit: propertyData.securityDeposit,
      
      availableDate: propertyData.availableDate || new Date().toISOString(),
      
      images: propertyData.images || [],
      
      contactMethod: 'form',
      contactInfo: {
        name: propertyData.contactName,
        email: propertyData.contactEmail,
        phone: propertyData.contactPhone,
      },
      
      petPolicy: propertyData.petPolicy || 'case-by-case',
      smokingPolicy: propertyData.smokingPolicy || 'not-allowed',
    };
  }

  /**
   * Validate listing data for Apartments.com requirements
   */
  validateListingData(data: ListingData): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    if (!data.title || data.title.length < 10) {
      errors.push({
        field: 'title',
        message: 'Title must be at least 10 characters long',
        code: 'TITLE_TOO_SHORT',
      });
    }

    if (!data.description || data.description.length < 50) {
      errors.push({
        field: 'description',
        message: 'Description must be at least 50 characters long',
        code: 'DESCRIPTION_TOO_SHORT',
      });
    }

    if (!data.address.street || !data.address.city || !data.address.state) {
      errors.push({
        field: 'address',
        message: 'Complete address (street, city, state) is required',
        code: 'INCOMPLETE_ADDRESS',
      });
    }

    if (data.bedrooms < 0 || data.bedrooms > 10) {
      errors.push({
        field: 'bedrooms',
        message: 'Bedrooms must be between 0 and 10',
        code: 'INVALID_BEDROOMS',
      });
    }

    if (data.bathrooms < 0 || data.bathrooms > 10) {
      errors.push({
        field: 'bathrooms',
        message: 'Bathrooms must be between 0 and 10',
        code: 'INVALID_BATHROOMS',
      });
    }

    if (data.monthlyRent <= 0) {
      errors.push({
        field: 'monthlyRent',
        message: 'Monthly rent must be greater than 0',
        code: 'INVALID_RENT',
      });
    }

    // Image validation
    if (data.images.length > this.settings.capabilities.maxImages) {
      errors.push({
        field: 'images',
        message: `Maximum ${this.settings.capabilities.maxImages} images allowed`,
        code: 'TOO_MANY_IMAGES',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transform data to Apartments.com API format
   */
  private transformToApartmentsFormat(data: ListingData): any {
    return {
      title: data.title,
      description: data.description,
      property_type: this.mapPropertyTypeToApartments(data.propertyType),
      
      address: {
        street_address: data.address.street,
        city: data.address.city,
        state: data.address.state,
        zip_code: data.address.zipCode,
      },
      
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      square_feet: data.squareFeet,
      
      rent: data.monthlyRent,
      security_deposit: data.securityDeposit,
      application_fee: data.applicationFee,
      
      available_date: data.availableDate,
      lease_duration: data.leaseDuration,
      
      images: data.images.map(img => ({
        url: img.url,
        caption: img.caption,
        is_primary: img.isPrimary,
        sort_order: img.order,
      })),
      
      contact: {
        method: data.contactMethod,
        name: data.contactInfo.name,
        email: data.contactInfo.email,
        phone: data.contactInfo.phone,
      },
      
      policies: {
        pets: data.petPolicy,
        smoking: data.smokingPolicy,
      },
      
      // Apartments.com specific fields
      amenities: data.platformOverrides?.amenities || [],
      lease_terms: data.platformOverrides?.leaseTerms || [],
      utilities_included: data.platformOverrides?.utilitiesIncluded || [],
    };
  }

  /**
   * Map generic property type to Apartments.com specific type
   */
  private mapPropertyTypeToApartments(type: string): string {
    const typeMap: Record<string, string> = {
      'single-family': 'house',
      'multi-family': 'apartment',
      'apartment': 'apartment',
      'condo': 'condo',
      'townhouse': 'townhouse',
    };
    return typeMap[type] || 'apartment';
  }

  /**
   * Map property type from generic format
   */
  private mapPropertyType(type: string): 'single-family' | 'multi-family' | 'apartment' | 'condo' | 'townhouse' {
    const typeMap: Record<string, any> = {
      'Single Family': 'single-family',
      'Multi Family': 'multi-family',
      'Apartment': 'apartment',
      'Condo': 'condo',
      'Townhouse': 'townhouse',
    };
    return typeMap[type] || 'apartment';
  }

  /**
   * Map Apartments.com status to generic status
   */
  private mapApartmentsStatus(status: string): 'active' | 'expired' | 'paused' | 'error' {
    const statusMap: Record<string, any> = {
      'active': 'active',
      'published': 'active',
      'live': 'active',
      'expired': 'expired',
      'inactive': 'paused',
      'paused': 'paused',
      'error': 'error',
      'rejected': 'error',
    };
    return statusMap[status.toLowerCase()] || 'error';
  }

  /**
   * Handle API errors consistently
   */
  private handleApiError(error: any, operation: string): ListingPublishResult | ListingUpdateResult {
    const result: any = {
      success: false,
      errorDetails: error,
    };

    if (error.status === 401) {
      result.errorCode = 'UNAUTHORIZED';
      result.message = 'Authentication failed. Please reconnect your Apartments.com account.';
    } else if (error.status === 403) {
      result.errorCode = 'FORBIDDEN';
      result.message = 'Access denied. Check your account permissions.';
    } else if (error.status === 429) {
      result.errorCode = 'RATE_LIMITED';
      result.message = 'Too many requests. Please wait before trying again.';
    } else if (error.status >= 400 && error.status < 500) {
      result.errorCode = 'CLIENT_ERROR';
      result.message = `Request failed: ${error.message}`;
    } else if (error.status >= 500) {
      result.errorCode = 'SERVER_ERROR';
      result.message = 'Apartments.com server error. Please try again later.';
    } else {
      result.errorCode = 'UNKNOWN_ERROR';
      result.message = `Failed to ${operation} listing: ${error.message}`;
    }

    return result;
  }
}