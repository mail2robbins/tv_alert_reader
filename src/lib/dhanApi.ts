import { TradingViewAlert } from '@/types/alert';
import { calculatePositionSize, calculatePositionSizeForAccount } from './fundManager';
import { mapTickerToSecurityId } from './instrumentMapper';
import { DhanAccountConfig, getActiveAccountConfigurations } from './multiAccountManager';

// Dhan.co API configuration
const DHAN_API_BASE_URL = 'https://api.dhan.co/v2/super/orders';
const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN;
const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID;

// Dhan.co order types and segments
export const DHAN_ORDER_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL'
} as const;

export const DHAN_EXCHANGE_SEGMENTS = {
  NSE_EQ: 'NSE_EQ',
  NSE_FO: 'NSE_FO',
  BSE_EQ: 'BSE_EQ',
  BSE_FO: 'BSE_FO',
  MCX: 'MCX',
  NCDEX: 'NCDEX'
} as const;

export const DHAN_PRODUCT_TYPES = {
  CNC: 'CNC', // Cash and Carry
  MIS: 'MIS', // Intraday
  NRML: 'NRML' // Normal
} as const;

export const DHAN_ORDER_TYPES_ORDER = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  SL: 'SL', // Stop Loss
  SL_M: 'SL_M' // Stop Loss Market
} as const;

// Dhan.co order request interface
export interface DhanOrderRequest {
  dhanClientId: string;
  correlationId: string;
  transactionType: 'BUY' | 'SELL';
  exchangeSegment: string;
  productType: string;
  orderType: string;
  securityId: string;
  quantity: number;
  price: number;
  targetPrice?: number;
  stopLossPrice?: number;
  trailingJump?: number;
}

// Dhan.co order response interface
export interface DhanOrderResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
  correlationId?: string;
  accountId?: number;
  clientId?: string;
  quantity?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  positionSizePercentage?: number;
}

