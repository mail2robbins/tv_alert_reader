import { TradingViewAlert, ChartInkAlert, ChartInkProcessedAlert } from '@/types/alert';

// Validate TradingView alert payload
export function validateTradingViewAlert(payload: unknown): { isValid: boolean; error?: string; alert?: TradingViewAlert } {
  try {
    // Check if payload is an object
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Payload must be a valid JSON object' };
    }

    const payloadObj = payload as Record<string, unknown>;

    // Required fields validation
    const requiredFields = ['ticker', 'price', 'signal', 'strategy', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in payloadObj)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Type validation
    if (typeof payloadObj.ticker !== 'string' || payloadObj.ticker.trim() === '') {
      return { isValid: false, error: 'Ticker must be a non-empty string' };
    }

    // Handle price as string or number
    let price: number;
    if (typeof payloadObj.price === 'string') {
      price = parseFloat(payloadObj.price);
      if (isNaN(price)) {
        return { isValid: false, error: 'Price must be a valid number' };
      }
    } else if (typeof payloadObj.price === 'number') {
      price = payloadObj.price;
    } else {
      return { isValid: false, error: 'Price must be a number' };
    }
    
    if (price <= 0) {
      return { isValid: false, error: 'Price must be a positive number' };
    }

    if (!['BUY', 'SELL', 'HOLD'].includes(payloadObj.signal as string)) {
      return { isValid: false, error: 'Signal must be BUY, SELL, or HOLD' };
    }

    if (typeof payloadObj.strategy !== 'string' || payloadObj.strategy.trim() === '') {
      return { isValid: false, error: 'Strategy must be a non-empty string' };
    }

    // Timestamp validation
    const timestamp = new Date(payloadObj.timestamp as string);
    if (isNaN(timestamp.getTime())) {
      return { isValid: false, error: 'Invalid timestamp format' };
    }

    // Optional custom_note validation
    if (payloadObj.custom_note !== undefined && typeof payloadObj.custom_note !== 'string') {
      return { isValid: false, error: 'Custom note must be a string if provided' };
    }

    // Create validated alert object
    const alert: TradingViewAlert = {
      ticker: (payloadObj.ticker as string).trim().toUpperCase(),
      price: price, // Use the parsed price
      signal: payloadObj.signal as 'BUY' | 'SELL' | 'HOLD',
      strategy: (payloadObj.strategy as string).trim(),
      timestamp: timestamp.toISOString(),
      custom_note: (payloadObj.custom_note as string)?.trim() || undefined,
      webhook_secret: payloadObj.webhook_secret as string
    };

    return { isValid: true, alert };
  } catch {
    return { isValid: false, error: 'Invalid payload format' };
  }
}

// Validate webhook secret
export function validateWebhookSecret(providedSecret: string | undefined): boolean {
  const expectedSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    // If no secret is configured, allow all requests (for development)
    return true;
  }
  
  return providedSecret === expectedSecret;
}

// Sanitize string input
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Validate date range
export function validateDateRange(startDate?: string, endDate?: string): { isValid: boolean; error?: string } {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    if (start > end) {
      return { isValid: false, error: 'Start date must be before end date' };
    }
  }
  
  return { isValid: true };
}

