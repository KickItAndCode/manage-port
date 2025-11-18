/**
 * OAuth Authorization Route for Apartments.com
 * Initiates OAuth flow and redirects user to platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { OAuthService } from '@/lib/oauth-service';
import { getPlatformSafe } from '@/lib/listing-platforms';

const oauthService = new OAuthService();

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get platform adapter
    const platform = getPlatformSafe('apartments_com');
    const oauthConfig = platform.settings.oauthConfig;
    
    if (!oauthConfig) {
      return NextResponse.json(
        { error: 'OAuth not configured for this platform' },
        { status: 500 }
      );
    }

    // Generate authorization URL
    const { authUrl, state } = await oauthService.generateAuthUrl(
      'apartments_com',
      oauthConfig,
      userId,
      true // Use PKCE for enhanced security
    );

    // Redirect to platform authorization page
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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

    // Get request body
    const body = await request.json();
    const { returnUrl } = body;

    // Get platform adapter
    const platform = getPlatformSafe('apartments_com');
    const oauthConfig = platform.settings.oauthConfig;
    
    if (!oauthConfig) {
      return NextResponse.json(
        { error: 'OAuth not configured for this platform' },
        { status: 500 }
      );
    }

    // Generate authorization URL
    const { authUrl, state } = await oauthService.generateAuthUrl(
      'apartments_com',
      oauthConfig,
      userId,
      true
    );

    // Return authorization URL (for AJAX requests)
    return NextResponse.json({
      authUrl,
      state,
      platform: 'apartments_com',
      returnUrl,
    });

  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}