import { NextRequest, NextResponse } from 'next/server';
import { loadAccountConfigurations } from '@/lib/multiAccountManager';
import { calculatePositionSizeForAccount } from '@/lib/fundManager';
import { mapTickerToSecurityId } from '@/lib/instrumentMapper';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/userDatabase';
import { ApiResponse } from '@/types/alert';

interface QuickBuyRequest {
  ticker: string;
  currentPrice: number;
  productType?: 'CNC' | 'INTRADAY';
  executionType?: 'MARKET' | 'LIMIT';
  accountId?: number;
}

interface DhanOrderResponse {
  success: boolean;
  orderId?: string;
  orderStatus?: string;
  error?: string;
  correlationId?: string;
}

// Place a simple buy order on Dhan (no SL/TP - regular order)
async function placeDhanRegularOrder(
  accessToken: string,
  clientId: string,
  securityId: string,
  quantity: number,
  price: number,
  productType: 'CNC' | 'INTRADAY',
  executionType: 'MARKET' | 'LIMIT'
): Promise<DhanOrderResponse> {
  const correlationId = `quick_buy_${Date.now()}`;
  
  const orderPayload = {
    dhanClientId: clientId,
    correlationId,
    transactionType: 'BUY',
    exchangeSegment: 'NSE_EQ',
    productType: productType,
    orderType: executionType,
    validity: 'DAY',
    securityId: securityId,
    quantity: quantity,
    price: executionType === 'LIMIT' ? price : 0,
    afterMarketOrder: false
  };

  console.log(`📤 Placing quick buy order:`, orderPayload);

  try {
    const response = await fetch('https://api.dhan.co/v2/orders', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'access-token': accessToken
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    console.log(`📥 Dhan API response:`, data);

    if (response.ok && data.orderId) {
      return {
        success: true,
        orderId: data.orderId,
        orderStatus: data.orderStatus,
        correlationId
      };
    } else {
      return {
        success: false,
        error: data.errorMessage || data.message || 'Order placement failed',
        correlationId
      };
    }
  } catch (error) {
    console.error('Dhan API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      correlationId
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // Verify user exists and is approved
    const user = await findUserById(payload.userId);
    if (!user || !user.isApproved || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User not authorized to place orders' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const body: QuickBuyRequest = await request.json();
    const { ticker, currentPrice, productType = 'CNC', executionType = 'MARKET', accountId } = body;

    // Validate input
    if (!ticker || !currentPrice || currentPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker or price' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get security ID for the ticker
    const securityId = await mapTickerToSecurityId(ticker.toUpperCase());
    if (!securityId || securityId === ticker.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: `Security ID not found for ticker: ${ticker}` } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get user's account configuration
    const config = await loadAccountConfigurations();
    let userAccount = null;

    // If accountId is provided, use that specific account
    if (accountId) {
      userAccount = config.accounts.find(acc => acc.accountId === accountId && acc.isActive);
    } else if (user.dhanClientId) {
      // Fallback to user's default account
      userAccount = config.accounts.find(acc => acc.clientId === user.dhanClientId && acc.isActive);
    }

    if (!userAccount) {
      return NextResponse.json(
        { success: false, error: 'No active trading account found for user' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Calculate position size using the account's settings
    // For CNC orders: leverage = 1, riskOnCapital = 100%
    const effectiveConfig = {
      ...userAccount,
      leverage: productType === 'CNC' ? 1 : userAccount.leverage,
      riskOnCapital: productType === 'CNC' ? 1.0 : userAccount.riskOnCapital
    };

    const positionCalculation = calculatePositionSizeForAccount(currentPrice, effectiveConfig, 'BUY');

    if (!positionCalculation.canPlaceOrder) {
      return NextResponse.json(
        { success: false, error: `Cannot place order: ${positionCalculation.reason}` } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.log(`📝 Quick Buy Order:`, {
      ticker,
      currentPrice,
      productType,
      executionType,
      quantity: positionCalculation.calculatedQuantity,
      accountId: userAccount.accountId,
      clientId: userAccount.clientId
    });

    // Place the order
    const orderResponse = await placeDhanRegularOrder(
      userAccount.accessToken,
      userAccount.clientId,
      securityId,
      positionCalculation.calculatedQuantity,
      currentPrice,
      productType,
      executionType
    );

    if (orderResponse.success) {
      return NextResponse.json({
        success: true,
        data: {
          orderId: orderResponse.orderId,
          orderStatus: orderResponse.orderStatus,
          correlationId: orderResponse.correlationId,
          ticker,
          quantity: positionCalculation.calculatedQuantity,
          price: currentPrice,
          productType,
          executionType,
          orderValue: positionCalculation.calculatedQuantity * currentPrice,
          accountId: userAccount.accountId,
          clientId: userAccount.clientId
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: orderResponse.error || 'Order placement failed' } as ApiResponse<null>,
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Quick buy order failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Order placement failed' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
