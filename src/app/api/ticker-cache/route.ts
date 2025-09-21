import { NextRequest, NextResponse } from 'next/server';
import { getTickerCacheStats, getTickerCacheEntry } from '@/lib/orderTracker';
import { ApiResponse } from '@/types/alert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const date = searchParams.get('date');

    if (ticker) {
      // Get specific ticker cache entry
      const cacheEntry = getTickerCacheEntry(ticker, date || undefined);
      
      if (!cacheEntry) {
        return NextResponse.json(
          { 
            success: true, 
            data: { 
              ticker: ticker.toUpperCase(),
              date: date || new Date().toISOString().split('T')[0],
              hasBeenOrdered: false,
              cacheEntry: null
            }
          } as ApiResponse<{
            ticker: string;
            date: string;
            hasBeenOrdered: boolean;
            cacheEntry: any;
          }>,
          { status: 200 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          data: { 
            ticker: ticker.toUpperCase(),
            date: cacheEntry.date,
            hasBeenOrdered: true,
            cacheEntry
          }
        } as ApiResponse<{
          ticker: string;
          date: string;
          hasBeenOrdered: boolean;
          cacheEntry: any;
        }>,
        { status: 200 }
      );
    } else {
      // Get overall cache statistics
      const stats = getTickerCacheStats();
      
      return NextResponse.json(
        { 
          success: true, 
          data: stats
        } as ApiResponse<typeof stats>,
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Error fetching ticker cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticker cache' } as ApiResponse<null>,
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

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}

