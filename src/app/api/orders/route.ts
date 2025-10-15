import { NextRequest, NextResponse } from 'next/server';
import { getAllPlacedOrders, getOrderStats, getOrdersWithFilters } from '@/lib/orderTracker';
import { ApiResponse } from '@/types/alert';
import { validateDateRange } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const ticker = searchParams.get('ticker');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Validate date range if provided
    if (startDate || endDate) {
      const dateValidation = validateDateRange(startDate, endDate);
      if (!dateValidation.isValid) {
        return NextResponse.json(
          { success: false, error: dateValidation.error } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    let orders;

    // Use getOrdersWithFilters if we have any filters (including date filters)
    if (ticker || status || startDate || endDate) {
      const filters: {
        tickers?: string[];
        statuses?: ('pending' | 'placed' | 'failed' | 'cancelled')[];
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (ticker) {
        filters.tickers = [ticker];
      }
      if (status) {
        filters.statuses = [status as 'pending' | 'placed' | 'failed' | 'cancelled'];
      }
      if (startDate) {
        filters.startDate = new Date(startDate);
      }
      if (endDate) {
        filters.endDate = new Date(endDate);
      }

      orders = await getOrdersWithFilters(filters);
    } else {
      orders = await getAllPlacedOrders();
    }

    const responseData: {
      orders: typeof orders;
      stats?: Awaited<ReturnType<typeof getOrderStats>>;
    } = {
      orders
    };

    if (includeStats) {
      responseData.stats = await getOrderStats();
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
