/**
 * OAuth 2.0 Service for Platform Authentication
 * Handles OAuth flows, token storage, and automatic refresh
 */

import { ApiClient } from './api-client';
import { OAuthConfig, OAuthTokens } from './listing-platforms/types';

export interface StoredTokens extends OAuthTokens {
  platform: string;
  userId: string;
  issuedAt: string;
  lastRefreshedAt?: string;
  isValid: boolean;
  platformUserId?: string;
  platformUserEmail?: string;
  platformAccountName?: string;
}

export interface OAuthFlow {
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthUrlResult {
  authUrl: string;
  state: string;
}

export interface TokenExchangeResult {
  success: boolean;
  tokens?: StoredTokens;
  error?: string;
}

export class OAuthService {
  private apiClient: ApiClient;
  private flows: Map<string, OAuthFlow> = new Map();
  private readonly FLOW_EXPIRY_MINUTES = 15;

  constructor() {
    this.apiClient = new ApiClient('', {}, 1000);
    
    // Clean up expired flows every 5 minutes
    setInterval(() => this.cleanupExpiredFlows(), 5 * 60 * 1000);
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(
    platform: string,
    config: OAuthConfig,
    userId: string,
    usePKCE = false
  ): Promise<AuthUrlResult> {
    const state = this.generateSecureToken();
    const redirectUri = config.redirectUri;
    
    // Store flow information
    const flow: OAuthFlow = {
      state,
      redirectUri,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.FLOW_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    };

    if (usePKCE) {
      flow.codeVerifier = this.generateCodeVerifier();
    }

    this.flows.set(state, flow);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: config.scope.join(' '),
    });

    if (usePKCE && flow.codeVerifier) {
      const codeChallenge = await this.generateCodeChallenge(flow.codeVerifier);
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return { authUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    platform: string,
    config: OAuthConfig,
    code: string,
    state: string,
    userId: string
  ): Promise<TokenExchangeResult> {
    try {
      // Validate state parameter
      const flow = this.flows.get(state);
      if (!flow) {
        return {
          success: false,
          error: 'Invalid or expired state parameter',
        };
      }

      // Check if flow has expired
      if (new Date() > new Date(flow.expiresAt)) {
        this.flows.delete(state);
        return {
          success: false,
          error: 'Authorization flow has expired',
        };
      }

      // Prepare token exchange request
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: flow.redirectUri,
      });

      if (flow.codeVerifier) {
        tokenParams.append('code_verifier', flow.codeVerifier);
      }

      const client = new ApiClient(config.tokenUrl);
      const response = await client.post<any>('', tokenParams.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      const tokenData = response.data;

      // Validate response
      if (!tokenData.access_token) {
        return {
          success: false,
          error: 'No access token received from platform',
        };
      }

      // Calculate expiration time
      const expiresAt = tokenData.expires_in 
        ? Date.now() + (tokenData.expires_in * 1000)
        : undefined;

      // Get user info from platform if available
      let platformUserInfo = {};
      try {
        platformUserInfo = await this.fetchPlatformUserInfo(platform, tokenData.access_token);
      } catch (error) {
        console.warn(`Failed to fetch user info from ${platform}:`, error);
      }

      // Create stored tokens object
      const storedTokens: StoredTokens = {
        platform,
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt,
        issuedAt: new Date().toISOString(),
        isValid: true,
        ...platformUserInfo,
      };

      // Clean up the flow
      this.flows.delete(state);

      return {
        success: true,
        tokens: storedTokens,
      };

    } catch (error) {
      console.error('Token exchange failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    platform: string,
    config: OAuthConfig,
    refreshToken: string
  ): Promise<TokenExchangeResult> {
    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const client = new ApiClient(config.tokenUrl);
      const response = await client.post<any>('', tokenParams.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      const tokenData = response.data;

      if (!tokenData.access_token) {
        return {
          success: false,
          error: 'No access token received during refresh',
        };
      }

      // Calculate new expiration time
      const expiresAt = tokenData.expires_in 
        ? Date.now() + (tokenData.expires_in * 1000)
        : undefined;

      // Return refreshed tokens (partial update)
      const refreshedTokens: Partial<StoredTokens> = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Keep old if not provided
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt,
        lastRefreshedAt: new Date().toISOString(),
        isValid: true,
      };

      return {
        success: true,
        tokens: refreshedTokens as StoredTokens,
      };

    } catch (error) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Check if tokens are valid and not expired
   */
  areTokensValid(tokens: StoredTokens): boolean {
    if (!tokens.isValid || !tokens.accessToken) {
      return false;
    }

    // Check expiration if available
    if (tokens.expiresAt) {
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minute buffer
      return now < (tokens.expiresAt - bufferTime);
    }

    // If no expiration info, assume valid
    return true;
  }

  /**
   * Revoke tokens with platform
   */
  async revokeTokens(
    platform: string,
    config: OAuthConfig,
    tokens: StoredTokens
  ): Promise<boolean> {
    try {
      // Not all platforms support token revocation
      if (!config.authUrl.includes('revoke')) {
        console.warn(`Platform ${platform} may not support token revocation`);
      }

      const revokeUrl = config.authUrl.replace('/authorize', '/revoke');
      const revokeParams = new URLSearchParams({
        token: tokens.accessToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      const client = new ApiClient(revokeUrl);
      await client.post('', revokeParams.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      return true;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random token for state parameter
   */
  private generateSecureToken(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Fetch user information from platform (platform-specific)
   */
  private async fetchPlatformUserInfo(platform: string, accessToken: string): Promise<any> {
    // This would be implemented differently for each platform
    // For now, return empty object
    return {};
  }

  /**
   * Clean up expired OAuth flows
   */
  private cleanupExpiredFlows(): void {
    const now = new Date();
    for (const [state, flow] of this.flows.entries()) {
      if (now > new Date(flow.expiresAt)) {
        this.flows.delete(state);
      }
    }
  }

  /**
   * Get active flow count (for monitoring)
   */
  getActiveFlowCount(): number {
    return this.flows.size;
  }
}