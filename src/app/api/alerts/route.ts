import { NextRequest, NextResponse } from 'next/server';
import { readAlertsFromMemory, getAlertStatsFromMemory } from '@/lib/memoryStorage';
import { validateDateRange } from '@/lib/validation';
import { ApiResponse, AlertFilters, AlertLogEntry } from '@/types/alert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const ticker = searchParams.get('ticker') || undefined;
    const signal = searchParams.get('signal') || undefined;
    const strategy = searchParams.get('strategy') || undefined;
    const includeStats = searchParams.get('includeStats') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate date range
    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.isValid) {
      return NextResponse.json(
        { success: false, error: dateValidation.error } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate limit and offset
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 1000' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Offset must be non-negative' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Build filters
    const filters: AlertFilters = {
      startDate,
      endDate,
      ticker: ticker?.toUpperCase(),
      signal: signal?.toUpperCase(),
      strategy
    };

    // Read alerts with filters
    const allAlerts = await readAlertsFromMemory(filters);
    
    // Apply pagination
    const totalCount = allAlerts.length;
    const paginatedAlerts = allAlerts.slice(offset, offset + limit);

    // Prepare response data
    const responseData: {
      alerts: AlertLogEntry[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
      stats?: {
        totalAlerts: number;
        buySignals: number;
        sellSignals: number;
        uniqueTickers: number;
        strategies: string[];
      };
    } = {
      alerts: paginatedAlerts,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };

    // Include statistics if requested
    if (includeStats) {
      const stats = await getAlertStatsFromMemory();
      responseData.stats = stats;
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
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' } as ApiResponse<null>,
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

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}
