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
  // Calculate position size for this specific account
  let quantity: number;
  let positionCalculation;
  
  if (orderConfig?.useAutoPositionSizing !== false) {
    // Use automatic position sizing based on account configuration
    positionCalculation = calculatePositionSizeForAccount(alert.price, accountConfig);
    
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
  
  // Determine order type and price
  const orderType = orderConfig?.orderType || DHAN_ORDER_TYPES_ORDER.MARKET;
  const orderPrice = orderType === DHAN_ORDER_TYPES_ORDER.MARKET ? 0 : alert.price;
  
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
        clientId: accountConfig.clientId
      };
    } else {
      console.error(`Dhan order failed for account ${accountConfig.clientId}:`, responseData);
      return {
        success: false,
        error: responseData.message || responseData.error || 'Order placement failed',
        correlationId: orderRequest.correlationId,
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId
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
  const activeAccounts = getActiveAccountConfigurations();
  
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
}

// Get order details by order ID
export async function getDhanOrderDetails(orderId: string, accessToken: string): Promise<DhanOrderDetails> {
  try {
    const response = await fetch(`https://api.dhan.co/v2/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'access-token': accessToken
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error(`Failed to fetch order details: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw error;
  }
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

// Rebase TP and SL based on actual entry price
export async function rebaseOrderTpAndSl(
  orderId: string,
  accountConfig: DhanAccountConfig,
  originalAlertPrice: number
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
    console.log(`🔄 Starting TP/SL rebase for order ${orderId} on account ${accountConfig.clientId}`);
    
    // Get order details to find actual entry price
    const orderDetails = await getDhanOrderDetails(orderId, accountConfig.accessToken);
    
    if (!orderDetails) {
      return { success: false, error: 'Failed to fetch order details' };
    }

    // Use averagePrice if available, otherwise use price
    const actualEntryPrice = orderDetails.averagePrice || orderDetails.price;
    
    if (!actualEntryPrice || actualEntryPrice <= 0) {
      return { success: false, error: 'Invalid entry price from order details' };
    }

    console.log(`📊 Order details:`, {
      orderId,
      originalAlertPrice,
      actualEntryPrice,
      orderType: orderDetails.orderType,
      status: orderDetails.status
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
          originalTp: orderDetails.targetPrice,
          originalSl: orderDetails.stopLossPrice
        }
      };
    }

    // Calculate new TP and SL based on actual entry price
    const newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);
    const newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);

    console.log(`🎯 Recalculating TP/SL:`, {
      originalAlertPrice,
      actualEntryPrice,
      priceDifferencePercentage: priceDifferencePercentage.toFixed(2) + '%',
      originalTp: orderDetails.targetPrice,
      originalSl: orderDetails.stopLossPrice,
      newTp: newTargetPrice.toFixed(2),
      newSl: newStopLossPrice.toFixed(2)
    });

    const rebaseResults = {
      originalTp: orderDetails.targetPrice,
      originalSl: orderDetails.stopLossPrice,
      newTp: newTargetPrice,
      newSl: newStopLossPrice,
      actualEntryPrice
    };

    // Update target price
    let tpUpdateResult = null;
    if (orderDetails.targetPrice) {
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
    if (orderDetails.stopLossPrice) {
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
    const tpSuccess = !orderDetails.targetPrice || tpUpdateResult?.success;
    const slSuccess = !orderDetails.stopLossPrice || slUpdateResult?.success;

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