// Validate ChartInk alert payload
export function validateChartInkAlert(payload: unknown): { isValid: boolean; error?: string; alert?: ChartInkAlert } {
  try {
    // Check if payload is an object
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Payload must be a valid JSON object' };
    }

    const payloadObj = payload as Record<string, unknown>;

    // Required fields validation
    const requiredFields = ['stocks', 'trigger_prices', 'triggered_at', 'scan_name', 'scan_url', 'alert_name', 'webhook_url'];
    for (const field of requiredFields) {
      if (!(field in payloadObj)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Type validation
    if (typeof payloadObj.stocks !== 'string' || payloadObj.stocks.trim() === '') {
      return { isValid: false, error: 'Stocks must be a non-empty string' };
    }

    if (typeof payloadObj.trigger_prices !== 'string' || payloadObj.trigger_prices.trim() === '') {
      return { isValid: false, error: 'Trigger prices must be a non-empty string' };
    }

    if (typeof payloadObj.triggered_at !== 'string' || payloadObj.triggered_at.trim() === '') {
      return { isValid: false, error: 'Triggered at must be a non-empty string' };
    }

    if (typeof payloadObj.scan_name !== 'string' || payloadObj.scan_name.trim() === '') {
      return { isValid: false, error: 'Scan name must be a non-empty string' };
    }

    if (typeof payloadObj.scan_url !== 'string' || payloadObj.scan_url.trim() === '') {
      return { isValid: false, error: 'Scan URL must be a non-empty string' };
    }

    if (typeof payloadObj.alert_name !== 'string' || payloadObj.alert_name.trim() === '') {
      return { isValid: false, error: 'Alert name must be a non-empty string' };
    }

    if (typeof payloadObj.webhook_url !== 'string' || payloadObj.webhook_url.trim() === '') {
      return { isValid: false, error: 'Webhook URL must be a non-empty string' };
    }

    // Validate that stocks and trigger_prices have the same number of comma-separated values
    const stocksArray = payloadObj.stocks.split(',').map((s: string) => s.trim()).filter(Boolean);
    const pricesArray = payloadObj.trigger_prices.split(',').map((p: string) => p.trim()).filter(Boolean);

    if (stocksArray.length === 0) {
      return { isValid: false, error: 'At least one stock must be provided' };
    }

    if (stocksArray.length !== pricesArray.length) {
      return { isValid: false, error: 'Number of stocks must match number of trigger prices' };
    }

    // Validate that all prices are valid numbers
    for (const price of pricesArray) {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return { isValid: false, error: `Invalid price: ${price}. All prices must be positive numbers` };
      }
    }

    // Create validated alert object
    const alert: ChartInkAlert = {
      stocks: payloadObj.stocks as string,
      trigger_prices: payloadObj.trigger_prices as string,
      triggered_at: payloadObj.triggered_at as string,
      scan_name: payloadObj.scan_name as string,
      scan_url: payloadObj.scan_url as string,
      alert_name: payloadObj.alert_name as string,
      webhook_url: payloadObj.webhook_url as string
    };

    return { isValid: true, alert };
  } catch {
    return { isValid: false, error: 'Invalid payload format' };
  }
}

// Process ChartInk alert into individual alerts for each stock
export function processChartInkAlert(chartInkAlert: ChartInkAlert): ChartInkProcessedAlert[] {
  const stocksArray = chartInkAlert.stocks.split(',').map(s => s.trim()).filter(Boolean);
  const pricesArray = chartInkAlert.trigger_prices.split(',').map(p => p.trim()).filter(Boolean);
  
  const processedAlerts: ChartInkProcessedAlert[] = [];
  
  for (let i = 0; i < stocksArray.length; i++) {
    const ticker = stocksArray[i].toUpperCase();
    const price = parseFloat(pricesArray[i]);
    
    // Create a timestamp from the triggered_at field
    // ChartInk provides time like "2:34 pm", we'll create a proper timestamp
    const now = new Date();
    const timeStr = chartInkAlert.triggered_at;
    
    // Try to parse the time and create a proper timestamp
    let timestamp: string;
    try {
      // Simple time parsing - this could be enhanced based on ChartInk's actual format
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toLowerCase();
        
        if (period === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        const alertDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        timestamp = alertDate.toISOString();
      } else {
        // Fallback to current time
        timestamp = now.toISOString();
      }
    } catch {
      // Fallback to current time if parsing fails
      timestamp = now.toISOString();
    }
    
    const processedAlert: ChartInkProcessedAlert = {
      ticker,
      price,
      signal: 'BUY', // ChartInk alerts are always BUY signals
      strategy: chartInkAlert.scan_name,
      timestamp,
      custom_note: `ChartInk Alert: ${chartInkAlert.alert_name} | Scan: ${chartInkAlert.scan_name}`,
      originalAlert: chartInkAlert
    };
    
    processedAlerts.push(processedAlert);
  }
  
  return processedAlerts;
}

// Get the configured alert source from environment
export function getAlertSource(): 'TradingView' | 'ChartInk' {
  const source = process.env.ALERT_SOURCE;
  if (source === 'ChartInk') {
    return 'ChartInk';
  }
  return 'TradingView'; // Default to TradingView
}
