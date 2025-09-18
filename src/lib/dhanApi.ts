import { TradingViewAlert } from '@/types/alert';
import { calculatePositionSize } from './fundManager';
import { mapTickerToSecurityId } from './instrumentMapper';

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

// Map ticker to security ID using Dhan's instrument list
async function getSecurityId(ticker: string): Promise<string> {
  return await mapTickerToSecurityId(ticker);
}

// Place order on Dhan.co with automatic position sizing
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

  // Get proper Security ID from Dhan's instrument list
  const securityId = await getSecurityId(alert.ticker);
  
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
