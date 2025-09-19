// Instrument mapping service for Dhan API
// Maps ticker symbols to Dhan Security IDs

export interface DhanInstrument {
  EXCH_ID: string;                // Exchange ID
  SEGMENT: string;                // Segment
  SECURITY_ID: string;            // Security ID
  ISIN: string;                   // ISIN
  INSTRUMENT: string;             // Instrument type
  UNDERLYING_SECURITY_ID: string; // Underlying Security ID
  UNDERLYING_SYMBOL: string;      // Underlying Symbol
  SYMBOL_NAME: string;            // Symbol name (ticker)
  DISPLAY_NAME: string;           // Display name
  INSTRUMENT_TYPE: string;        // Instrument type
  SERIES: string;                 // Series
  LOT_SIZE: string;               // Lot size
  SM_EXPIRY_DATE?: string;        // Expiry date
  STRIKE_PRICE?: string;          // Strike price
  OPTION_TYPE?: string;           // Option type
  TICK_SIZE: string;              // Tick size
}

export interface InstrumentMap {
  [ticker: string]: string; // ticker -> securityId mapping
}

// Cache for instrument data
let instrumentCache: InstrumentMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Force cache refresh on deployment (environment variable)
const FORCE_CACHE_REFRESH = process.env.FORCE_INSTRUMENT_CACHE_REFRESH === 'true';

// Fetch instrument list from Dhan API
async function fetchInstrumentList(): Promise<DhanInstrument[]> {
  try {
    console.log('Fetching instrument list from Dhan API...');
    
    const response = await fetch('https://images.dhan.co/api-data/api-scrip-master.csv');
    
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
  
  console.log(`Parsing CSV with ${lines.length} lines and ${headers.length} headers`);
  console.log('Headers:', headers.slice(0, 10)); // Show first 10 headers
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      // Skip malformed lines
      continue;
    }
    
    // Map the new CSV format to our interface
    const instrument: DhanInstrument = {
      EXCH_ID: values[0] || '',                    // SEM_EXM_EXCH_ID
      SEGMENT: values[1] || '',                    // SEM_SEGMENT
      SECURITY_ID: values[2] || '',                // SEM_SMST_SECURITY_ID
      ISIN: '',                                    // Not in this CSV
      INSTRUMENT: values[3] || '',                 // SEM_INSTRUMENT_NAME
      UNDERLYING_SECURITY_ID: '',                  // Not in this CSV
      UNDERLYING_SYMBOL: '',                       // Not in this CSV
      SYMBOL_NAME: values[5] || '',                // SEM_TRADING_SYMBOL
      DISPLAY_NAME: values[7] || '',               // SEM_CUSTOM_SYMBOL
      INSTRUMENT_TYPE: values[13] || '',           // SEM_EXCH_INSTRUMENT_TYPE
      SERIES: values[14] || '',                    // SEM_SERIES
      LOT_SIZE: values[6] || '',                   // SEM_LOT_UNITS
      SM_EXPIRY_DATE: values[8] || undefined,      // SEM_EXPIRY_DATE
      STRIKE_PRICE: values[9] || undefined,        // SEM_STRIKE_PRICE
      OPTION_TYPE: values[10] || undefined,        // SEM_OPTION_TYPE
      TICK_SIZE: values[11] || ''                  // SEM_TICK_SIZE
    };
    
    instruments.push(instrument);
    
    // Log specific entries during parsing for debugging
    if (instrument.SYMBOL_NAME?.toUpperCase().includes('EIEL') || 
        instrument.SYMBOL_NAME?.toUpperCase().includes('USHAMART') ||
        instrument.SYMBOL_NAME?.toUpperCase().includes('WELENT') || 
        instrument.SYMBOL_NAME?.toUpperCase().includes('VINCOFE') ||
        instrument.SYMBOL_NAME?.toUpperCase().includes('GENUSPOWER') ||
        instrument.SYMBOL_NAME?.toUpperCase().includes('MOBIKWIK')) {
      console.log(`Found ${instrument.SYMBOL_NAME} during parsing: ${instrument.SYMBOL_NAME} -> ${instrument.SECURITY_ID}`);
    }
  }
  
  console.log(`Parsed ${instruments.length} instruments from CSV`);
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
  const specialEntries: string[] = [];
  
  instruments.forEach(instrument => {
    // Only include NSE Equity instruments
    if (instrument.EXCH_ID === 'NSE' && 
        instrument.SEGMENT === 'E' && 
        instrument.INSTRUMENT === 'EQUITY') {
      
      const ticker = instrument.SYMBOL_NAME.toUpperCase();
      const securityId = instrument.SECURITY_ID;
      const displayName = instrument.DISPLAY_NAME.toUpperCase();
      
      // Clean the ticker - remove leading numbers and spaces
      const cleanTicker = ticker.replace(/^\d+\s*/, '').trim();
      
      // Use the clean ticker as key and security ID as value
      map[cleanTicker] = securityId;
      
      // Also add the original ticker if it's different
      if (ticker !== cleanTicker) {
        map[ticker] = securityId;
      }
      
      // Also add the display name as a key if it's different
      if (displayName && displayName !== cleanTicker && displayName !== ticker) {
        map[displayName] = securityId;
      }
      
      // Log specific entries for debugging
      if (cleanTicker.includes('EIEL') || displayName.includes('EIEL') ||
          cleanTicker.includes('USHAMART') || displayName.includes('USHAMART') ||
          cleanTicker.includes('WELENT') || displayName.includes('WELENT') ||
          cleanTicker.includes('VINCOFE') || displayName.includes('VINCOFE') ||
          cleanTicker.includes('GENUSPOWER') || displayName.includes('GENUSPOWER') ||
          cleanTicker.includes('MOBIKWIK') || displayName.includes('MOBIKWIK')) {
        specialEntries.push(`${cleanTicker} -> ${securityId} (original: ${ticker}, display: ${displayName})`);
      }
    }
  });
  
  console.log(`Created instrument map with ${Object.keys(map).length} NSE equity instruments`);
  console.log('Sample mappings:', Object.entries(map).slice(0, 5));
  
  if (specialEntries.length > 0) {
    console.log('Specific entries found:', specialEntries);
  } else {
    console.log('No specific entries found in instrument list');
  }
  
  return map;
}