// Generate correlation ID for order tracking
function generateCorrelationId(): string {
  return `TV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Map TradingView signal to Dhan transaction type
function mapSignalToTransactionType(signal: string): 'BUY' | 'SELL' {
  switch (signal.toUpperCase()) {
    case 'BUY':
      return 'BUY';
    case 'SELL':
      return 'SELL';
    default:
      return 'BUY'; // Default to BUY for HOLD or unknown signals
  }
}

// Manual mapping for known problematic tickers (fallback only)
const MANUAL_TICKER_MAPPINGS: Record<string, string> = {
  // These will be populated with actual SecurityIds if needed
  // 'EIEL': '27213', // Example: from CSV data
  // 'USHAMART': '8840', // Example: from CSV data
};

// Enhanced fuzzy matching strategies for ticker mapping
async function tryAdvancedTickerMatching(ticker: string): Promise<string | null> {
  const { searchTickers } = await import('./instrumentMapper');
  const upperTicker = ticker.toUpperCase();
  
  console.log(`🔍 Trying advanced matching strategies for: ${ticker}`);
  
  // Strategy 0: Check manual mappings first
  if (MANUAL_TICKER_MAPPINGS[upperTicker]) {
    console.log(`🎯 Found manual mapping: ${ticker} -> ${MANUAL_TICKER_MAPPINGS[upperTicker]}`);
    return MANUAL_TICKER_MAPPINGS[upperTicker];
  }
  
  // Strategy 1: Search for partial matches
  const partialMatches = await searchTickers(upperTicker);
  if (partialMatches.length > 0) {
    console.log(`🎯 Found ${partialMatches.length} partial matches:`, partialMatches.slice(0, 3));
    // Return the first partial match
    return partialMatches[0].securityId;
  }
  
  // Strategy 2: Try with common suffixes/prefixes
  const commonVariations = [
    `${upperTicker} LTD`,
    `${upperTicker} LIMITED`,
    `${upperTicker} CORP`,
    `${upperTicker} CORPORATION`,
    `${upperTicker} INDUSTRIES`,
    `${upperTicker} ENTERPRISES`,
    `${upperTicker} COMPANY`,
    `${upperTicker} PVT`,
    `${upperTicker} PRIVATE`,
    `THE ${upperTicker}`,
    `${upperTicker} & CO`,
    `${upperTicker} AND CO`
  ];
  
  for (const variation of commonVariations) {
    const matches = await searchTickers(variation);
    if (matches.length > 0) {
      console.log(`🎯 Found match with variation "${variation}":`, matches[0]);
      return matches[0].securityId;
    }
  }
  
  // Strategy 3: Try removing common suffixes from the ticker
  const cleanTicker = upperTicker
    .replace(/\s+(LTD|LIMITED|CORP|CORPORATION|INDUSTRIES|ENTERPRISES|COMPANY|PVT|PRIVATE|& CO|AND CO)$/i, '')
    .trim();
  
  if (cleanTicker !== upperTicker) {
    const cleanMatches = await searchTickers(cleanTicker);
    if (cleanMatches.length > 0) {
      console.log(`🎯 Found match with cleaned ticker "${cleanTicker}":`, cleanMatches[0]);
      return cleanMatches[0].securityId;
    }
  }
  
  // Strategy 4: Try phonetic/soundex matching (simple version)
  const tickerWords = upperTicker.split(/\s+/);
  for (const word of tickerWords) {
    if (word.length >= 3) {
      const wordMatches = await searchTickers(word);
      if (wordMatches.length > 0) {
        console.log(`🎯 Found match with word "${word}":`, wordMatches[0]);
        return wordMatches[0].securityId;
      }
    }
  }
  
  return null;
}

// Map ticker to security ID using Dhan's instrument list with enhanced retry mechanism
async function getSecurityId(ticker: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  // Log deployment environment info
  const deploymentInfo = {
    environment: process.env.NODE_ENV || 'development',
    forceRefresh: process.env.FORCE_INSTRUMENT_CACHE_REFRESH === 'true',
    timestamp: new Date().toISOString()
  };
  
  console.log(`🚀 SecurityId lookup for ${ticker} in ${deploymentInfo.environment} environment:`, deploymentInfo);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Attempt ${attempt}/${maxRetries} to get SecurityId for ticker: ${ticker}`);
      
      // First try the standard mapping
      const securityId = await mapTickerToSecurityId(ticker);
      
      // Check if we got a valid mapping (not just the original ticker)
      if (securityId && securityId !== ticker.toUpperCase()) {
        console.log(`✅ Successfully mapped ${ticker} -> ${securityId} on attempt ${attempt}`);
        return securityId;
      }
      
      // If standard mapping failed, try advanced matching strategies
      console.log(`🔍 Standard mapping failed, trying advanced strategies...`);
      const advancedMatch = await tryAdvancedTickerMatching(ticker);
      if (advancedMatch) {
        console.log(`✅ Advanced matching found: ${ticker} -> ${advancedMatch}`);
        return advancedMatch;
      }
      
      // If we got the original ticker back, it means no mapping was found
      if (attempt < maxRetries) {
        console.log(`⚠️ No mapping found for ${ticker} on attempt ${attempt}, refreshing cache and retrying...`);
        
        // Force refresh the instrument cache by clearing it
        // This will trigger a fresh fetch from the API
        const { clearInstrumentCache } = await import('./instrumentMapper');
        if (clearInstrumentCache) {
          clearInstrumentCache();
        }
        
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`❌ Failed to find valid SecurityId for ${ticker} after ${maxRetries} attempts`);
        console.error(`❌ Deployment info:`, deploymentInfo);
        throw new Error(`No valid SecurityId mapping found for ticker: ${ticker} in ${deploymentInfo.environment} environment`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt} failed for ticker ${ticker}:`, lastError.message);
      console.error(`❌ Error details:`, { error: lastError.message, stack: lastError.stack, deploymentInfo });
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // If we reach here, all attempts failed
  throw lastError || new Error(`Failed to get SecurityId for ticker: ${ticker} after ${maxRetries} attempts in ${deploymentInfo.environment} environment`);
}

// Place order on Dhan.co for a specific account
export async function placeDhanOrderForAccount(
  alert: TradingViewAlert,
  accountConfig: DhanAccountConfig,
  orderConfig?: {
    quantity?: number;
    exchangeSegment?: string;
    productType?: string;
    orderType?: string;
    targetPrice?: number;
    stopLossPrice?: number;
    useAutoPositionSizing?: boolean;
    trailingJump?: number;
  }
): Promise<DhanOrderResponse> {
  // Check if duplicate ticker orders are allowed for this account
  if (!accountConfig.allowDuplicateTickers) {
    const { hasTickerBeenOrderedTodayForAccount } = await import('./orderTracker');
    const alreadyOrdered = await hasTickerBeenOrderedTodayForAccount(alert.ticker, accountConfig.accountId);
    
    if (alreadyOrdered) {
      console.log(`Order blocked for account ${accountConfig.clientId}: Ticker ${alert.ticker} has already been ordered today and allowDuplicateTickers is false`);
      return {
        success: false,
        error: `Order blocked: Ticker ${alert.ticker} has already been ordered today for this account`,
        correlationId: generateCorrelationId(),
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId
      };
    }
  }

  // Calculate position size for this specific account
  let quantity: number;
  let positionCalculation;
  
  if (orderConfig?.useAutoPositionSizing !== false) {
    // Use automatic position sizing based on account configuration
    positionCalculation = calculatePositionSizeForAccount(alert.price, accountConfig, alert.signal);
    
    if (!positionCalculation.canPlaceOrder) {
      return {
        success: false,
        error: `Cannot place order for account ${accountConfig.clientId}: ${positionCalculation.reason}`,
        correlationId: generateCorrelationId(),
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId
      };
    }
    
    quantity = positionCalculation.finalQuantity;
    console.log(`Auto position sizing for account ${accountConfig.clientId}:`, {
      stockPrice: alert.price,
      calculatedQuantity: positionCalculation.calculatedQuantity,
      riskOnCapital: positionCalculation.riskOnCapital,
      finalQuantity: quantity,
      orderValue: positionCalculation.orderValue,
      leveragedValue: positionCalculation.leveragedValue,
      positionSizePercentage: positionCalculation.positionSizePercentage.toFixed(2) + '%',
      stopLossPrice: positionCalculation.stopLossPrice?.toFixed(2),
      targetPrice: positionCalculation.targetPrice?.toFixed(2)
    });
  } else {
    // Use manual quantity
    quantity = orderConfig?.quantity || 1;
    console.log(`Manual quantity for account ${accountConfig.clientId}:`, quantity);
  }

  // Get proper Security ID from Dhan's instrument list with retry mechanism
  let securityId: string;
  try {
    securityId = await getSecurityId(alert.ticker);
  } catch (error) {
    console.error(`❌ Failed to get SecurityId for ${alert.ticker} after retries:`, error);
    return {
      success: false,
      error: `SecurityId mapping failed for ticker ${alert.ticker}: ${error instanceof Error ? error.message : String(error)}`,
      correlationId: generateCorrelationId(),
      accountId: accountConfig.accountId,
      clientId: accountConfig.clientId
    };
  }
  
  // Determine order type and price - use account-specific order type for alert-based orders
  const orderType = orderConfig?.orderType || accountConfig.orderType || DHAN_ORDER_TYPES_ORDER.MARKET;
  
  // Calculate order price with buffer for LIMIT orders
  let orderPrice = 0;
  if (orderType === DHAN_ORDER_TYPES_ORDER.LIMIT) {
    const transactionType = mapSignalToTransactionType(alert.signal);
    const bufferPercentage = accountConfig.limitBufferPercentage || 0;
    
    if (bufferPercentage > 0) {
      // Apply buffer based on transaction type
      if (transactionType === 'BUY') {
        // For BUY orders, add buffer to increase the limit price (to improve execution chances)
        orderPrice = alert.price * (1 + bufferPercentage / 100);
      } else {
        // For SELL orders, subtract buffer to decrease the limit price (to improve execution chances)
        orderPrice = alert.price * (1 - bufferPercentage / 100);
      }
      
      // Round to nearest valid tick size based on NSE price ranges
      // NSE tick size rules (as per NSE regulations):
      // 0.00 - 999.95: tick size = 0.05
      // 1000.00 - 9999.95: tick size = 0.10
      // 10000.00+: tick size = 0.25
      let tickSize: number;
      if (orderPrice < 1000) {
        tickSize = 0.05;
      } else if (orderPrice < 10000) {
        tickSize = 0.10;
      } else {
        tickSize = 0.25;
      }
      
      orderPrice = Math.round(orderPrice / tickSize) * tickSize;
      
      // Round to 2 decimal places to avoid floating point precision issues
      orderPrice = Math.round(orderPrice * 100) / 100;
      
      console.log(`Applied LIMIT buffer for ${transactionType} order:`, {
        originalPrice: alert.price,
        bufferPercentage: bufferPercentage,
        calculatedPrice: orderPrice,
        tickSize: tickSize,
        difference: (orderPrice - alert.price).toFixed(2)
      });
    } else {
      orderPrice = alert.price;
    }
  }
  
  // Prepare order request
  const orderRequest: DhanOrderRequest = {
    dhanClientId: accountConfig.clientId,
    correlationId: generateCorrelationId(),
    transactionType: mapSignalToTransactionType(alert.signal),
    exchangeSegment: orderConfig?.exchangeSegment || DHAN_EXCHANGE_SEGMENTS.NSE_EQ,
    productType: orderConfig?.productType || DHAN_PRODUCT_TYPES.CNC,
    orderType: orderType,
    securityId: securityId,
    quantity: quantity,
    price: orderPrice,
    targetPrice: orderConfig?.targetPrice || (positionCalculation?.targetPrice),
    stopLossPrice: orderConfig?.stopLossPrice || (positionCalculation?.stopLossPrice)
  };

  // Only add trailingJump if trailing stop loss is enabled
  if (accountConfig.enableTrailingStopLoss) {
    orderRequest.trailingJump = accountConfig.minTrailJump;
  }

  try {
    console.log(`Placing Dhan order for account ${accountConfig.clientId}:`, {
      ticker: alert.ticker,
      securityId: securityId,
      signal: alert.signal,
      orderType: orderType,
      price: orderPrice,
      originalPrice: alert.price,
      quantity: quantity,
      correlationId: orderRequest.correlationId
    });

    const response = await fetch(DHAN_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access-token': accountConfig.accessToken
      },
      body: JSON.stringify(orderRequest)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(`Dhan order placed successfully for account ${accountConfig.clientId}:`, responseData);
      return {
        success: true,
        orderId: responseData.orderId || responseData.correlationId,
        message: 'Order placed successfully',
        correlationId: orderRequest.correlationId,
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId,
        quantity: quantity,
        stopLossPrice: positionCalculation?.stopLossPrice,
        targetPrice: positionCalculation?.targetPrice,
        positionSizePercentage: positionCalculation?.positionSizePercentage
      };
    } else {
      console.error(`Dhan order failed for account ${accountConfig.clientId}:`, responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || 'Order placement failed',
        correlationId: orderRequest.correlationId,
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId,
        quantity: quantity,
        stopLossPrice: positionCalculation?.stopLossPrice,
        targetPrice: positionCalculation?.targetPrice,
        positionSizePercentage: positionCalculation?.positionSizePercentage
      };
    }
  } catch (error) {
    console.error(`Dhan API error for account ${accountConfig.clientId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: orderRequest.correlationId,
      accountId: accountConfig.accountId,
      clientId: accountConfig.clientId
    };
  }
}

