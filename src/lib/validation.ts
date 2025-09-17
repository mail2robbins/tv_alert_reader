import { TradingViewAlert } from '@/types/alert';

// Validate TradingView alert payload
export function validateTradingViewAlert(payload: any): { isValid: boolean; error?: string; alert?: TradingViewAlert } {
  try {
    // Check if payload is an object
    if (!payload || typeof payload !== 'object') {
      return { isValid: false, error: 'Payload must be a valid JSON object' };
    }

    // Required fields validation
    const requiredFields = ['ticker', 'price', 'signal', 'strategy', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        return { isValid: false, error: `Missing required field: ${field}` };
      }
    }

    // Type validation
    if (typeof payload.ticker !== 'string' || payload.ticker.trim() === '') {
      return { isValid: false, error: 'Ticker must be a non-empty string' };
    }

    if (typeof payload.price !== 'number' || payload.price <= 0) {
      return { isValid: false, error: 'Price must be a positive number' };
    }

    if (!['BUY', 'SELL', 'HOLD'].includes(payload.signal)) {
      return { isValid: false, error: 'Signal must be BUY, SELL, or HOLD' };
    }

    if (typeof payload.strategy !== 'string' || payload.strategy.trim() === '') {
      return { isValid: false, error: 'Strategy must be a non-empty string' };
    }

    // Timestamp validation
    const timestamp = new Date(payload.timestamp);
    if (isNaN(timestamp.getTime())) {
      return { isValid: false, error: 'Invalid timestamp format' };
    }

    // Optional custom_note validation
    if (payload.custom_note !== undefined && typeof payload.custom_note !== 'string') {
      return { isValid: false, error: 'Custom note must be a string if provided' };
    }

    // Create validated alert object
    const alert: TradingViewAlert = {
      ticker: payload.ticker.trim().toUpperCase(),
      price: Number(payload.price),
      signal: payload.signal,
      strategy: payload.strategy.trim(),
      timestamp: timestamp.toISOString(),
      custom_note: payload.custom_note?.trim() || undefined,
      webhook_secret: payload.webhook_secret
    };

    return { isValid: true, alert };
  } catch (error) {
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
