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

    if (action === 'test-retry' && ticker) {
      // Test retry mechanism for a specific ticker
      const { clearInstrumentCache } = await import('@/lib/instrumentMapper');
      const results = [];
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🧪 Test attempt ${attempt} for ticker: ${ticker}`);
          clearInstrumentCache(); // Clear cache before each attempt
          
          const securityId = await mapTickerToSecurityId(ticker);
          const isValid = securityId && securityId !== ticker.toUpperCase();
          
          results.push({
            attempt,
            securityId,
            isValid,
            success: isValid
          });
          
          if (isValid) {
            break; // Stop if we found a valid mapping
          }
          
          // Add delay between attempts
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.push({
            attempt,
            error: error instanceof Error ? error.message : String(error),
            success: false
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          ticker,
          results,
          totalAttempts: results.length,
          successful: results.some(r => r.success)
        }
      });
    }

    if (action === 'find-similar' && ticker) {
      // Find similar tickers for debugging missing mappings
      const { searchTickers } = await import('@/lib/instrumentMapper');
      const upperTicker = ticker.toUpperCase();
      
      // Try different search strategies
      const strategies = [
        { name: 'Exact match', query: upperTicker },
        { name: 'Partial match', query: upperTicker.substring(0, 3) },
        { name: 'With LTD', query: `${upperTicker} LTD` },
        { name: 'With LIMITED', query: `${upperTicker} LIMITED` },
        { name: 'With CORP', query: `${upperTicker} CORP` },
        { name: 'With COMPANY', query: `${upperTicker} COMPANY` },
        { name: 'First 4 chars', query: upperTicker.substring(0, 4) },
        { name: 'First 5 chars', query: upperTicker.substring(0, 5) }
      ];
      
      const results = [];
      
      for (const strategy of strategies) {
        try {
          const matches = await searchTickers(strategy.query);
          results.push({
            strategy: strategy.name,
            query: strategy.query,
            matches: matches.slice(0, 5), // Limit to first 5 matches
            count: matches.length
          });
        } catch (error) {
          results.push({
            strategy: strategy.name,
            query: strategy.query,
            error: error instanceof Error ? error.message : String(error),
            count: 0
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          ticker,
          searchResults: results,
          totalStrategies: results.length
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: map, search, list, test-retry, or find-similar'
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