// Place order on Dhan.co with automatic position sizing (legacy function for backward compatibility)
export async function placeDhanOrder(
  alert: TradingViewAlert,
  orderConfig?: {
    quantity?: number;
    exchangeSegment?: string;
    productType?: string;
    orderType?: string;
    targetPrice?: number;
    stopLossPrice?: number;
    useAutoPositionSizing?: boolean;
    trailingJump?: number;
  }
): Promise<DhanOrderResponse> {
  // Validate required environment variables
  if (!DHAN_ACCESS_TOKEN) {
    throw new Error('DHAN_ACCESS_TOKEN environment variable is required');
  }
  
  if (!DHAN_CLIENT_ID) {
    throw new Error('DHAN_CLIENT_ID environment variable is required');
  }

  // Calculate position size
  let quantity: number;
  let positionCalculation;
  
  if (orderConfig?.useAutoPositionSizing !== false) {
    // Use automatic position sizing based on fund management
    positionCalculation = calculatePositionSize(alert.price);
    
    if (!positionCalculation.canPlaceOrder) {
      return {
        success: false,
        error: `Cannot place order: ${positionCalculation.reason}`,
        correlationId: generateCorrelationId()
      };
    }
    
    quantity = positionCalculation.finalQuantity;
    console.log('Auto position sizing:', {
      stockPrice: alert.price,
      calculatedQuantity: positionCalculation.calculatedQuantity,
      riskOnCapital: positionCalculation.riskOnCapital,
      finalQuantity: quantity,
      orderValue: positionCalculation.orderValue,
      leveragedValue: positionCalculation.leveragedValue,
      positionSizePercentage: positionCalculation.positionSizePercentage.toFixed(2) + '%',
      stopLossPrice: positionCalculation.stopLossPrice?.toFixed(2),
      targetPrice: positionCalculation.targetPrice?.toFixed(2)
    });
  } else {
    // Use manual quantity
    quantity = orderConfig?.quantity || 1;
    console.log('Manual quantity:', quantity);
  }

  // Get proper Security ID from Dhan's instrument list with retry mechanism
  let securityId: string;
  try {
    securityId = await getSecurityId(alert.ticker);
  } catch (error) {
    console.error(`❌ Failed to get SecurityId for ${alert.ticker} after retries:`, error);
    return {
      success: false,
      error: `SecurityId mapping failed for ticker ${alert.ticker}: ${error instanceof Error ? error.message : String(error)}`,
      correlationId: generateCorrelationId()
    };
  }
  
  // Determine order type and price
  const orderType = orderConfig?.orderType || DHAN_ORDER_TYPES_ORDER.MARKET;
  const orderPrice = orderType === DHAN_ORDER_TYPES_ORDER.MARKET ? 0 : alert.price;
  
  // Prepare order request
  const orderRequest: DhanOrderRequest = {
    dhanClientId: DHAN_CLIENT_ID,
    correlationId: generateCorrelationId(),
    transactionType: mapSignalToTransactionType(alert.signal),
    exchangeSegment: orderConfig?.exchangeSegment || DHAN_EXCHANGE_SEGMENTS.NSE_EQ,
    productType: orderConfig?.productType || DHAN_PRODUCT_TYPES.CNC,
    orderType: orderType,
    securityId: securityId,
    quantity: quantity,
    price: orderPrice,
    targetPrice: orderConfig?.targetPrice || (positionCalculation?.targetPrice),
    stopLossPrice: orderConfig?.stopLossPrice || (positionCalculation?.stopLossPrice)
  };

  // Only add trailingJump if provided and not zero
  if (orderConfig?.trailingJump && orderConfig.trailingJump > 0) {
    orderRequest.trailingJump = orderConfig.trailingJump;
  }

  try {
    console.log('Placing Dhan order:', {
      ticker: alert.ticker,
      securityId: securityId,
      signal: alert.signal,
      orderType: orderType,
      price: orderPrice,
      originalPrice: alert.price,
      quantity: quantity,
      correlationId: orderRequest.correlationId
    });

    const response = await fetch(DHAN_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access-token': DHAN_ACCESS_TOKEN
      },
      body: JSON.stringify(orderRequest)
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('Dhan order placed successfully:', responseData);
      return {
        success: true,
        orderId: responseData.orderId || responseData.correlationId,
        message: 'Order placed successfully',
        correlationId: orderRequest.correlationId
      };
    } else {
      console.error('Dhan order failed:', responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || 'Order placement failed',
        correlationId: orderRequest.correlationId
      };
    }
  } catch (error) {
    console.error('Dhan API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: orderRequest.correlationId
    };
  }
}

