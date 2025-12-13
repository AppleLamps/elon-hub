import { NextResponse } from 'next/server';
import { getRadarData, getLastUpdateTime } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getRadarData();
    const lastUpdate = await getLastUpdateTime();
    
    return NextResponse.json({
      data,
      lastUpdate: lastUpdate?.toISOString() || null,
      nextUpdate: lastUpdate 
        ? new Date(lastUpdate.getTime() + 30 * 60 * 1000).toISOString() 
        : null,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

