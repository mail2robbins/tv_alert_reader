import { NextResponse } from 'next/server';

// Default NIFTY 50 symbols (used if env variable not set)
const DEFAULT_NIFTY_50_SYMBOLS = [
  'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
  'BAJAJ-AUTO.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'BPCL.NS', 'BHARTIARTL.NS',
  'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'ITC.NS',
  'INDUSINDBK.NS', 'INFY.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
  'M&M.NS', 'MARUTI.NS', 'NTPC.NS', 'NESTLEIND.NS', 'ONGC.NS',
  'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SHRIRAMFIN.NS', 'SBIN.NS',
  'SUNPHARMA.NS', 'TCS.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS',
  'TECHM.NS', 'TITAN.NS', 'ULTRACEMCO.NS', 'WIPRO.NS', 'LTIM.NS'
];

// Get symbols from environment variable or use default
// Format in .env.local: NIFTY_50_SYMBOLS=RELIANCE.NS,TCS.NS,INFY.NS (comma-separated)
function getNifty50Symbols(): string[] {
  const envSymbols = process.env.NIFTY_50_SYMBOLS;
  if (envSymbols) {
    return envSymbols.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  return DEFAULT_NIFTY_50_SYMBOLS;
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface StockData {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
}

// Fetch stock data using Yahoo Finance v8 chart API (more reliable, no auth required)
async function fetchStockData(symbol: string): Promise<StockData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 } // Disable caching
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result || !result.meta) {
      return null;
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice ?? 0;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: symbol.replace('.NS', ''),
      name: meta.shortName || meta.longName || symbol.replace('.NS', ''),
      currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh: meta.regularMarketDayHigh ?? 0,
      dayLow: meta.regularMarketDayLow ?? 0,
      volume: meta.regularMarketVolume ?? 0,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const stockData: StockData[] = [];
    let errorCount = 0;
    const symbols = getNifty50Symbols();

    // Fetch quotes sequentially with delay between each request to avoid rate limiting
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const result = await fetchStockData(symbol);
      
      if (result) {
        stockData.push(result);
      } else {
        errorCount++;
      }

      // Add delay between each request (1000ms)
      if (i < symbols.length - 1) {
        await delay(1000);
      }
    }

    console.log(`Successfully fetched ${stockData.length} stocks, ${errorCount} errors`);

    // Sort by percentage change (descending) and get top 10 gainers
    const topGainers = stockData
      .filter(stock => stock.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);

    // If no gainers found but we have data, return top 10 by change percent
    const result = topGainers.length > 0 
      ? topGainers 
      : stockData.sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        topGainers: result,
        fetchedAt: new Date().toISOString(),
        totalStocksFetched: stockData.length,
        totalErrors: errorCount,
      },
    });
  } catch (error) {
    console.error('Error fetching NSE top gainers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stock data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
