/**
 * Listing Publication API Route
 * Handles publishing properties to listing platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { api } from '@/../convex/_generated/api';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { getPlatformSafe } from '@/lib/listing-platforms';
import { Id } from '@/../convex/_generated/dataModel';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Convex derives identity from this token; without it the call is anonymous.
    const token = (await getToken({ template: 'convex' })) ?? undefined;

    // Parse request body
    const body = await request.json();
    const {
      propertyId,
      platforms,
      listingData,
      publishImmediately = true,
    } = body;

    // Validate required fields
    if (!propertyId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, platforms' },
        { status: 400 }
      );
    }

    // Validate property ownership
    const property = await fetchQuery(
      api.properties.getProperty,
      { id: propertyId as Id<"properties"> },
      { token }
    );


    if (!property || property.userId !== userId) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // Process each platform
    for (const platform of platforms) {
      try {
        // Get platform adapter
        const platformAdapter = getPlatformSafe(platform);
        
        // Get stored tokens for this platform
        const tokens = await fetchQuery(api.platformTokens.getTokens, {
          platform }, { token });

        if (!tokens || !tokens.isValid) {
          errors[platform] = 'Platform not connected or tokens expired';
          continue;
        }

        // Transform property data to listing format
        const propertyData = {
          ...property,
          ...listingData,
        };
        
        const transformedData = platformAdapter.transformPropertyData(propertyData);

        if (publishImmediately && platforms.length <= 3) {
          // Direct API publishing for small requests
          const publishResult = await platformAdapter.publishListing(
            transformedData,
            {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              tokenType: tokens.tokenType,
              expiresAt: tokens.expiresAt,
            }
          );

          results[platform] = publishResult;

          // Create or update publication record
          if (publishResult.success) {
            await fetchMutation(api.listingPublications.createPublication, {
              propertyId: propertyId as Id<"properties">,
              platform,
              listingTitle: transformedData.title,
              listingDescription: transformedData.description,
              monthlyRent: transformedData.monthlyRent,
              availableDate: transformedData.availableDate }, { token });

            // Update publication status
            const publicationId = await fetchQuery(api.listingPublications.getPropertyPublications, {
              propertyId: propertyId as Id<"properties"> }, { token });

            const publication = publicationId.find(p => p.platform === platform);
            if (publication) {
              await fetchMutation(api.listingPublications.updatePublicationStatus, {
                publicationId: publication._id,
                status: 'active',
                externalId: publishResult.externalId,
                externalUrl: publishResult.externalUrl,
                publishedAt: new Date().toISOString() }, { token });
            }
          } else {
            // Record error
            errors[platform] = publishResult.message || 'Publication failed';
          }

        } else {
          // Queue for background processing
          results[platform] = {
            success: true,
            message: 'Queued for background processing',
            queued: true,
          };

          // Create publication record with pending status
          await fetchMutation(api.listingPublications.createPublication, {
            propertyId: propertyId as Id<"properties">,
            platform,
            listingTitle: transformedData.title,
            listingDescription: transformedData.description,
            monthlyRent: transformedData.monthlyRent,
            availableDate: transformedData.availableDate }, { token });
        }

      } catch (error) {
        console.error(`Failed to publish to ${platform}:`, error);
        errors[platform] = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Return results
    const hasErrors = Object.keys(errors).length > 0;
    const hasSuccesses = Object.keys(results).length > 0;

    return NextResponse.json({
      success: !hasErrors || hasSuccesses,
      results,
      errors: hasErrors ? errors : undefined,
      summary: {
        total: platforms.length,
        successful: Object.keys(results).length,
        failed: Object.keys(errors).length,
        queued: Object.values(results).filter((r: any) => r.queued).length,
      },
    });

  } catch (error) {
    console.error('Listing publication error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to publish listings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Convex derives identity from this token; without it the call is anonymous.
    const token = (await getToken({ template: 'convex' })) ?? undefined;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const platform = searchParams.get('platform');

    if (propertyId) {
      // Get publications for specific property
      const publications = await fetchQuery(api.listingPublications.getPropertyPublications, {
        propertyId: propertyId as Id<"properties"> }, { token });

      return NextResponse.json({ publications });
    
    } else if (platform) {
      // Get publications for specific platform
      const publications = await fetchQuery(api.listingPublications.getPlatformPublications, {
        platform }, { token });

      return NextResponse.json({ publications });

    } else {
      // Get all user publications
      const publications = await fetchQuery(api.listingPublications.getUserPublications, {}, { token });

      const stats = await fetchQuery(api.listingPublications.getPublicationStats, {}, { token });

      return NextResponse.json({ 
        publications,
        stats,
      });
    }

  } catch (error) {
    console.error('Get publications error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get publications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}