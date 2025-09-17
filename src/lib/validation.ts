import { TradingViewAlert } from '@/types/alert';

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

    if (typeof payloadObj.price !== 'number' || payloadObj.price <= 0) {
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
      price: Number(payloadObj.price),
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
