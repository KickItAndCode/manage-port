/**
 * OAuth Callback Route for Apartments.com
 * Handles OAuth callback and stores tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { api } from '@/../convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';
import { OAuthService } from '@/lib/oauth-service';
import { getPlatformSafe } from '@/lib/listing-platforms';

const oauthService = new OAuthService();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(
        new URL('/sign-in?error=oauth_unauthorized', request.url)
      );
    }

    // Extract OAuth parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      const errorUrl = new URL('/settings?tab=platforms', request.url);
      errorUrl.searchParams.set('error', 'oauth_failed');
      errorUrl.searchParams.set('details', errorDescription || error);
      return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
      const errorUrl = new URL('/settings?tab=platforms', request.url);
      errorUrl.searchParams.set('error', 'oauth_invalid_params');
      return NextResponse.redirect(errorUrl);
    }

    // Get platform adapter
    const platform = getPlatformSafe('apartments_com');
    const oauthConfig = platform.settings.oauthConfig;
    
    if (!oauthConfig) {
      throw new Error('OAuth configuration missing');
    }

    // Exchange code for tokens
    const tokenResult = await oauthService.exchangeCodeForTokens(
      'apartments_com',
      oauthConfig,
      code,
      state,
      userId
    );

    if (!tokenResult.success || !tokenResult.tokens) {
      console.error('Token exchange failed:', tokenResult.error);
      const errorUrl = new URL('/settings?tab=platforms', request.url);
      errorUrl.searchParams.set('error', 'oauth_token_failed');
      errorUrl.searchParams.set('details', tokenResult.error || 'Unknown error');
      return NextResponse.redirect(errorUrl);
    }

    // Store tokens in database
    const tokens = tokenResult.tokens;
    await fetchMutation(api.platformTokens.storeTokens, {
      userId,
      platform: 'apartments_com',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt: tokens.expiresAt,
      platformUserId: tokens.platformUserId,
      platformUserEmail: tokens.platformUserEmail,
      platformAccountName: tokens.platformAccountName,
    });

    // Redirect to success page
    const successUrl = new URL('/settings?tab=platforms', request.url);
    successUrl.searchParams.set('success', 'oauth_connected');
    successUrl.searchParams.set('platform', 'apartments_com');
    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Redirect to error page
    const errorUrl = new URL('/settings?tab=platforms', request.url);
    errorUrl.searchParams.set('error', 'oauth_callback_failed');
    errorUrl.searchParams.set('details', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * Handle POST requests for webhook-style callbacks (if needed)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('OAuth webhook callback:', body);

    // Handle webhook-style OAuth callbacks if the platform supports them
    // For now, just log and return success
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook callback received' 
    });

  } catch (error) {
    console.error('OAuth webhook callback error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook callback failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}