// Get or refresh instrument cache
async function getInstrumentCache(): Promise<InstrumentMap> {
  const now = Date.now();
  
  // Force refresh if environment variable is set (for deployments)
  if (FORCE_CACHE_REFRESH) {
    console.log('🔄 Force cache refresh enabled - clearing cache...');
    instrumentCache = null;
    cacheTimestamp = 0;
  }
  
  if (instrumentCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return instrumentCache;
  }
  
  console.log('Refreshing instrument cache...');
  const instruments = await fetchInstrumentList();
  instrumentCache = createInstrumentMap(instruments);
  cacheTimestamp = now;
  
  return instrumentCache;
}

// Clear instrument cache to force refresh
export function clearInstrumentCache(): void {
  console.log('🧹 Clearing instrument cache to force refresh...');
  instrumentCache = null;
  cacheTimestamp = 0;
}

// Map ticker to Security ID using comprehensive matching logic
export async function mapTickerToSecurityId(ticker: string): Promise<string> {
  try {
    const instrumentMap = await getInstrumentCache();
    const upperTicker = ticker.toUpperCase();
    
    console.log(`Looking for ticker: ${upperTicker}`);
    console.log(`Total instruments in cache: ${Object.keys(instrumentMap).length}`);
    
    // First, try exact match
    if (instrumentMap[upperTicker]) {
      console.log(`✅ Exact match found: ${ticker} -> Security ID: ${instrumentMap[upperTicker]}`);
      return instrumentMap[upperTicker];
    }
    
    // If not found, use comprehensive matching logic
    const normalizedTicker = upperTicker.replace(/[^A-Z0-9]/g, '');
    console.log(`Normalized ticker: ${normalizedTicker}`);
    
    // Find all potential matches using multiple strategies
    const potentialMatches: { key: string; score: number; securityId: string }[] = [];
    
    Object.entries(instrumentMap).forEach(([key, securityId]) => {
      const normalizedKey = key.replace(/[^A-Z0-9]/g, '');
      let score = 0;
      
      // Strategy 1: Exact word match (highest priority)
      if (key.split(' ').includes(upperTicker)) {
        score = 100;
      }
      // Strategy 2: Normalized exact match
      else if (normalizedKey === normalizedTicker) {
        score = 90;
      }
      // Strategy 3: Ticker is contained in key (normalized)
      else if (normalizedKey.includes(normalizedTicker)) {
        score = 80;
      }
      // Strategy 4: Key is contained in ticker (normalized)
      else if (normalizedTicker.includes(normalizedKey)) {
        score = 70;
      }
      // Strategy 5: Regular contains match
      else if (key.includes(upperTicker)) {
        score = 60;
      }
      // Strategy 6: Reverse contains match
      else if (upperTicker.includes(key)) {
        score = 50;
      }
      
      if (score > 0) {
        potentialMatches.push({ key, score, securityId });
      }
    });
    
    // Sort by score (highest first)
    potentialMatches.sort((a, b) => b.score - a.score);
    
    if (potentialMatches.length > 0) {
      const bestMatch = potentialMatches[0];
      console.log(`🎯 Found ${potentialMatches.length} potential matches:`);
      potentialMatches.slice(0, 5).forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.key} -> ${match.securityId} (score: ${match.score})`);
      });
      
      console.log(`✅ Using best match: ${bestMatch.key} -> Security ID: ${bestMatch.securityId}`);
      return bestMatch.securityId;
    } else {
      console.warn(`❌ Ticker ${ticker} not found in instrument list`);
      // Show some sample tickers for debugging
      const sampleTickers = Object.keys(instrumentMap).slice(0, 10);
      console.log(`Sample tickers in list: ${sampleTickers.join(', ')}`);
      
      // Log potential similar tickers for debugging
      const similarTickers = Object.keys(instrumentMap).filter(key => 
        key.includes(ticker.substring(0, 3)) || 
        ticker.includes(key.substring(0, 3))
      ).slice(0, 5);
      
      if (similarTickers.length > 0) {
        console.log(`🔍 Similar tickers found: ${similarTickers.join(', ')}`);
      }
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
