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
      // Clean price string: remove currency symbols (₹, Rs, $), commas, and spaces before parsing
      const cleanedPrice = payloadObj.price.replace(/[₹Rs$,\s]/g, '');
      price = parseFloat(cleanedPrice);
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
      // Clean price string: remove currency symbols (₹, Rs), commas, and spaces before parsing
      const cleanedPrice = price.replace(/[₹Rs,\s]/g, '');
      const numPrice = parseFloat(cleanedPrice);
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

// Extract signal type from ChartInk alert_name
function extractSignalFromAlertName(alertName: string): 'BUY' | 'SELL' | 'HOLD' {
  const upperAlertName = alertName.toUpperCase();
  
  // Check for SELL signal first (more specific)
  if (upperAlertName.startsWith('SELL')) {
    return 'SELL';
  }
  
  // Check for BUY signal
  if (upperAlertName.startsWith('BUY')) {
    return 'BUY';
  }
  
  // Check for HOLD signal
  if (upperAlertName.startsWith('HOLD')) {
    return 'HOLD';
  }
  
  // Default to BUY if no signal is found
  return 'BUY';
}

// Process ChartInk alert into individual alerts for each stock
export function processChartInkAlert(chartInkAlert: ChartInkAlert): ChartInkProcessedAlert[] {
  const stocksArray = chartInkAlert.stocks.split(',').map(s => s.trim()).filter(Boolean);
  const pricesArray = chartInkAlert.trigger_prices.split(',').map(p => p.trim()).filter(Boolean);
  
  // Extract signal from alert_name
  const signal = extractSignalFromAlertName(chartInkAlert.alert_name);
  
  const processedAlerts: ChartInkProcessedAlert[] = [];
  
  for (let i = 0; i < stocksArray.length; i++) {
    const ticker = stocksArray[i].toUpperCase();
    
    // Clean price string: remove currency symbols (₹, Rs), commas, and spaces before parsing
    const cleanedPrice = pricesArray[i].replace(/[₹Rs,\s]/g, '');
    const price = parseFloat(cleanedPrice);
    
    // Validate that price is a valid number
    if (isNaN(price) || price <= 0) {
      console.error(`Invalid price for ${ticker}: "${pricesArray[i]}" (cleaned: "${cleanedPrice}")`);
      continue; // Skip this alert if price is invalid
    }
    
    // Use the current GMT time when the alert was received
    // This is more accurate than trying to parse ChartInk's time format
    const timestamp = new Date().toISOString();
    
    const processedAlert: ChartInkProcessedAlert = {
      ticker,
      price,
      signal, // Extract signal from alert_name
      strategy: chartInkAlert.scan_name,
      timestamp,
      custom_note: `ChartInk Alert: ${chartInkAlert.alert_name} | Scan: ${chartInkAlert.scan_name} | Signal: ${signal}`,
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
