import { NextResponse } from 'next/server';
import { getRadarData, getLastUpdateTime } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache the response for 10 seconds to prevent hammering the database
const CACHE_TTL = 10 * 1000; // 10 seconds
let cachedResponse: any = null;
let cacheTimestamp = 0;

export async function GET() {
  try {
    // Check if we have a valid cached response
    const now = Date.now();
    if (cachedResponse && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json(cachedResponse);
    }

    const data = await getRadarData();
    const lastUpdate = await getLastUpdateTime();
    
    const response = {
      data,
      lastUpdate: lastUpdate?.toISOString() || null,
      nextUpdate: lastUpdate 
        ? new Date(lastUpdate.getTime() + 30 * 60 * 1000).toISOString() 
        : null,
    };

    // Update cache
    cachedResponse = response;
    cacheTimestamp = now;

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

