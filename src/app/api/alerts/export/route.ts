import { NextRequest, NextResponse } from 'next/server';
import { AlertLogEntry } from '@/types/alert';

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

// Convert alerts to CSV format
function alertsToCSV(alerts: AlertLogEntry[]): string {
  // CSV Headers
  const headers = [
    'Alert ID',
    'Timestamp',
    'Ticker',
    'Price (₹)',
    'Signal',
    'Strategy',
    'Custom Note',
    'Date',
    'Time'
  ];
  
  // Create CSV content
  const csvRows = [formatCSVRow(headers)];
  
  // Add data rows
  alerts.forEach(alert => {
    const alertDate = new Date(alert.timestamp);
    const date = alertDate.toLocaleDateString('en-IN');
    const time = alertDate.toLocaleTimeString('en-IN');
    
    const row = [
      alert.id,
      alert.timestamp,
      alert.data.ticker,
      alert.data.price.toFixed(2),
      alert.data.signal,
      alert.data.strategy,
      alert.data.custom_note || '',
      date,
      time
    ];
    
    csvRows.push(formatCSVRow(row));
  });
  
  return csvRows.join('\n');
}

// GET /api/alerts/export - Export alerts to CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const signal = searchParams.get('signal');
    const strategy = searchParams.get('strategy');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';
    
    // Build query parameters for the alerts API
    const alertParams = new URLSearchParams();
    if (ticker) alertParams.append('ticker', ticker);
    if (signal) alertParams.append('signal', signal);
    if (strategy) alertParams.append('strategy', strategy);
    if (startDate) alertParams.append('startDate', startDate);
    if (endDate) alertParams.append('endDate', endDate);
    
    // Fetch alerts from the alerts API
    const alertsResponse = await fetch(`${request.nextUrl.origin}/api/alerts?${alertParams.toString()}`);
    const alertsData = await alertsResponse.json();
    
    if (!alertsData.success) {
      return NextResponse.json({
        success: false,
        error: alertsData.error || 'Failed to fetch alerts'
      }, { status: 500 });
    }
    
    const alerts = alertsData.data.alerts || [];
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = alertsToCSV(alerts);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `trading_alerts_${timestamp}.csv`;
      
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
          alerts,
          count: alerts.length,
          filters: {
            ticker: ticker || null,
            signal: signal || null,
            strategy: strategy || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting alerts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/alerts/export - Export alerts with custom filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tickers, 
      signals, 
      strategies,
      startDate, 
      endDate, 
      format = 'csv' 
    } = body;
    
    // Build query parameters for the alerts API
    const alertParams = new URLSearchParams();
    if (startDate) alertParams.append('startDate', startDate);
    if (endDate) alertParams.append('endDate', endDate);
    
    // Fetch alerts from the alerts API
    const alertsResponse = await fetch(`${request.nextUrl.origin}/api/alerts?${alertParams.toString()}`);
    const alertsData = await alertsResponse.json();
    
    if (!alertsData.success) {
      return NextResponse.json({
        success: false,
        error: alertsData.error || 'Failed to fetch alerts'
      }, { status: 500 });
    }
    
    let alerts = alertsData.data.alerts || [];
    
    // Apply additional filters
    if (tickers && Array.isArray(tickers) && tickers.length > 0) {
      alerts = alerts.filter((alert: AlertLogEntry) => 
        tickers.some((ticker: string) => 
          alert.data.ticker.toUpperCase() === ticker.toUpperCase()
        )
      );
    }
    
    if (signals && Array.isArray(signals) && signals.length > 0) {
      alerts = alerts.filter((alert: AlertLogEntry) => 
        signals.includes(alert.data.signal)
      );
    }
    
    if (strategies && Array.isArray(strategies) && strategies.length > 0) {
      alerts = alerts.filter((alert: AlertLogEntry) => 
        strategies.includes(alert.data.strategy)
      );
    }
    
    if (format === 'csv') {
      // Generate CSV content
      const csvContent = alertsToCSV(alerts);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `trading_alerts_filtered_${timestamp}.csv`;
      
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
          alerts,
          count: alerts.length,
          filters: {
            tickers: tickers || null,
            signals: signals || null,
            strategies: strategies || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error exporting alerts with filters:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
