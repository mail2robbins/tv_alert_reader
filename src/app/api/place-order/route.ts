import { NextRequest, NextResponse } from 'next/server';
import { placeDhanOrder } from '@/lib/dhanApi';
import { storePlacedOrder } from '@/lib/orderTracker';
import { logError } from '@/lib/fileLogger';
import { ApiResponse } from '@/types/alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert, quantity, orderConfig } = body;

    // Validate required fields
    if (!alert || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Alert and quantity are required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be a positive number' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Place order on Dhan.co
    const dhanResponse = await placeDhanOrder(alert, {
      quantity,
      exchangeSegment: orderConfig?.exchangeSegment || 'NSE_EQ',
      productType: orderConfig?.productType || 'CNC',
      orderType: orderConfig?.orderType || 'LIMIT',
      targetPrice: orderConfig?.targetPrice,
      stopLossPrice: orderConfig?.stopLossPrice
    });

    // Store the order
    const placedOrder = storePlacedOrder(alert, alert.id || 'unknown', quantity, dhanResponse);

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
