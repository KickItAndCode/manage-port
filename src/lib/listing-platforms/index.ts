/**
 * Listing Platform Integration - Main Export
 * Registers all platform adapters and exports the registry
 */

import { platformRegistry } from './registry';
import { ApartmentsComAdapter } from './apartments-com';

// Register all platform adapters
const apartmentsComAdapter = new ApartmentsComAdapter();
platformRegistry.register(apartmentsComAdapter);

// Export everything
export * from './types';
export * from './registry';
export * from './apartments-com';
export { platformRegistry };

// Export pre-configured registry
export const getRegisteredPlatforms = () => platformRegistry.getAll();
export const getAvailablePlatforms = () => platformRegistry.getAvailable();
export const getPlatform = (platform: string) => platformRegistry.get(platform);

// Platform-specific exports
export { ApartmentsComAdapter };

/**
 * Initialize platform integrations
 * Call this once during application startup
 */
export function initializePlatforms() {
  console.log('Initializing listing platform integrations...');
  
  const stats = platformRegistry.getStats();
  console.log(`Platform Registry Stats:`, stats);
  
  // Log available platforms
  const available = platformRegistry.getAvailable();
  console.log(`Available platforms: ${available.map(p => p.platform).join(', ')}`);
  
  // Log configuration issues
  const all = platformRegistry.getAll();
  all.forEach(adapter => {
    const validation = platformRegistry.validatePlatform(adapter.platform);
    if (!validation.valid) {
      console.warn(`Platform ${adapter.platform} configuration issues:`, validation.errors);
    }
  });
}

/**
 * Get platform by name with error handling
 */
export function getPlatformSafe(platform: string) {
  const adapter = platformRegistry.get(platform);
  if (!adapter) {
    throw new Error(`Platform '${platform}' is not registered. Available platforms: ${getRegisteredPlatforms().map(p => p.platform).join(', ')}`);
  }
  return adapter;
}

/**
 * Check if platform is available and properly configured
 */
export function isPlatformAvailable(platform: string): boolean {
  const adapter = platformRegistry.get(platform);
  if (!adapter) return false;
  
  const validation = platformRegistry.validatePlatform(platform);
  return validation.valid;
}

/**
 * Get platform display information for UI
 */
export function getPlatformDisplayInfo() {
  return platformRegistry.getAll().map(adapter => ({
    platform: adapter.platform,
    displayName: adapter.settings.displayName,
    websiteUrl: adapter.settings.websiteUrl,
    logoUrl: adapter.settings.logoUrl,
    isAvailable: isPlatformAvailable(adapter.platform),
    pricing: adapter.settings.pricing,
    capabilities: adapter.settings.capabilities,
  }));
}