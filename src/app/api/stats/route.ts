import { NextResponse } from 'next/server';
import { getAlertStats } from '@/lib/fileLogger';
import { ApiResponse } from '@/types/alert';

export async function GET() {
  try {
    const stats = await getAlertStats();
    
    return NextResponse.json(
      { 
        success: true, 
        data: stats 
      } as ApiResponse<typeof stats>,
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60' // Cache for 1 minute
        }
      }
    );

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}
