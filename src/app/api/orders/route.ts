import { NextRequest, NextResponse } from 'next/server';
import { getAllPlacedOrders, getOrdersByTicker, getOrdersByStatus, getOrderStats } from '@/lib/orderTracker';
import { ApiResponse } from '@/types/alert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const ticker = searchParams.get('ticker');
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    let orders;

    if (ticker) {
      orders = getOrdersByTicker(ticker);
    } else if (status) {
      orders = getOrdersByStatus(status as 'pending' | 'placed' | 'failed' | 'cancelled');
    } else {
      orders = getAllPlacedOrders();
    }

    const responseData: {
      orders: typeof orders;
      stats?: ReturnType<typeof getOrderStats>;
    } = {
      orders
    };

    if (includeStats) {
      responseData.stats = getOrderStats();
    }

    return NextResponse.json(
      { 
        success: true, 
        data: responseData 
      } as ApiResponse<typeof responseData>,
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}
