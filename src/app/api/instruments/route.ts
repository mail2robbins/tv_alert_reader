import { NextRequest, NextResponse } from 'next/server';
import { mapTickerToSecurityId, searchTickers, getAvailableTickers } from '@/lib/instrumentMapper';

// GET /api/instruments - Get instrument information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const search = searchParams.get('search');
    const action = searchParams.get('action') || 'map';

    if (action === 'map' && ticker) {
      // Map specific ticker to Security ID
      const securityId = await mapTickerToSecurityId(ticker);
      return NextResponse.json({
        success: true,
        data: {
          ticker: ticker.toUpperCase(),
          securityId,
          mapped: securityId !== ticker.toUpperCase()
        }
      });
    }

    if (action === 'search' && search) {
      // Search for tickers
      const results = await searchTickers(search);
      return NextResponse.json({
        success: true,
        data: {
          query: search,
          results,
          count: results.length
        }
      });
    }

    if (action === 'list') {
      // Get all available tickers
      const tickers = await getAvailableTickers();
      return NextResponse.json({
        success: true,
        data: {
          tickers,
          count: tickers.length
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: map, search, or list'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in instruments API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/instruments - Batch operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tickers, action } = body;

    if (action === 'batch-map' && Array.isArray(tickers)) {
      // Batch map multiple tickers
      const results = await Promise.all(
        tickers.map(async (ticker: string) => {
          const securityId = await mapTickerToSecurityId(ticker);
          return {
            ticker: ticker.toUpperCase(),
            securityId,
            mapped: securityId !== ticker.toUpperCase()
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          results,
          count: results.length
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: batch-map'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in instruments POST API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
