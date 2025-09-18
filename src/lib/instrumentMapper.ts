// Instrument mapping service for Dhan API
// Maps ticker symbols to Dhan Security IDs

export interface DhanInstrument {
  SEM_EXM_EXCH_ID: string;        // Exchange ID
  SEM_SEGMENT: string;            // Segment
  SM_SYMBOL_NAME: string;         // Symbol name (ticker)
  SEM_CUSTOM_SYMBOL: string;      // Dhan display symbol
  SEM_EXCH_INSTRUMENT_TYPE: string; // Instrument type
  SEM_SERIES: string;             // Series
  SEM_LOT_UNITS: string;          // Lot size
  SEM_TICK_SIZE: string;          // Tick size
  SEM_EXPIRY_DATE?: string;       // Expiry date
  SEM_STRIKE_PRICE?: string;      // Strike price
  SEM_OPTION_TYPE?: string;       // Option type
}

export interface InstrumentMap {
  [ticker: string]: string; // ticker -> securityId mapping
}

// Cache for instrument data
let instrumentCache: InstrumentMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fetch instrument list from Dhan API
async function fetchInstrumentList(): Promise<DhanInstrument[]> {
  try {
    console.log('Fetching instrument list from Dhan API...');
    
    const response = await fetch('https://images.dhan.co/api-data/api-scrip-master-detailed.csv');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch instrument list: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching instrument list:', error);
    throw error;
  }
}

// Parse CSV data into instrument objects
function parseCSV(csvText: string): DhanInstrument[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const instruments: DhanInstrument[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) continue;
    
    const instrument: Partial<DhanInstrument> = {};
    headers.forEach((header, index) => {
      (instrument as Record<string, string>)[header] = values[index]?.replace(/"/g, '') || '';
    });
    
    instruments.push(instrument as DhanInstrument);
  }
  
  return instruments;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Create ticker to Security ID mapping
function createInstrumentMap(instruments: DhanInstrument[]): InstrumentMap {
  const map: InstrumentMap = {};
  
  instruments.forEach(instrument => {
    // Only include NSE Equity instruments
    if (instrument.SEM_EXM_EXCH_ID === 'NSE' && 
        instrument.SEM_SEGMENT === 'E' && 
        instrument.SEM_EXCH_INSTRUMENT_TYPE === 'EQUITY') {
      
      const ticker = instrument.SM_SYMBOL_NAME.toUpperCase();
      const securityId = instrument.SEM_CUSTOM_SYMBOL || instrument.SM_SYMBOL_NAME;
      
      // Use the ticker as key and security ID as value
      map[ticker] = securityId.toUpperCase();
    }
  });
  
  console.log(`Created instrument map with ${Object.keys(map).length} NSE equity instruments`);
  return map;
}

// Get or refresh instrument cache
async function getInstrumentCache(): Promise<InstrumentMap> {
  const now = Date.now();
  
  if (instrumentCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return instrumentCache;
  }
  
  console.log('Refreshing instrument cache...');
  const instruments = await fetchInstrumentList();
  instrumentCache = createInstrumentMap(instruments);
  cacheTimestamp = now;
  
  return instrumentCache;
}

// Map ticker to Security ID
export async function mapTickerToSecurityId(ticker: string): Promise<string> {
  try {
    const instrumentMap = await getInstrumentCache();
    const upperTicker = ticker.toUpperCase();
    
    if (instrumentMap[upperTicker]) {
      console.log(`Mapped ticker ${ticker} to Security ID: ${instrumentMap[upperTicker]}`);
      return instrumentMap[upperTicker];
    }
    
    // If not found, try to find similar tickers
    const similarTickers = Object.keys(instrumentMap).filter(key => 
      key.includes(upperTicker) || upperTicker.includes(key)
    );
    
    if (similarTickers.length > 0) {
      console.warn(`Ticker ${ticker} not found. Similar tickers: ${similarTickers.join(', ')}`);
    } else {
      console.warn(`Ticker ${ticker} not found in instrument list`);
    }
    
    // Fallback to original ticker
    return upperTicker;
  } catch (error) {
    console.error('Error mapping ticker to Security ID:', error);
    // Fallback to original ticker
    return ticker.toUpperCase();
  }
}

// Get all available tickers for a given exchange segment
export async function getAvailableTickers(): Promise<string[]> {
  try {
    const instrumentMap = await getInstrumentCache();
    return Object.keys(instrumentMap).sort();
  } catch (error) {
    console.error('Error getting available tickers:', error);
    return [];
  }
}

// Search for tickers by partial name
export async function searchTickers(query: string): Promise<{ ticker: string; securityId: string }[]> {
  try {
    const instrumentMap = await getInstrumentCache();
    const upperQuery = query.toUpperCase();
    
    return Object.entries(instrumentMap)
      .filter(([ticker]) => ticker.includes(upperQuery))
      .map(([ticker, securityId]) => ({ ticker, securityId }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  } catch (error) {
    console.error('Error searching tickers:', error);
    return [];
  }
}

// Clear instrument cache (useful for testing)
export function clearInstrumentCache(): void {
  instrumentCache = null;
  cacheTimestamp = 0;
  console.log('Instrument cache cleared');
}
