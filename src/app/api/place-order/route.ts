import { NextRequest, NextResponse } from 'next/server';
import { placeDhanOrder } from '@/lib/dhanApi';
import { storePlacedOrder, hasTickerBeenOrderedToday } from '@/lib/orderTracker';
import { calculatePositionSize } from '@/lib/fundManager';
import { logError } from '@/lib/fileLogger';
import { ApiResponse } from '@/types/alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert, quantity, orderConfig, useAutoPositionSizing = true } = body;

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

    // Calculate position size
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
