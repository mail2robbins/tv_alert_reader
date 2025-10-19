import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'Ticker symbol is required' },
        { status: 400 }
      );
    }

    // Format ticker for NSE (National Stock Exchange of India)
    const formattedTicker = `${ticker}.NS`;

    console.log(`Fetching price for ticker: ${formattedTicker}`);

    // Fetch directly from Yahoo Finance API
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(formattedTicker)}`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unable to fetch data for ${ticker}. Please verify the ticker symbol.` 
        },
        { status: 404 }
      );
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `No data found for ticker ${ticker} on NSE.` 
        },
        { status: 404 }
      );
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;

    if (!price) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unable to fetch price for ${ticker}.` 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ticker: ticker,
        price: price,
        currency: meta.currency || 'INR',
        marketState: meta.marketState || 'UNKNOWN',
        exchangeName: meta.exchangeName || 'NSE',
        lastUpdated: new Date(meta.regularMarketTime * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching stock price:', error);
    
    // Check if it's a Yahoo Finance specific error
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch stock price: ${error.message}` 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price from Yahoo Finance' },
      { status: 500 }
    );
  }
}
