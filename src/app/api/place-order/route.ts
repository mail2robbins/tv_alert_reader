import { NextRequest, NextResponse } from 'next/server';
import { placeDhanOrder, placeDhanOrderOnAllAccounts, placeDhanOrderForAccount } from '@/lib/dhanApi';
import { rebaseQueueManager } from '@/lib/rebaseQueueManager';
import { storePlacedOrder, storeMultiplePlacedOrders } from '@/lib/orderTracker';
import { calculatePositionSize, calculatePositionSizesForAllAccounts } from '@/lib/fundManager';
import { logError } from '@/lib/fileLogger';
import { getAccountConfiguration, loadAccountConfigurations } from '@/lib/multiAccountManager';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/userDatabase';
import { ApiResponse } from '@/types/alert';
import { TradingViewAlert } from '@/types/alert';

// Handle manual order placement
async function handleManualOrder(body: {
  accountId: number;
  orderType: 'BUY' | 'SELL';
  executionType?: 'MARKET' | 'LIMIT';
  productType?: 'CNC' | 'INTRADAY';
  ticker: string;
  currentPrice: number;
  customSettings?: {
    availableFunds?: number;
    leverage?: number;
    stopLossPercentage?: number;
    targetPricePercentage?: number;
    riskOnCapital?: number;
    enableTrailingStopLoss?: boolean;
  };
}, request: NextRequest) {
  try {
    // Verify user authentication for manual orders
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for manual orders' } as ApiResponse<null>,
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
        { success: false, error: 'User not authorized to place manual orders' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const { accountId, orderType, executionType, productType, ticker, currentPrice, customSettings } = body;

    // Get account configuration
    const accountConfig = await getAccountConfiguration(accountId);
    if (!accountConfig) {
      return NextResponse.json(
        { success: false, error: `Account ${accountId} not found or not configured` } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Create a mock TradingView alert for the manual order
    const manualAlert: TradingViewAlert = {
      ticker: ticker.toUpperCase(),
      signal: orderType,
      price: currentPrice,
      timestamp: new Date().toISOString(),
      strategy: 'Manual Order',
      custom_note: `Manual ${orderType} order for ${ticker} at ₹${currentPrice}`
    };

    // Apply custom settings if provided (temporary override for this order only)
    let effectiveAccountConfig = accountConfig;
    if (customSettings) {
      effectiveAccountConfig = {
        ...accountConfig,
        ...(customSettings.availableFunds !== undefined && { availableFunds: customSettings.availableFunds }),
        ...(customSettings.leverage !== undefined && { leverage: customSettings.leverage }),
        ...(customSettings.stopLossPercentage !== undefined && { stopLossPercentage: customSettings.stopLossPercentage }),
        ...(customSettings.targetPricePercentage !== undefined && { targetPricePercentage: customSettings.targetPricePercentage }),
        ...(customSettings.riskOnCapital !== undefined && { riskOnCapital: customSettings.riskOnCapital }),
        ...(customSettings.enableTrailingStopLoss !== undefined && { enableTrailingStopLoss: customSettings.enableTrailingStopLoss })
      };
    }

    console.log(`📝 Placing manual order:`, {
      accountId,
      orderType,
      executionType,
      productType: productType || 'INTRADAY (default)',
      ticker,
      currentPrice,
      customSettings: customSettings || 'none',
      accountConfig: {
        clientId: effectiveAccountConfig.clientId,
        availableFunds: effectiveAccountConfig.availableFunds,
        leverage: effectiveAccountConfig.leverage
      }
    });

    // Place order using the existing function
    const dhanResponse = await placeDhanOrderForAccount(manualAlert, effectiveAccountConfig, {
      useAutoPositionSizing: true,
      exchangeSegment: process.env.DHAN_EXCHANGE_SEGMENT || 'NSE_EQ',
      productType: productType || process.env.DHAN_PRODUCT_TYPE || 'INTRADAY',
      orderType: executionType || 'MARKET' // Use execution type from form, fallback to MARKET
    });

    // Store the order
    const manualOrderId = `manual_${Date.now()}`;
    const placedOrder = await storePlacedOrder(
      manualAlert, 
      manualOrderId, 
      dhanResponse.success ? 1 : 0, // We don't know the exact quantity here, but it's stored in the order
      dhanResponse, 
      undefined // No position calculation for manual orders
    );

    // Add to rebase queue if successful and rebasing is enabled
    let rebaseResult = null;
    if (dhanResponse.success && dhanResponse.orderId && accountConfig.rebaseTpAndSl) {
      console.log(`📝 Adding manual order ${dhanResponse.orderId} to rebase queue for account ${accountConfig.clientId}`);
      
      rebaseQueueManager.addToQueue(
        dhanResponse.orderId,
        accountConfig,
        currentPrice,
        accountConfig.clientId,
        accountId.toString(),
        orderType
      );
      
      rebaseResult = {
        success: true,
        message: 'Order added to rebase queue for delayed processing'
      };
    }

    return NextResponse.json(
      { 
        success: true, 
        data: {
          order: placedOrder,
          dhanResponse,
          rebaseResult,
          manualOrder: {
            accountId,
            orderType,
            executionType,
            ticker,
            currentPrice,
            accountConfig: {
              clientId: accountConfig.clientId,
              availableFunds: accountConfig.availableFunds,
              leverage: accountConfig.leverage,
              stopLossPercentage: accountConfig.stopLossPercentage,
              targetPricePercentage: accountConfig.targetPricePercentage,
              riskOnCapital: accountConfig.riskOnCapital
            }
          }
        }
      } as ApiResponse<{ 
        order: typeof placedOrder; 
        dhanResponse: typeof dhanResponse;
        rebaseResult: typeof rebaseResult;
        manualOrder: {
          accountId: number;
          orderType: string;
          executionType: string;
          ticker: string;
          currentPrice: number;
          accountConfig: {
            clientId: string;
            availableFunds: number;
            leverage: number;
            stopLossPercentage: number;
            targetPricePercentage: number;
            riskOnCapital: number;
          };
        };
      }>,
      { status: 200 }
    );

  } catch (error) {
    console.error('Manual order placement failed:', error);
    return NextResponse.json(
      { success: false, error: `Manual order placement failed: ${error instanceof Error ? error.message : String(error)}` } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle manual order placement in all accounts
async function handleManualOrderAllAccounts(body: {
  orderType: 'BUY' | 'SELL';
  executionType?: 'MARKET' | 'LIMIT';
  productType?: 'CNC' | 'INTRADAY';
  ticker: string;
  currentPrice: number;
  customSettings?: {
    availableFunds?: number;
    leverage?: number;
    stopLossPercentage?: number;
    targetPricePercentage?: number;
    riskOnCapital?: number;
    enableTrailingStopLoss?: boolean;
  };
}, request: NextRequest) {
  try {
    // Verify user authentication for manual orders
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for manual orders' } as ApiResponse<null>,
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
        { success: false, error: 'User not authorized to place manual orders' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const { orderType, executionType, productType, ticker, currentPrice, customSettings } = body;

    // Get all active account configurations
    const config = await loadAccountConfigurations();
    const userAccounts = config.activeAccounts;

    if (userAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active accounts found in configuration' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Create a mock TradingView alert for the manual order
    const manualAlert: TradingViewAlert = {
      ticker: ticker.toUpperCase(),
      signal: orderType,
      price: currentPrice,
      timestamp: new Date().toISOString(),
      strategy: 'Manual Order (All Accounts)',
      custom_note: `Manual ${orderType} order for ${ticker} at ₹${currentPrice} in all accounts`
    };

    console.log(`📝 Placing manual order in all accounts:`, {
      orderType,
      executionType,
      productType: productType || 'INTRADAY (default)',
      ticker,
      currentPrice,
      customSettings: customSettings || 'none',
      accountCount: userAccounts.length,
      accounts: userAccounts.map(acc => ({
        accountId: acc.accountId,
        clientId: acc.clientId,
        availableFunds: acc.availableFunds
      }))
    });

    // Place orders on all user accounts
    const dhanResponses = [];
    const placedOrders = [];

    for (const accountConfig of userAccounts) {
      try {
        // Apply custom settings if provided (temporary override for this order only)
        let effectiveAccountConfig = accountConfig;
        if (customSettings) {
          effectiveAccountConfig = {
            ...accountConfig,
            ...(customSettings.availableFunds !== undefined && { availableFunds: customSettings.availableFunds }),
            ...(customSettings.leverage !== undefined && { leverage: customSettings.leverage }),
            ...(customSettings.stopLossPercentage !== undefined && { stopLossPercentage: customSettings.stopLossPercentage }),
            ...(customSettings.targetPricePercentage !== undefined && { targetPricePercentage: customSettings.targetPricePercentage }),
            ...(customSettings.riskOnCapital !== undefined && { riskOnCapital: customSettings.riskOnCapital }),
            ...(customSettings.enableTrailingStopLoss !== undefined && { enableTrailingStopLoss: customSettings.enableTrailingStopLoss })
          };
        }

        const dhanResponse = await placeDhanOrderForAccount(manualAlert, effectiveAccountConfig, {
          useAutoPositionSizing: true,
          exchangeSegment: process.env.DHAN_EXCHANGE_SEGMENT || 'NSE_EQ',
          productType: productType || process.env.DHAN_PRODUCT_TYPE || 'INTRADAY',
          orderType: executionType || 'MARKET'
        });

        dhanResponses.push(dhanResponse);

        // Store the order
        const manualOrderId = `manual_all_${Date.now()}_${accountConfig.accountId}`;
        const placedOrder = await storePlacedOrder(
          manualAlert,
          manualOrderId,
          dhanResponse.success ? 1 : 0,
          dhanResponse,
          undefined
        );

        placedOrders.push(placedOrder);

        // Add to rebase queue if successful and rebasing is enabled
        if (dhanResponse.success && dhanResponse.orderId && accountConfig.rebaseTpAndSl) {
          console.log(`📝 Adding manual order ${dhanResponse.orderId} to rebase queue for account ${accountConfig.clientId}`);
          
          rebaseQueueManager.addToQueue(
            dhanResponse.orderId,
            accountConfig,
            currentPrice,
            accountConfig.clientId,
            accountConfig.accountId.toString(),
            orderType
          );
        }
      } catch (error) {
        console.error(`Error placing order for account ${accountConfig.accountId}:`, error);
        dhanResponses.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          correlationId: `error_${Date.now()}`,
          accountId: accountConfig.accountId,
          clientId: accountConfig.clientId
        });
      }
    }

    const successfulOrders = dhanResponses.filter(resp => resp.success);
    const failedOrders = dhanResponses.filter(resp => !resp.success);

    return NextResponse.json(
      { 
        success: successfulOrders.length > 0, 
        data: {
          orders: placedOrders,
          dhanResponses,
          rebaseQueueStatus: rebaseQueueManager.getQueueStatus(),
          summary: {
            totalAccounts: userAccounts.length,
            successfulOrders: successfulOrders.length,
            failedOrders: failedOrders.length,
            orderType,
            executionType,
            ticker,
            currentPrice
          }
        }
      } as ApiResponse<{
        orders: typeof placedOrders;
        dhanResponses: typeof dhanResponses;
        rebaseQueueStatus: ReturnType<typeof rebaseQueueManager.getQueueStatus>;
        summary: {
          totalAccounts: number;
          successfulOrders: number;
          failedOrders: number;
          orderType: string;
          executionType?: string;
          ticker: string;
          currentPrice: number;
        };
      }>,
      { status: 200 }
    );

  } catch (error) {
    console.error('Manual order placement in all accounts failed:', error);
    return NextResponse.json(
      { success: false, error: `Manual order placement failed: ${error instanceof Error ? error.message : String(error)}` } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a manual order request for all accounts
    if (body.placeInAllAccounts && body.orderType && body.ticker && body.currentPrice) {
      return handleManualOrderAllAccounts(body, request);
    }
    
    // Check if this is a manual order request for a single account
    if (body.accountId && body.orderType && body.ticker && body.currentPrice) {
      return handleManualOrder(body, request);
    }
    
    // Original TradingView alert logic
    const { alert, quantity, orderConfig, useAutoPositionSizing = true, useMultiAccount = true } = body;

    // Validate required fields
    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Note: Duplicate ticker checking is now handled per-account based on allowDuplicateTickers setting
    // in the placeDhanOrderForAccount function

    if (useMultiAccount) {
      // Multi-account order placement
      try {
        // Calculate position sizes for all accounts
        const positionCalculations = await calculatePositionSizesForAllAccounts(alert.price, alert.signal);
        
        // Filter out accounts that cannot place orders
        const validCalculations = positionCalculations.filter(calc => calc.canPlaceOrder);
        
        if (validCalculations.length === 0) {
          return NextResponse.json(
            { success: false, error: 'No accounts can place this order based on their configurations' } as ApiResponse<null>,
            { status: 400 }
          );
        }

        // Place orders on all valid accounts
        const dhanResponses = await placeDhanOrderOnAllAccounts(alert, {
          quantity: useAutoPositionSizing ? undefined : quantity,
          useAutoPositionSizing,
          exchangeSegment: orderConfig?.exchangeSegment || 'NSE_EQ',
          productType: orderConfig?.productType || 'INTRADAY',
          orderType: orderConfig?.orderType || 'MARKET',
          targetPrice: orderConfig?.targetPrice,
          stopLossPrice: orderConfig?.stopLossPrice,
          trailingJump: orderConfig?.trailingJump
        });

        // Store all orders with all position calculations (including failed ones)
        const placedOrders = await storeMultiplePlacedOrders(
          alert, 
          alert.id || 'unknown', 
          dhanResponses, 
          positionCalculations
        );

        const successfulOrders = placedOrders.filter(order => order.status === 'placed');
        const failedOrders = placedOrders.filter(order => order.status === 'failed');

        // Add successful orders to rebase queue for delayed processing
        for (const dhanResponse of dhanResponses) {
          if (dhanResponse.success && dhanResponse.orderId && dhanResponse.accountId && dhanResponse.clientId) {
            const accountConfig = await getAccountConfiguration(dhanResponse.accountId);
            if (accountConfig && accountConfig.rebaseTpAndSl) {
              console.log(`📝 Adding order ${dhanResponse.orderId} to rebase queue for account ${dhanResponse.clientId}`);
              
              rebaseQueueManager.addToQueue(
                dhanResponse.orderId,
                accountConfig,
                alert.price,
                dhanResponse.clientId,
                dhanResponse.accountId.toString(),
                alert.signal
              );
            }
          }
        }

        return NextResponse.json(
          { 
            success: true, 
            data: {
              orders: placedOrders,
              dhanResponses,
              rebaseQueueStatus: rebaseQueueManager.getQueueStatus(),
              summary: {
                totalOrders: placedOrders.length,
                successfulOrders: successfulOrders.length,
                failedOrders: failedOrders.length,
                accountsUsed: validCalculations.length,
                rebaseQueued: rebaseQueueManager.getQueueStatus().queueLength
              }
            }
          } as ApiResponse<{ 
            orders: typeof placedOrders; 
            dhanResponses: typeof dhanResponses;
            rebaseQueueStatus: { queueLength: number; processing: boolean; resultsCount: number };
            summary: {
              totalOrders: number;
              successfulOrders: number;
              failedOrders: number;
              accountsUsed: number;
              rebaseQueued: number;
            };
          }>,
          { status: 200 }
        );

      } catch (error) {
        console.error('Multi-account order placement failed:', error);
        return NextResponse.json(
          { success: false, error: `Multi-account order placement failed: ${error instanceof Error ? error.message : String(error)}` } as ApiResponse<null>,
          { status: 500 }
        );
      }
    } else {
      // Single account order placement (legacy mode)
      let finalQuantity: number;
      let positionCalculation;
      
      if (useAutoPositionSizing) {
        positionCalculation = calculatePositionSize(alert.price);
        
        if (!positionCalculation.canPlaceOrder) {
          return NextResponse.json(
            { success: false, error: `Cannot place order: ${positionCalculation.reason}` } as ApiResponse<null>,
            { status: 400 }
          );
        }
        
        finalQuantity = positionCalculation.calculatedQuantity;
      } else {
        // Manual quantity
        if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
          return NextResponse.json(
            { success: false, error: 'Quantity must be a positive number when auto position sizing is disabled' } as ApiResponse<null>,
            { status: 400 }
          );
        }
        finalQuantity = quantity;
      }

      // Place order on Dhan.co
      const dhanResponse = await placeDhanOrder(alert, {
        quantity: useAutoPositionSizing ? undefined : finalQuantity,
        useAutoPositionSizing,
        exchangeSegment: orderConfig?.exchangeSegment || 'NSE_EQ',
        productType: orderConfig?.productType || 'INTRADAY',
        orderType: orderConfig?.orderType || 'MARKET',
        targetPrice: orderConfig?.targetPrice,
        stopLossPrice: orderConfig?.stopLossPrice,
        trailingJump: orderConfig?.trailingJump
      });

      // Store the order
      const placedOrder = await storePlacedOrder(alert, alert.id || 'unknown', finalQuantity, dhanResponse, positionCalculation);

      // Rebase TP/SL for successful order if configured (legacy mode)
      let rebaseResult = null;
      if (dhanResponse.success && dhanResponse.orderId) {
        // For legacy mode, we need to get the account config from environment variables
        const legacyAccountConfig = {
          accountId: 1,
          accessToken: process.env.DHAN_ACCESS_TOKEN || '',
          clientId: process.env.DHAN_CLIENT_ID || '',
          availableFunds: parseFloat(process.env.AVAILABLE_FUNDS || '20000'),
          leverage: parseFloat(process.env.LEVERAGE || '2'),
          maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
          minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE || '1000'),
          maxOrderValue: parseFloat(process.env.MAX_ORDER_VALUE || '5000'),
          stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.01'),
          targetPricePercentage: parseFloat(process.env.TARGET_PRICE_PERCENTAGE || '0.015'),
          riskOnCapital: parseFloat(process.env.RISK_ON_CAPITAL || '1.0'),
          isActive: true,
          enableTrailingStopLoss: process.env.ENABLE_TRAILING_STOP_LOSS === 'true',
          minTrailJump: parseFloat(process.env.MIN_TRAIL_JUMP || '0.05'),
          rebaseTpAndSl: process.env.REBASE_TP_AND_SL === 'true',
          rebaseThresholdPercentage: parseFloat(process.env.REBASE_THRESHOLD_PERCENTAGE || '0.1'),
          allowDuplicateTickers: process.env.ALLOW_DUPLICATE_TICKERS === 'true',
          orderType: process.env.DHAN_ORDER_TYPE || 'MARKET',
          limitBufferPercentage: parseFloat(process.env.LIMIT_BUFFER_PERCENTAGE || '0.0')
        };

        if (legacyAccountConfig.rebaseTpAndSl) {
          console.log(`📝 Adding legacy order ${dhanResponse.orderId} to rebase queue`);
          
          rebaseQueueManager.addToQueue(
            dhanResponse.orderId,
            legacyAccountConfig,
            alert.price,
            legacyAccountConfig.clientId,
            'legacy',
            alert.signal
          );
          
          rebaseResult = {
            success: true,
            message: 'Order added to rebase queue for delayed processing'
          };
        }
      }

      return NextResponse.json(
        { 
          success: true, 
          data: {
            order: placedOrder,
            dhanResponse,
            rebaseResult
          }
        } as ApiResponse<{ 
          order: typeof placedOrder; 
          dhanResponse: typeof dhanResponse;
          rebaseResult: typeof rebaseResult;
        }>,
        { status: 200 }
      );
    }

  } catch (error) {
    await logError('Failed to place order', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place order' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}
