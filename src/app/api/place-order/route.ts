import { NextRequest, NextResponse } from 'next/server';
import { placeDhanOrder, placeDhanOrderOnAllAccounts } from '@/lib/dhanApi';
import { storePlacedOrder, storeMultiplePlacedOrders, hasTickerBeenOrderedToday } from '@/lib/orderTracker';
import { calculatePositionSize, calculatePositionSizesForAllAccounts } from '@/lib/fundManager';
import { logError } from '@/lib/fileLogger';
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
          stopLossPrice: orderConfig?.stopLossPrice
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

        return NextResponse.json(
          { 
            success: true, 
            data: {
              orders: placedOrders,
              dhanResponses,
              summary: {
                totalOrders: placedOrders.length,
                successfulOrders: successfulOrders.length,
                failedOrders: failedOrders.length,
                accountsUsed: validCalculations.length
              }
            }
          } as ApiResponse<{ 
            orders: typeof placedOrders; 
            dhanResponses: typeof dhanResponses;
            summary: {
              totalOrders: number;
              successfulOrders: number;
              failedOrders: number;
              accountsUsed: number;
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
        stopLossPrice: orderConfig?.stopLossPrice
      });

      // Store the order
      const placedOrder = storePlacedOrder(alert, alert.id || 'unknown', finalQuantity, dhanResponse, positionCalculation);

      return NextResponse.json(
        { 
          success: true, 
          data: {
            order: placedOrder,
            dhanResponse
          }
        } as ApiResponse<{ order: typeof placedOrder; dhanResponse: typeof dhanResponse }>,
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
