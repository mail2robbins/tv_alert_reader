import { NextRequest, NextResponse } from 'next/server';
import { getAllPlacedOrders, getOrdersByTicker, getOrdersByStatus, getOrdersWithFilters } from '@/lib/orderTracker';
import { PlacedOrder } from '@/lib/orderTracker';

// Helper function to escape CSV values
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or quote, wrap it in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Helper function to format CSV row
function formatCSVRow(values: unknown[]): string {
  return values.map(escapeCSVValue).join(',');
}

// Convert orders to CSV format
function ordersToCSV(orders: PlacedOrder[]): string {
  // CSV Headers
  const headers = [
    'Order ID',
    'Alert ID',
    'Ticker',
    'Signal',
    'Price (₹)',
    'Quantity',
    'Order Value (₹)',
    'Leveraged Value (₹)',
    'Position Size (%)',
    'Stop Loss Price (₹)',
    'Target Price (₹)',
    'Status',
    'Order ID (Dhan)',
    'Correlation ID',
    'Error Message',
    'Timestamp',
    'Risk on Capital',
    'Calculated Quantity',
    'Final Quantity'
  ];
  
  // Create CSV content
  const csvRows = [formatCSVRow(headers)];
  
  // Add data rows
  orders.forEach(order => {
    const row = [
      order.id,
      order.alertId,
      order.ticker,
      order.signal,
      order.price.toFixed(2),
      order.quantity,
      order.orderValue.toFixed(2),
      order.leveragedValue.toFixed(2),
      order.positionSizePercentage.toFixed(2),
      order.stopLossPrice?.toFixed(2) || '',
      order.targetPrice?.toFixed(2) || '',
      order.status,
      order.orderId || '',
      order.correlationId,
      order.error || '',
      order.timestamp,
      order.positionCalculation?.riskOnCapital?.toFixed(2) || '',
      order.positionCalculation?.calculatedQuantity || '',
      order.positionCalculation?.finalQuantity || ''
    ];
    
    csvRows.push(formatCSVRow(row));
  });
  
  return csvRows.join('\n');
}

// GET /api/orders/export - Export orders to CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const status = searchParams.get('status') as PlacedOrder['status'] | null;
    const format = searchParams.get('format') || 'csv';
    
    // Get orders based on filters
    let orders: PlacedOrder[];
    
    if (ticker) {
      orders = getOrdersByTicker(ticker);
    } else if (status) {
      orders = getOrdersByStatus(status);
    } else {
      orders = getAllPlacedOrders();
    }
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = ordersToCSV(orders);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `placed_orders_${timestamp}.csv`;
      
      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Return JSON format
      return NextResponse.json({
        success: true,
        data: {
          orders,
          count: orders.length,
          filters: {
            ticker: ticker || null,
            status: status || null
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/orders/export - Export orders with custom filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tickers, 
      statuses, 
      startDate, 
      endDate, 
      format = 'csv' 
    } = body;
    
    // Use the utility function for filtering
    const orders = getOrdersWithFilters({
      tickers: tickers || undefined,
      statuses: statuses || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = ordersToCSV(orders);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `placed_orders_filtered_${timestamp}.csv`;
      
      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Return JSON format
      return NextResponse.json({
        success: true,
        data: {
          orders,
          count: orders.length,
          filters: {
            tickers: tickers || null,
            statuses: statuses || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting orders with filters:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