// Place order on all active Dhan accounts
export async function placeDhanOrderOnAllAccounts(
  alert: TradingViewAlert,
  orderConfig?: {
    quantity?: number;
    exchangeSegment?: string;
    productType?: string;
    orderType?: string;
    targetPrice?: number;
    stopLossPrice?: number;
    useAutoPositionSizing?: boolean;
    trailingJump?: number;
  }
): Promise<DhanOrderResponse[]> {
  const activeAccounts = await getActiveAccountConfigurations();
  
  if (activeAccounts.length === 0) {
    throw new Error('No active Dhan accounts configured');
  }
  
  console.log(`Placing orders on ${activeAccounts.length} active accounts for ticker: ${alert.ticker}`);
  
  // Place orders on all accounts in parallel
  const orderPromises = activeAccounts.map(accountConfig => 
    placeDhanOrderForAccount(alert, accountConfig, orderConfig)
  );
  
  const results = await Promise.allSettled(orderPromises);
  
  const responses: DhanOrderResponse[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      responses.push(result.value);
    } else {
      const accountConfig = activeAccounts[index];
      console.error(`Order failed for account ${accountConfig.clientId}:`, result.reason);
      responses.push({
        success: false,
        error: `Order placement failed: ${result.reason}`,
        correlationId: generateCorrelationId(),
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId
      });
    }
  });
  
  const successfulOrders = responses.filter(r => r.success).length;
  const failedOrders = responses.filter(r => !r.success).length;
  
  console.log(`Order placement summary: ${successfulOrders} successful, ${failedOrders} failed`);
  
  return responses;
}

// Get order status (if Dhan provides this endpoint)
export async function getDhanOrderStatus(correlationId: string): Promise<unknown> {
  if (!DHAN_ACCESS_TOKEN) {
    throw new Error('DHAN_ACCESS_TOKEN environment variable is required');
  }

  try {
    const response = await fetch(`${DHAN_API_BASE_URL}/${correlationId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'access-token': DHAN_ACCESS_TOKEN
      }
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Failed to fetch order status: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
}

// Dhan order details interface
export interface DhanOrderDetails {
  orderId: string;
  dhanClientId: string;
  correlationId: string;
  transactionType: string;
  exchangeSegment: string;
  productType: string;
  orderType: string;
  securityId: string;
  quantity: number;
  price: number;
  averagePrice?: number;
  filledQuantity?: number;
  status: string;
  targetPrice?: number;
  stopLossPrice?: number;
  trailingJump?: number;
  orderTime?: string;
  updateTime?: string;
  // Additional fields from DHAN API for better error handling
  exchangeOrderId?: string;
  tradingSymbol?: string;
  remainingQuantity?: number;
  omsErrorCode?: string;
  omsErrorDescription?: string;
}

// DHAN Super Order Leg Details
export interface DhanSuperOrderLeg {
  orderId: string;
  legName: 'STOP_LOSS_LEG' | 'TARGET_LEG';
  transactionType: 'BUY' | 'SELL';
  remainingQuantity: number;
  price: number;
  orderStatus: string;
  trailingJump?: number;
}

// DHAN Super Order interface
export interface DhanSuperOrder {
  orderId: string;
  dhanClientId: string;
  correlationId: string;
  orderStatus: string;
  transactionType: 'BUY' | 'SELL';
  exchangeSegment: string;
  productType: string;
  orderType: string;
  validity: string;
  tradingSymbol: string;
  securityId: string;
  quantity: number;
  disclosedQuantity: number;
  price: number;
  triggerPrice: number;
  afterMarketOrder: boolean;
  boProfitValue: number;
  boStopLossValue: number;
  legName: string;
  createTime: string;
  updateTime: string;
  exchangeTime: string;
  drvExpiryDate: string;
  drvOptionType: string;
  drvStrikePrice: number;
  omsErrorCode: string;
  omsErrorDescription: string;
  algoId: string;
  remainingQuantity: number;
  averageTradedPrice: number;
  filledQty: number;
  ltp?: number; // Last Traded Price from market data
  legDetails?: DhanSuperOrderLeg[];
}

// Get order details by order ID with retry logic
export async function getDhanOrderDetails(orderId: string, accessToken: string): Promise<DhanOrderDetails> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Fetching order details for orderId: ${orderId} (attempt ${attempt}/${maxRetries})`);
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutMs = parseInt(process.env.DHAN_API_TIMEOUT_MS || '30000');
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`https://api.dhan.co/v2/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'access-token': accessToken,
          'Connection': 'keep-alive'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`📋 Raw order details response:`, JSON.stringify(data, null, 2));
      
      // Validate that we have the expected structure
      if (!data) {
        throw new Error('Invalid response structure from Dhan API');
      }
      
      // Handle both array and object responses
      // The Dhan API returns an array with a single order object
      const orderData = Array.isArray(data) ? data[0] : data;
      
      if (!orderData || typeof orderData !== 'object') {
        throw new Error('Invalid order data structure from Dhan API');
      }
      
      // Map the response to our expected interface
      const orderDetails: DhanOrderDetails = {
        orderId: orderData.orderId || orderId,
        dhanClientId: orderData.dhanClientId || '',
        correlationId: orderData.correlationId || '',
        transactionType: orderData.transactionType || '',
        exchangeSegment: orderData.exchangeSegment || '',
        productType: orderData.productType || '',
        orderType: orderData.orderType || '',
        securityId: orderData.securityId || '',
        quantity: orderData.quantity || 0,
        price: orderData.price || 0,
        averagePrice: orderData.averagePrice || orderData.avgPrice || orderData.averageTradedPrice || null,
        filledQuantity: orderData.filledQuantity || orderData.filledQty || 0,
        status: orderData.status || orderData.orderStatus || 'UNKNOWN',
        targetPrice: orderData.targetPrice || null,
        stopLossPrice: orderData.stopLossPrice || null,
        trailingJump: orderData.trailingJump || null,
        orderTime: orderData.orderTime || orderData.createTime || null,
        updateTime: orderData.updateTime || null,
        // Map error and additional fields
        exchangeOrderId: orderData.exchangeOrderId || null,
        tradingSymbol: orderData.tradingSymbol || null,
        remainingQuantity: orderData.remainingQuantity || null,
        omsErrorCode: orderData.omsErrorCode || null,
        omsErrorDescription: orderData.omsErrorDescription || null
      };
      
      console.log(`✅ Mapped order details:`, {
        orderId: orderDetails.orderId,
        status: orderDetails.status,
        price: orderDetails.price,
        averagePrice: orderDetails.averagePrice,
        filledQuantity: orderDetails.filledQuantity,
        ...(orderDetails.status === 'REJECTED' && {
          errorCode: orderDetails.omsErrorCode,
          errorDescription: orderDetails.omsErrorDescription
        })
      });
      
      return orderDetails;
    } else {
      const errorText = await response.text();
      console.error(`❌ API Error Response:`, errorText);
      throw new Error(`Failed to fetch order details: ${response.status} ${response.statusText} - ${errorText}`);
    }
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';

      if (isAbortError) {
        // Timeouts/aborts are expected occasionally; log a concise warning instead of dumping the whole DOMException
        console.warn(`⏱️ Order details fetch aborted by timeout (attempt ${attempt}/${maxRetries}).`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error fetching order details (attempt ${attempt}/${maxRetries}): ${message}`);
      }
      
      // Check if we should retry
      const isRetryableError = error instanceof Error && (
        error.name === 'AbortError' ||
        error.message.includes('fetch failed') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('UND_ERR_SOCKET') ||
        error.message.includes('other side closed')
      );
      
      if (isRetryableError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms due to network error...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }
      
      // Handle specific network errors for final attempt
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: Order details fetch took too long');
        } else if (error.message.includes('fetch failed') || error.message.includes('UND_ERR_SOCKET') || error.message.includes('ETIMEDOUT')) {
          throw new Error('Network connection failed: Unable to connect to Dhan API');
        } else if (error.message.includes('other side closed')) {
          throw new Error('Connection closed by server: Dhan API connection was terminated');
        }
      }
      
      throw error;
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw new Error('Failed to fetch order details after all retries');
}

