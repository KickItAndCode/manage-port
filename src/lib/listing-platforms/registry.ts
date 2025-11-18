/**
 * Platform Registry - Manages all listing platform adapters
 */

import { PlatformAdapter, PlatformRegistry } from './types';

class ListingPlatformRegistry implements PlatformRegistry {
  private adapters: Map<string, PlatformAdapter> = new Map();

  /**
   * Register a platform adapter
   */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      console.warn(`Platform adapter for '${adapter.platform}' is already registered. Overwriting.`);
    }
    
    this.adapters.set(adapter.platform, adapter);
    console.log(`Registered platform adapter: ${adapter.platform}`);
  }

  /**
   * Get a specific platform adapter
   */
  get(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Get all registered platform adapters
   */
  getAll(): PlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get only available platforms (with proper configuration)
   */
  getAvailable(): PlatformAdapter[] {
    return this.getAll().filter(adapter => this.isPlatformAvailable(adapter));
  }

  /**
   * Check if a platform is properly configured and available
   */
  private isPlatformAvailable(adapter: PlatformAdapter): boolean {
    // Check if OAuth configuration is present for platforms that require it
    if (adapter.settings.requiresOAuth) {
      const oauthConfig = adapter.settings.oauthConfig;
      if (!oauthConfig || !oauthConfig.clientId || !oauthConfig.clientSecret) {
        return false;
      }
    }

    // Platform is available if basic configuration exists
    return !!(adapter.settings.baseApiUrl && adapter.settings.capabilities);
  }

  /**
   * Get platforms by capability
   */
  getPlatformsByCapability(capability: string): PlatformAdapter[] {
    return this.getAvailable().filter(adapter => {
      const capabilities = adapter.settings.capabilities as any;
      return capabilities[capability] === true;
    });
  }

  /**
   * Get platforms that support free listings
   */
  getFreePlatforms(): PlatformAdapter[] {
    return this.getAvailable().filter(adapter => 
      adapter.settings.pricing.freeListings > 0
    );
  }

  /**
   * Get platforms sorted by cost (free first, then by price)
   */
  getPlatformsByCost(): PlatformAdapter[] {
    return this.getAvailable().sort((a, b) => {
      // Free platforms first
      if (a.settings.pricing.freeListings > 0 && b.settings.pricing.freeListings === 0) {
        return -1;
      }
      if (a.settings.pricing.freeListings === 0 && b.settings.pricing.freeListings > 0) {
        return 1;
      }

      // Then sort by paid listing cost
      const aCost = a.settings.pricing.paidListingCost || 0;
      const bCost = b.settings.pricing.paidListingCost || 0;
      return aCost - bCost;
    });
  }

  /**
   * Get platform statistics
   */
  getStats(): {
    total: number;
    available: number;
    requiresOAuth: number;
    supportsFreeListings: number;
  } {
    const all = this.getAll();
    const available = this.getAvailable();
    
    return {
      total: all.length,
      available: available.length,
      requiresOAuth: all.filter(a => a.settings.requiresOAuth).length,
      supportsFreeListings: all.filter(a => a.settings.pricing.freeListings > 0).length,
    };
  }

  /**
   * Validate platform configuration
   */
  validatePlatform(platform: string): {
    valid: boolean;
    errors: string[];
  } {
    const adapter = this.get(platform);
    const errors: string[] = [];

    if (!adapter) {
      return {
        valid: false,
        errors: [`Platform '${platform}' is not registered`],
      };
    }

    // Check required configuration
    if (!adapter.settings.baseApiUrl) {
      errors.push('Missing base API URL');
    }

    if (adapter.settings.requiresOAuth) {
      const oauth = adapter.settings.oauthConfig;
      if (!oauth) {
        errors.push('OAuth configuration is required but missing');
      } else {
        if (!oauth.clientId) errors.push('OAuth client ID is missing');
        if (!oauth.clientSecret) errors.push('OAuth client secret is missing');
        if (!oauth.authUrl) errors.push('OAuth authorization URL is missing');
        if (!oauth.tokenUrl) errors.push('OAuth token URL is missing');
      }
    }

    // Check capabilities configuration
    if (!adapter.settings.capabilities) {
      errors.push('Platform capabilities are not defined');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear all registered adapters (useful for testing)
   */
  clear(): void {
    this.adapters.clear();
  }

  /**
   * Unregister a specific platform
   */
  unregister(platform: string): boolean {
    return this.adapters.delete(platform);
  }
}

// Create singleton instance
export const platformRegistry = new ListingPlatformRegistry();

// Export type for dependency injection
export type { ListingPlatformRegistry };