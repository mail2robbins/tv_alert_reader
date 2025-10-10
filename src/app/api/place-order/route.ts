import { NextRequest, NextResponse } from 'next/server';
import { placeDhanOrder, placeDhanOrderOnAllAccounts, rebaseOrderTpAndSl } from '@/lib/dhanApi';
import { storePlacedOrder, storeMultiplePlacedOrders, hasTickerBeenOrderedToday } from '@/lib/orderTracker';
import { calculatePositionSize, calculatePositionSizesForAllAccounts } from '@/lib/fundManager';
import { logError } from '@/lib/fileLogger';
import { getAccountConfiguration } from '@/lib/multiAccountManager';
import { ApiResponse } from '@/types/alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert, quantity, orderConfig, useAutoPositionSizing = true, useMultiAccount = true } = body;

    // Validate required fields
    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check if ticker has already been ordered today
    if (hasTickerBeenOrderedToday(alert.ticker)) {
      console.log(`Order blocked: Ticker ${alert.ticker} has already been ordered today`);
      return NextResponse.json(
        { success: false, error: `Order blocked: Ticker ${alert.ticker} has already been ordered today` } as ApiResponse<null>,
        { status: 409 } // Conflict status code
      );
    }

    if (useMultiAccount) {
      // Multi-account order placement
      try {
        // Calculate position sizes for all accounts
        const positionCalculations = calculatePositionSizesForAllAccounts(alert.price);
        
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
        const placedOrders = storeMultiplePlacedOrders(
          alert, 
          alert.id || 'unknown', 
          dhanResponses, 
          positionCalculations
        );

        const successfulOrders = placedOrders.filter(order => order.status === 'placed');
        const failedOrders = placedOrders.filter(order => order.status === 'failed');

        // Rebase TP/SL for successful orders if configured
        const rebaseResults = [];
        for (const dhanResponse of dhanResponses) {
          if (dhanResponse.success && dhanResponse.orderId && dhanResponse.accountId) {
            const accountConfig = getAccountConfiguration(dhanResponse.accountId);
            if (accountConfig && accountConfig.rebaseTpAndSl) {
              console.log(`🔄 Initiating TP/SL rebase for order ${dhanResponse.orderId} on account ${dhanResponse.clientId}`);
              
              try {
                // Add a small delay to ensure order is processed
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const rebaseResult = await rebaseOrderTpAndSl(
                  dhanResponse.orderId,
                  accountConfig,
                  alert.price
                );
                
                rebaseResults.push({
                  orderId: dhanResponse.orderId,
                  accountId: dhanResponse.accountId,
                  clientId: dhanResponse.clientId,
                  ...rebaseResult
                });
                
                if (rebaseResult.success) {
                  console.log(`✅ TP/SL rebase successful for order ${dhanResponse.orderId}`);
                } else {
                  console.error(`❌ TP/SL rebase failed for order ${dhanResponse.orderId}: ${rebaseResult.error}`);
                }
              } catch (error) {
                console.error(`❌ Error during TP/SL rebase for order ${dhanResponse.orderId}:`, error);
                rebaseResults.push({
                  orderId: dhanResponse.orderId,
                  accountId: dhanResponse.accountId,
                  clientId: dhanResponse.clientId,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error during rebase'
                });
              }
            }
          }
        }

        return NextResponse.json(
          { 
            success: true, 
            data: {
              orders: placedOrders,
              dhanResponses,
              rebaseResults,
              summary: {
                totalOrders: placedOrders.length,
                successfulOrders: successfulOrders.length,
                failedOrders: failedOrders.length,
                accountsUsed: validCalculations.length,
                rebaseAttempted: rebaseResults.length,
                rebaseSuccessful: rebaseResults.filter(r => r.success).length,
                rebaseFailed: rebaseResults.filter(r => !r.success).length
              }
            }
          } as ApiResponse<{ 
            orders: typeof placedOrders; 
            dhanResponses: typeof dhanResponses;
            rebaseResults: typeof rebaseResults;
            summary: {
              totalOrders: number;
              successfulOrders: number;
              failedOrders: number;
              accountsUsed: number;
              rebaseAttempted: number;
              rebaseSuccessful: number;
              rebaseFailed: number;
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
      const placedOrder = storePlacedOrder(alert, alert.id || 'unknown', finalQuantity, dhanResponse, positionCalculation);

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
          rebaseThresholdPercentage: parseFloat(process.env.REBASE_THRESHOLD_PERCENTAGE || '0.1')
        };

        if (legacyAccountConfig.rebaseTpAndSl) {
          console.log(`🔄 Initiating TP/SL rebase for legacy order ${dhanResponse.orderId}`);
          
          try {
            // Add a small delay to ensure order is processed
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            rebaseResult = await rebaseOrderTpAndSl(
              dhanResponse.orderId,
              legacyAccountConfig,
              alert.price
            );
            
            if (rebaseResult.success) {
              console.log(`✅ TP/SL rebase successful for legacy order ${dhanResponse.orderId}`);
            } else {
              console.error(`❌ TP/SL rebase failed for legacy order ${dhanResponse.orderId}: ${rebaseResult.error}`);
            }
          } catch (error) {
            console.error(`❌ Error during TP/SL rebase for legacy order ${dhanResponse.orderId}:`, error);
            rebaseResult = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error during rebase'
            };
          }
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
