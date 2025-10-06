import { NextRequest, NextResponse } from 'next/server';
import { validateTradingViewAlert, validateChartInkAlert, processChartInkAlert, validateWebhookSecret, getAlertSource } from '@/lib/validation';
import { logAlert, logError } from '@/lib/fileLogger';
import { placeDhanOrderOnAllAccounts } from '@/lib/dhanApi';
import { storeMultiplePlacedOrders, hasTickerBeenOrderedToday, PlacedOrder } from '@/lib/orderTracker';
import { calculatePositionSizesForAllAccounts } from '@/lib/fundManager';
import { forwardAlertToExternalWebhooks } from '@/lib/externalWebhookForwarder';
import { ApiResponse, TradingViewAlert, ChartInkAlert, ChartInkProcessedAlert } from '@/types/alert';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
  
  const key = ip;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let clientIp = 'unknown';
  
  try {
    // Get client IP for rate limiting
    clientIp = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limit
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      await logError('Rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' } as ApiResponse<null>,
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    // Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      await logError('Invalid JSON payload', error);
      console.error('JSON parsing failed:', {
        error: error instanceof Error ? error.message : String(error),
        ip: clientIp,
        userAgent: request.headers.get('user-agent'),
        contentType: request.headers.get('content-type')
      });
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get the configured alert source
    const alertSource = getAlertSource();
    console.log(`Processing alert from source: ${alertSource}`);

    // Validate based on alert source
    let validation: { isValid: boolean; error?: string; alert?: TradingViewAlert | ChartInkAlert };
    let processedAlerts: (TradingViewAlert | ChartInkProcessedAlert)[] = [];
    let alertType: 'TradingView' | 'ChartInk' = alertSource;

    if (alertSource === 'ChartInk') {
      // Validate ChartInk alert (no webhook secret validation)
      const chartInkValidation = validateChartInkAlert(payload);
      if (chartInkValidation.isValid && chartInkValidation.alert) {
        processedAlerts = processChartInkAlert(chartInkValidation.alert);
        alertType = 'ChartInk';
        validation = chartInkValidation;
      } else {
        validation = chartInkValidation;
      }
    } else {
      // Validate TradingView alert with webhook secret
      if (!validateWebhookSecret(payload.webhook_secret)) {
        await logError('Invalid webhook secret', new Error(`Invalid secret from IP: ${clientIp}`));
        return NextResponse.json(
          { success: false, error: 'Unauthorized' } as ApiResponse<null>,
          { status: 401 }
        );
      }
      
      const tradingViewValidation = validateTradingViewAlert(payload);
      if (tradingViewValidation.isValid && tradingViewValidation.alert) {
        processedAlerts = [tradingViewValidation.alert];
        alertType = 'TradingView';
        validation = tradingViewValidation;
      } else {
        validation = tradingViewValidation;
      }
    }

    if (!validation.isValid) {
      await logError('Invalid alert payload', new Error(validation.error || 'Unknown validation error'));
      console.error('Alert validation failed:', {
        error: validation.error,
        payload: JSON.stringify(payload, null, 2),
        ip: clientIp,
        alertSource
      });
      return NextResponse.json(
        { success: false, error: validation.error } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Log all processed alerts
    const alertIds: string[] = [];
    for (const alert of processedAlerts) {
      const alertId = await logAlert(alert, alertType);
      alertIds.push(alertId);
    }
    
    // Forward alert to external webhooks BEFORE processing orders
    let forwardingResult = null;
    try {
      console.log('Forwarding alert to external webhooks...');
      forwardingResult = await forwardAlertToExternalWebhooks(payload);
      
      console.log('External webhook forwarding completed:', {
        totalUrls: forwardingResult.totalUrls,
        successfulForwards: forwardingResult.successfulForwards,
        failedForwards: forwardingResult.failedForwards
      });
    } catch (forwardingError) {
      console.error('Error forwarding alert to external webhooks:', forwardingError);
      await logError('Failed to forward alert to external webhooks', forwardingError);
      // Don't fail the webhook if forwarding fails
    }
    
    // Auto-place orders if enabled and signal is BUY
    let orderResult = null;
    const autoPlaceOrder = process.env.AUTO_PLACE_ORDER === 'true';
    
    if (autoPlaceOrder) {
      const allOrders: PlacedOrder[] = [];
      let totalSuccessfulOrders = 0;
      let totalFailedOrders = 0;
      
      for (let i = 0; i < processedAlerts.length; i++) {
        const alert = processedAlerts[i];
        const alertId = alertIds[i];
        
        if (alert.signal === 'BUY') {
          try {
            console.log('Auto-placing order for BUY signal:', alert.ticker);
            
            // Check if ticker has already been ordered today
            if (hasTickerBeenOrderedToday(alert.ticker)) {
              console.log(`Order blocked: Ticker ${alert.ticker} has already been ordered today`);
              await logError('Order blocked - duplicate ticker', new Error(`Ticker ${alert.ticker} already ordered today`));
            } else {
              // Calculate position sizes for all accounts using multi-account fund management
              const positionCalculations = calculatePositionSizesForAllAccounts(alert.price);
              const validCalculations = positionCalculations.filter(calc => calc.canPlaceOrder);
            
              if (validCalculations.length === 0) {
                const reasons = positionCalculations.map(calc => calc.reason).filter(Boolean);
                console.log('Cannot place order on any account:', reasons);
                await logError('Order placement blocked on all accounts', new Error(reasons.join('; ') || 'No valid accounts'));
              } else {
                const dhanResponses = await placeDhanOrderOnAllAccounts(alert, {
                  useAutoPositionSizing: true,
                  exchangeSegment: process.env.DHAN_EXCHANGE_SEGMENT || 'NSE_EQ',
                  productType: process.env.DHAN_PRODUCT_TYPE || 'INTRADAY',
                  orderType: process.env.DHAN_ORDER_TYPE || 'MARKET'
                });
                
                const placedOrders = storeMultiplePlacedOrders(
                  alert, 
                  alertId, 
                  dhanResponses,
                  positionCalculations
                );
                
                allOrders.push(...placedOrders);
                totalSuccessfulOrders += placedOrders.filter(order => order.status === 'placed').length;
                totalFailedOrders += placedOrders.filter(order => order.status === 'failed').length;
                
                console.log('Multi-account order placement completed for', alert.ticker, ':', {
                  totalOrders: placedOrders.length,
                  successfulOrders: placedOrders.filter(order => order.status === 'placed').length,
                  failedOrders: placedOrders.filter(order => order.status === 'failed').length,
                  accountsUsed: validCalculations.length
                });
              }
            }
          } catch (orderError) {
            console.error('Failed to auto-place order for', alert.ticker, ':', orderError);
            await logError('Failed to auto-place order', orderError);
            // Don't fail the webhook if order placement fails
          }
        }
      }
      
      if (allOrders.length > 0) {
        orderResult = { 
          orders: allOrders, 
          totalSuccessfulOrders, 
          totalFailedOrders 
        };
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Log successful processing
    console.log(`Alert processed successfully: ${alertIds.join(', ')} (${processingTime}ms)`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Alert received and logged successfully',
        data: { 
          alertIds, 
          alertType,
          alertSource,
          processingTime,
          totalAlerts: processedAlerts.length,
          orderPlaced: !!orderResult,
          orders: orderResult?.orders || [],
          totalOrders: orderResult?.orders?.length || 0,
          successfulOrders: orderResult?.totalSuccessfulOrders || 0,
          failedOrders: orderResult?.totalFailedOrders || 0,
          externalWebhooks: forwardingResult ? {
            totalUrls: forwardingResult.totalUrls,
            successfulForwards: forwardingResult.successfulForwards,
            failedForwards: forwardingResult.failedForwards,
            results: forwardingResult.results
          } : null
        }
      } as ApiResponse<{ 
        alertIds: string[]; 
        alertType: 'TradingView' | 'ChartInk';
        alertSource: 'TradingView' | 'ChartInk';
        processingTime: number;
        totalAlerts: number;
        orderPlaced: boolean;
        orders: unknown[];
        totalOrders: number;
        successfulOrders: number;
        failedOrders: number;
        externalWebhooks: {
          totalUrls: number;
          successfulForwards: number;
          failedForwards: number;
          results: unknown[];
        } | null;
      }>,
      { 
        status: 200,
        headers: { 
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-Processing-Time': processingTime.toString()
        }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    await logError('Unexpected error in webhook', error);
    console.error('Unexpected webhook error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIp,
      processingTime
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
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