// Update target price for an order
export async function updateDhanOrderTargetPrice(
  orderId: string, 
  dhanClientId: string, 
  targetPrice: number, 
  accessToken: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const requestBody = {
      dhanClientId,
      orderId,
      legName: "TARGET_LEG",
      targetPrice
    };

    const response = await fetch(`https://api.dhan.co/v2/super/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access-token': accessToken
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      await response.json();
      return { success: true, message: 'Target price updated successfully' };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.message || errorData.error || `Failed to update target price: ${response.statusText}` 
      };
    }
  } catch (error) {
    console.error('Error updating target price:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Update stop loss price for an order
export async function updateDhanOrderStopLoss(
  orderId: string, 
  dhanClientId: string, 
  stopLossPrice: number, 
  accessToken: string,
  trailingJump?: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const requestBody: {
      dhanClientId: string;
      orderId: string;
      legName: string;
      stopLossPrice: number;
      trailingJump?: number;
    } = {
      dhanClientId,
      orderId,
      legName: "STOP_LOSS_LEG",
      stopLossPrice
    };

    // Only add trailingJump if provided
    if (trailingJump && trailingJump > 0) {
      requestBody.trailingJump = trailingJump;
    }

    const response = await fetch(`https://api.dhan.co/v2/super/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access-token': accessToken
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      await response.json();
      return { success: true, message: 'Stop loss updated successfully' };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        error: errorData.message || errorData.error || `Failed to update stop loss: ${response.statusText}` 
      };
    }
  } catch (error) {
    console.error('Error updating stop loss:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Get all super orders for an account
export async function getAllDhanSuperOrders(accessToken: string): Promise<DhanSuperOrder[]> {
  try {
    console.log('🔍 Fetching all super orders from DHAN API');
    
    const response = await fetch('https://api.dhan.co/v2/super/orders', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'access-token': accessToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch super orders:', errorText);
      throw new Error(`Failed to fetch super orders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${Array.isArray(data) ? data.length : 0} super orders`);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching super orders:', error);
    throw error;
  }
}

// Get orders that need rebasing (TRADED with PENDING legs)
export async function getOrdersNeedingRebase(
  accessToken: string,
  accountConfig: DhanAccountConfig
): Promise<Array<{
  order: DhanSuperOrder;
  entryPrice: number;
  currentStopLoss: number | null;
  currentTarget: number | null;
  needsRebase: boolean;
  reason?: string;
}>> {
  try {
    const allOrders = await getAllDhanSuperOrders(accessToken);
    
    const ordersNeedingRebase = allOrders
      .filter(order => {
        // Only process TRADED orders
        if (order.orderStatus !== 'TRADED') {
          return false;
        }
        
        // Must have leg details
        if (!order.legDetails || order.legDetails.length === 0) {
          return false;
        }
        
        // Check if both legs are PENDING
        const stopLossLeg = order.legDetails.find(leg => leg.legName === 'STOP_LOSS_LEG');
        const targetLeg = order.legDetails.find(leg => leg.legName === 'TARGET_LEG');
        
        return stopLossLeg?.orderStatus === 'PENDING' && targetLeg?.orderStatus === 'PENDING';
      })
      .map(order => {
        // Use LTP (Last Traded Price) if available, otherwise fall back to averageTradedPrice or price
        const entryPrice = order.ltp || order.averageTradedPrice || order.price;
        const stopLossLeg = order.legDetails!.find(leg => leg.legName === 'STOP_LOSS_LEG');
        const targetLeg = order.legDetails!.find(leg => leg.legName === 'TARGET_LEG');
        
        const currentStopLoss = stopLossLeg?.price || null;
        const currentTarget = targetLeg?.price || null;
        
        // Calculate what the SL and TP should be based on entry price
        const signal = order.transactionType as 'BUY' | 'SELL';
        let expectedStopLoss: number;
        let expectedTarget: number;
        
        if (signal === 'BUY') {
          expectedStopLoss = entryPrice * (1 - accountConfig.stopLossPercentage);
          expectedTarget = entryPrice * (1 + accountConfig.targetPricePercentage);
        } else {
          expectedStopLoss = entryPrice * (1 + accountConfig.stopLossPercentage);
          expectedTarget = entryPrice * (1 - accountConfig.targetPricePercentage);
        }
        
        // Round to 2 decimal places
        expectedStopLoss = Math.round(expectedStopLoss * 100) / 100;
        expectedTarget = Math.round(expectedTarget * 100) / 100;
        
        // Check if rebase is needed (price difference threshold)
        const rebaseThreshold = accountConfig.rebaseThresholdPercentage || 0.005; // 0.5% default
        
        let needsRebase = false;
        let reason = '';
        
        if (currentStopLoss) {
          const slDiff = Math.abs(currentStopLoss - expectedStopLoss) / entryPrice;
          if (slDiff > rebaseThreshold) {
            needsRebase = true;
            reason = `SL diff: ${(slDiff * 100).toFixed(2)}%`;
          }
        }
        
        if (currentTarget) {
          const tpDiff = Math.abs(currentTarget - expectedTarget) / entryPrice;
          if (tpDiff > rebaseThreshold) {
            needsRebase = true;
            reason += (reason ? ', ' : '') + `TP diff: ${(tpDiff * 100).toFixed(2)}%`;
          }
        }
        
        return {
          order,
          entryPrice,
          currentStopLoss,
          currentTarget,
          needsRebase,
          reason: needsRebase ? reason : undefined
        };
      });
    
    const needingRebase = ordersNeedingRebase.filter(item => item.needsRebase);
    const withinThreshold = ordersNeedingRebase.filter(item => !item.needsRebase);
    
    console.log(`📊 [REBASE-SUPER-API] Order analysis:`, {
      totalTradedOrders: ordersNeedingRebase.length,
      needingRebase: needingRebase.length,
      withinThreshold: withinThreshold.length
    });
    
    if (withinThreshold.length > 0) {
      console.log(`✅ [REBASE-SUPER-API] ${withinThreshold.length} orders already within threshold (likely already rebased):`, 
        withinThreshold.map(item => ({
          orderId: item.order.orderId,
          symbol: item.order.tradingSymbol,
          slDiff: item.currentStopLoss ? 
            `${(Math.abs(item.currentStopLoss - (item.order.transactionType === 'BUY' ? 
              item.entryPrice * (1 - accountConfig.stopLossPercentage) : 
              item.entryPrice * (1 + accountConfig.stopLossPercentage))) / item.entryPrice * 100).toFixed(3)}%` : 'N/A',
          tpDiff: item.currentTarget ? 
            `${(Math.abs(item.currentTarget - (item.order.transactionType === 'BUY' ? 
              item.entryPrice * (1 + accountConfig.targetPricePercentage) : 
              item.entryPrice * (1 - accountConfig.targetPricePercentage))) / item.entryPrice * 100).toFixed(3)}%` : 'N/A'
        }))
      );
    }
    
    return ordersNeedingRebase;
  } catch (error) {
    console.error('Error getting orders needing rebase:', error);
    throw error;
  }
}

// Rebase TP and SL based on actual entry price
export async function rebaseOrderTpAndSl(
  orderId: string,
  accountConfig: DhanAccountConfig,
  originalAlertPrice: number,
  signal: 'BUY' | 'SELL' = 'BUY'
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  terminalFailure?: boolean; // Flag to indicate non-retryable terminal failure
  rebasedData?: {
    originalTp?: number;
    originalSl?: number;
    newTp?: number;
    newSl?: number;
    actualEntryPrice?: number;
  };
}> {
  try {
    // Check if rebasing is globally disabled
    const rebasingDisabled = process.env.DISABLE_TP_SL_REBASE === 'true';
    if (rebasingDisabled) {
      console.log(`⚠️ TP/SL rebasing is globally disabled via DISABLE_TP_SL_REBASE environment variable`);
      return { 
        success: true, 
        message: 'TP/SL rebasing is disabled globally' 
      };
    }

    // Check if we're in production and rebasing is failing consistently
    const isProduction = process.env.NODE_ENV === 'production';
    const disableInProduction = process.env.DISABLE_REBASE_IN_PRODUCTION === 'true';
    if (isProduction && disableInProduction) {
      console.log(`⚠️ TP/SL rebasing is disabled in production environment`);
      return { 
        success: true, 
        message: 'TP/SL rebasing is disabled in production' 
      };
    }

    // Check if rebasing is disabled for this specific account
    if (!accountConfig.rebaseTpAndSl) {
      console.log(`⚠️ TP/SL rebasing is disabled for account ${accountConfig.clientId}`);
      return { 
        success: true, 
        message: 'TP/SL rebasing is disabled for this account' 
      };
    }

    console.log(`🔄 Starting TP/SL rebase for order ${orderId} on account ${accountConfig.clientId}`);
    
    // Retry logic to wait for order execution
  const maxRetries = parseInt(process.env.REBASE_MAX_RETRIES || '5');
  const retryDelay = parseInt(process.env.REBASE_RETRY_DELAY_MS || '3000'); // milliseconds between retries
    let orderDetails: DhanOrderDetails | null = null;
    let actualEntryPrice: number | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📊 Attempt ${attempt}/${maxRetries} to get order details for ${orderId}`);
      
      try {
        orderDetails = await getDhanOrderDetails(orderId, accountConfig.accessToken);
        
        if (!orderDetails) {
          console.log(`❌ No order details returned on attempt ${attempt}`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          return { success: false, error: 'Failed to fetch order details after all retries' };
        }

        // Check if the response has meaningful data
        const hasValidData = orderDetails.status !== undefined && 
                           orderDetails.status !== null && 
                           orderDetails.status !== '';
        
        if (!hasValidData) {
          console.log(`⚠️ Order details returned but with invalid/empty data on attempt ${attempt}:`, {
            status: orderDetails.status,
            price: orderDetails.price,
            averagePrice: orderDetails.averagePrice,
            filledQuantity: orderDetails.filledQuantity
          });
          
          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${retryDelay}ms due to invalid data...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          } else {
            return { 
              success: false, 
              error: `Order details returned but with invalid data after ${maxRetries} attempts. This might indicate an API issue or invalid order ID.` 
            };
          }
        }

        console.log(`📋 Order status: ${orderDetails.status}, Price: ${orderDetails.price}, AveragePrice: ${orderDetails.averagePrice}, FilledQuantity: ${orderDetails.filledQuantity}`);
        
        // Use averagePrice if available, otherwise use price
        actualEntryPrice = orderDetails.averagePrice || orderDetails.price;
        
        // Check if we have a valid entry price
        if (actualEntryPrice && actualEntryPrice > 0) {
          console.log(`✅ Valid entry price found: ${actualEntryPrice} on attempt ${attempt}`);
          break;
        }
        
        // Check if order is in a terminal state (COMPLETE, REJECTED, CANCELLED)
        const terminalStatuses = ['COMPLETE', 'REJECTED', 'CANCELLED', 'FAILED'];
        if (terminalStatuses.includes(orderDetails.status)) {
          if (actualEntryPrice && actualEntryPrice > 0) {
            console.log(`✅ Order in terminal state ${orderDetails.status} with valid entry price: ${actualEntryPrice}`);
            break;
          } else {
            // For REJECTED orders, mark as non-retryable terminal failure
            if (orderDetails.status === 'REJECTED') {
              const errorMsg = orderDetails.omsErrorDescription || 'Order rejected by broker';
              const errorCode = orderDetails.omsErrorCode || 'N/A';
              console.log(`❌ Order REJECTED by broker, cannot rebase.`, {
                orderId,
                errorCode,
                errorDescription: errorMsg,
                tradingSymbol: orderDetails.tradingSymbol,
                productType: orderDetails.productType
              });
              return { 
                success: false, 
                error: `REJECTED [${errorCode}]: ${errorMsg}`,
                terminalFailure: true // Flag to prevent retries
              };
            }
            
            console.log(`❌ Order in terminal state ${orderDetails.status} but no valid entry price available`);
            return { 
              success: false, 
              error: `Order in terminal state ${orderDetails.status} but no valid entry price available`,
              terminalFailure: true // Flag to prevent retries for other terminal states without price
            };
          }
        }
        
        // If order is still in TRANSIT, PENDING, or doesn't have entry price, wait and retry
        const pendingStatuses = ['TRANSIT', 'PENDING', 'OPEN', 'UNKNOWN'];
        if (pendingStatuses.includes(orderDetails.status) || !actualEntryPrice || actualEntryPrice <= 0) {
          console.log(`⏳ Order still in ${orderDetails.status} status or no entry price, waiting ${retryDelay}ms before retry...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
      } catch (error) {
        console.error(`❌ Error fetching order details on attempt ${attempt}:`, error);
        
        // Handle network errors more gracefully
        if (error instanceof Error) {
          if (error.message.includes('Network connection failed') || 
              error.message.includes('Connection closed by server') ||
              error.message.includes('Request timeout')) {
            console.log(`🌐 Network error detected on attempt ${attempt}, will retry with exponential backoff`);
            if (attempt < maxRetries) {
              // Use exponential backoff for network errors
              const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
              console.log(`⏳ Retrying in ${backoffDelay}ms due to network error...`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
          }
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error;
      }
    }
    
    if (!actualEntryPrice || actualEntryPrice <= 0) {
      // If we still don't have a valid entry price after all retries, 
      // we can either fail or use the original alert price as fallback
      const useOriginalPriceAsFallback = process.env.REBASE_FALLBACK_TO_ALERT_PRICE === 'true';
      
      if (useOriginalPriceAsFallback) {
        console.log(`⚠️ No valid entry price found, using original alert price as fallback: ${originalAlertPrice}`);
        actualEntryPrice = originalAlertPrice;
      } else {
        return { 
          success: false, 
          error: `Order not executed or no valid entry price after ${maxRetries} attempts. Order status: ${orderDetails?.status || 'unknown'}` 
        };
      }
    }

    console.log(`📊 Order details:`, {
      orderId,
      originalAlertPrice,
      actualEntryPrice,
      orderType: orderDetails?.orderType || 'UNKNOWN',
      status: orderDetails?.status || 'UNKNOWN'
    });

    // Only rebase if the entry price is significantly different from alert price
    const priceDifference = Math.abs(actualEntryPrice - originalAlertPrice);
    const priceDifferencePercentage = (priceDifference / originalAlertPrice) * 100;
    
    // Use account-specific rebase threshold (default 0.1%)
    const rebaseThreshold = accountConfig.rebaseThresholdPercentage || 0.1;
    
    // Only rebase if price difference is more than the configured threshold
    if (priceDifferencePercentage < rebaseThreshold) {
      console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${rebaseThreshold}%), skipping rebase`);
      return { 
        success: true, 
        message: `Price difference below threshold (${rebaseThreshold}%), no rebase needed`,
        rebasedData: {
          actualEntryPrice,
          originalTp: orderDetails?.targetPrice,
          originalSl: orderDetails?.stopLossPrice
        }
      };
    }

    // Calculate new TP and SL based on actual entry price and signal type
    let newTargetPrice: number;
    let newStopLossPrice: number;
    
    if (signal === 'SELL') {
      // For SELL signals: SL above entry (to limit losses if price goes up), TP below entry (to capture profit if price goes down)
      newTargetPrice = actualEntryPrice * (1 - accountConfig.targetPricePercentage);
      newStopLossPrice = actualEntryPrice * (1 + accountConfig.stopLossPercentage);
    } else {
      // For BUY signals: SL below entry (to limit losses if price goes down), TP above entry (to capture profit if price goes up)
      newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);
      newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);
    }

    console.log(`🎯 Recalculating TP/SL for ${signal} signal:`, {
      signal,
      originalAlertPrice,
      actualEntryPrice,
      priceDifferencePercentage: priceDifferencePercentage.toFixed(2) + '%',
      originalTp: orderDetails?.targetPrice,
      originalSl: orderDetails?.stopLossPrice,
      newTp: newTargetPrice.toFixed(2),
      newSl: newStopLossPrice.toFixed(2)
    });

    const rebaseResults = {
      originalTp: orderDetails?.targetPrice,
      originalSl: orderDetails?.stopLossPrice,
      newTp: newTargetPrice,
      newSl: newStopLossPrice,
      actualEntryPrice
    };

    // Update target price
    let tpUpdateResult = null;
    if (orderDetails?.targetPrice) {
      tpUpdateResult = await updateDhanOrderTargetPrice(
        orderId,
        accountConfig.clientId,
        newTargetPrice,
        accountConfig.accessToken
      );
      
      if (!tpUpdateResult.success) {
        console.error(`❌ Failed to update target price: ${tpUpdateResult.error}`);
      } else {
        console.log(`✅ Target price updated successfully: ₹${newTargetPrice.toFixed(2)}`);
      }
    }

    // Update stop loss price
    let slUpdateResult = null;
    if (orderDetails?.stopLossPrice) {
      slUpdateResult = await updateDhanOrderStopLoss(
        orderId,
        accountConfig.clientId,
        newStopLossPrice,
        accountConfig.accessToken,
        accountConfig.enableTrailingStopLoss ? accountConfig.minTrailJump : undefined
      );
      
      if (!slUpdateResult.success) {
        console.error(`❌ Failed to update stop loss: ${slUpdateResult.error}`);
      } else {
        console.log(`✅ Stop loss updated successfully: ₹${newStopLossPrice.toFixed(2)}`);
      }
    }

    // Check if both updates were successful
    const tpSuccess = !orderDetails?.targetPrice || tpUpdateResult?.success;
    const slSuccess = !orderDetails?.stopLossPrice || slUpdateResult?.success;

    if (tpSuccess && slSuccess) {
      console.log(`🎉 TP/SL rebase completed successfully for order ${orderId}`);
      return {
        success: true,
        message: 'TP/SL rebased successfully based on actual entry price',
        rebasedData: rebaseResults
      };
    } else {
      const errors = [];
      if (!tpSuccess) errors.push(`TP update failed: ${tpUpdateResult?.error}`);
      if (!slSuccess) errors.push(`SL update failed: ${slUpdateResult?.error}`);
      
      return {
        success: false,
        error: `Partial rebase failure: ${errors.join(', ')}`,
        rebasedData: rebaseResults
      };
    }

  } catch (error) {
    console.error(`❌ Error during TP/SL rebase for order ${orderId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during rebase'
    };
  }
}

// Improved rebase function using super orders API
export async function rebaseSuperOrderTpAndSl(
  order: DhanSuperOrder,
  accountConfig: DhanAccountConfig
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  rebasedData?: {
    originalTp?: number;
    originalSl?: number;
    newTp?: number;
    newSl?: number;
    actualEntryPrice?: number;
  };
}> {
  try {
    const orderId = order.orderId;
    // Use LTP (Last Traded Price) if available, otherwise fall back to averageTradedPrice or price
    const entryPrice = order.ltp || order.averageTradedPrice || order.price;
    const signal = order.transactionType;
    
    console.log(`🔄 Rebasing super order ${orderId} with entry price ₹${entryPrice}`, {
      ltp: order.ltp,
      averageTradedPrice: order.averageTradedPrice,
      price: order.price,
      selectedEntryPrice: entryPrice
    });
    
    // Get current leg prices
    const stopLossLeg = order.legDetails?.find(leg => leg.legName === 'STOP_LOSS_LEG');
    const targetLeg = order.legDetails?.find(leg => leg.legName === 'TARGET_LEG');
    
    if (!stopLossLeg || !targetLeg) {
      return {
        success: false,
        error: 'Order missing stop loss or target leg details'
      };
    }
    
    const currentStopLoss = stopLossLeg.price;
    const currentTarget = targetLeg.price;
    
    // Calculate new TP/SL based on entry price
    let newStopLossPrice: number;
    let newTargetPrice: number;
    
    if (signal === 'BUY') {
      newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);
      newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
    } else {
      newStopLossPrice = entryPrice * (1 + accountConfig.stopLossPercentage);
      newTargetPrice = entryPrice * (1 - accountConfig.targetPricePercentage);
    }
    
    // Round to 2 decimal places
    newStopLossPrice = Math.round(newStopLossPrice * 100) / 100;
    newTargetPrice = Math.round(newTargetPrice * 100) / 100;
    
    const rebaseResults = {
      originalTp: currentTarget,
      originalSl: currentStopLoss,
      newTp: newTargetPrice,
      newSl: newStopLossPrice,
      actualEntryPrice: entryPrice
    };
    
    console.log(`🎯 Recalculating TP/SL for ${signal} signal:`, {
      signal,
      actualEntryPrice: entryPrice,
      originalTp: currentTarget,
      originalSl: currentStopLoss,
      newTp: newTargetPrice.toFixed(2),
      newSl: newStopLossPrice.toFixed(2)
    });
    
    // Check if rebase is needed
    const rebaseThreshold = accountConfig.rebaseThresholdPercentage || 0.005;
    const slDiff = Math.abs(currentStopLoss - newStopLossPrice) / entryPrice;
    const tpDiff = Math.abs(currentTarget - newTargetPrice) / entryPrice;
    
    if (slDiff <= rebaseThreshold && tpDiff <= rebaseThreshold) {
      console.log(`✅ No rebase needed - differences within threshold (${(rebaseThreshold * 100).toFixed(2)}%)`);
      return {
        success: true,
        message: 'No rebase needed - prices within threshold',
        rebasedData: rebaseResults
      };
    }
    
    // Update target price if needed
    let tpUpdateResult;
    if (tpDiff > rebaseThreshold) {
      console.log(`📈 Updating target price from ₹${currentTarget.toFixed(2)} to ₹${newTargetPrice.toFixed(2)}`);
      tpUpdateResult = await updateDhanOrderTargetPrice(
        orderId,
        order.dhanClientId,
        newTargetPrice,
        accountConfig.accessToken
      );
      
      if (!tpUpdateResult.success) {
        console.error(`❌ Failed to update target price: ${tpUpdateResult.error}`);
      } else {
        console.log(`✅ Target price updated successfully: ₹${newTargetPrice.toFixed(2)}`);
      }
    }
    
    // Update stop loss if needed
    let slUpdateResult;
    if (slDiff > rebaseThreshold) {
      console.log(`📉 Updating stop loss from ₹${currentStopLoss.toFixed(2)} to ₹${newStopLossPrice.toFixed(2)}`);
      slUpdateResult = await updateDhanOrderStopLoss(
        orderId,
        order.dhanClientId,
        newStopLossPrice,
        accountConfig.accessToken,
        accountConfig.enableTrailingStopLoss ? accountConfig.minTrailJump : undefined
      );
      
      if (!slUpdateResult.success) {
        console.error(`❌ Failed to update stop loss: ${slUpdateResult.error}`);
      } else {
        console.log(`✅ Stop loss updated successfully: ₹${newStopLossPrice.toFixed(2)}`);
      }
    }
    
    // Check if both updates were successful
    const tpSuccess = tpDiff <= rebaseThreshold || tpUpdateResult?.success;
    const slSuccess = slDiff <= rebaseThreshold || slUpdateResult?.success;
    
    if (tpSuccess && slSuccess) {
      console.log(`🎉 TP/SL rebase completed successfully for order ${orderId}`);
      return {
        success: true,
        message: 'TP/SL rebased successfully based on actual entry price',
        rebasedData: rebaseResults
      };
    } else {
      const errors = [];
      if (!tpSuccess) errors.push(`TP update failed: ${tpUpdateResult?.error}`);
      if (!slSuccess) errors.push(`SL update failed: ${slUpdateResult?.error}`);
      
      return {
        success: false,
        error: `Partial rebase failure: ${errors.join(', ')}`,
        rebasedData: rebaseResults
      };
    }
    
  } catch (error) {
    console.error(`❌ Error during TP/SL rebase for super order:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during rebase'
    };
  }
}
