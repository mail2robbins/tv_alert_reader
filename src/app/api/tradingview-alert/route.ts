import { NextRequest, NextResponse } from 'next/server';
import { validateTradingViewAlert, validateWebhookSecret } from '@/lib/validation';
import { logAlert, logError } from '@/lib/fileLogger';
import { placeDhanOrderOnAllAccounts } from '@/lib/dhanApi';
import { storeMultiplePlacedOrders, hasTickerBeenOrderedToday, PlacedOrder } from '@/lib/orderTracker';
import { calculatePositionSizesForAllAccounts } from '@/lib/fundManager';
import { forwardAlertToExternalWebhooks } from '@/lib/externalWebhookForwarder';
import { ApiResponse } from '@/types/alert';

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

    // Validate webhook secret
    if (!validateWebhookSecret(payload.webhook_secret)) {
      await logError('Invalid webhook secret', new Error(`Invalid secret from IP: ${clientIp}`));
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // Validate alert payload
    const validation = validateTradingViewAlert(payload);
    if (!validation.isValid) {
      await logError('Invalid alert payload', new Error(validation.error || 'Unknown validation error'));
      console.error('Alert validation failed:', {
        error: validation.error,
        payload: JSON.stringify(payload, null, 2),
        ip: clientIp
      });
      return NextResponse.json(
        { success: false, error: validation.error } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Log the alert
    const alertId = await logAlert(validation.alert!);
    
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
    
    // Auto-place order if enabled and signal is BUY
    let orderResult = null;
    const autoPlaceOrder = process.env.AUTO_PLACE_ORDER === 'true';
    
    if (autoPlaceOrder && validation.alert!.signal === 'BUY') {
      try {
        console.log('Auto-placing order for BUY signal:', validation.alert!.ticker);
        
        // Check if ticker has already been ordered today
        if (hasTickerBeenOrderedToday(validation.alert!.ticker)) {
          console.log(`Order blocked: Ticker ${validation.alert!.ticker} has already been ordered today`);
          await logError('Order blocked - duplicate ticker', new Error(`Ticker ${validation.alert!.ticker} already ordered today`));
        } else {
          // Calculate position sizes for all accounts using multi-account fund management
          const positionCalculations = calculatePositionSizesForAllAccounts(validation.alert!.price);
          const validCalculations = positionCalculations.filter(calc => calc.canPlaceOrder);
        
          if (validCalculations.length === 0) {
            const reasons = positionCalculations.map(calc => calc.reason).filter(Boolean);
            console.log('Cannot place order on any account:', reasons);
            await logError('Order placement blocked on all accounts', new Error(reasons.join('; ') || 'No valid accounts'));
          } else {
            const dhanResponses = await placeDhanOrderOnAllAccounts(validation.alert!, {
              useAutoPositionSizing: true,
              exchangeSegment: process.env.DHAN_EXCHANGE_SEGMENT || 'NSE_EQ',
              productType: process.env.DHAN_PRODUCT_TYPE || 'INTRADAY',
              orderType: process.env.DHAN_ORDER_TYPE || 'MARKET'
            });
            
            const placedOrders = storeMultiplePlacedOrders(
              validation.alert!, 
              alertId, 
              dhanResponses,
              positionCalculations
            );
            orderResult = { orders: placedOrders, dhanResponses, positionCalculations };
            
            const successfulOrders = placedOrders.filter(order => order.status === 'placed');
            const failedOrders = placedOrders.filter(order => order.status === 'failed');
            
            console.log('Multi-account order placement completed:', {
              totalOrders: placedOrders.length,
              successfulOrders: successfulOrders.length,
              failedOrders: failedOrders.length,
              accountsUsed: validCalculations.length,
              orders: placedOrders.map(order => ({
                accountId: order.accountId,
                clientId: order.clientId,
                quantity: order.quantity,
                orderValue: order.orderValue,
                positionSizePercentage: order.positionSizePercentage,
                status: order.status
              }))
            });
          }
        }
      } catch (orderError) {
        console.error('Failed to auto-place order:', orderError);
        await logError('Failed to auto-place order', orderError);
        // Don't fail the webhook if order placement fails
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Log successful processing
    console.log(`Alert processed successfully: ${alertId} (${processingTime}ms)`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Alert received and logged successfully',
        data: { 
          alertId, 
          processingTime,
          orderPlaced: !!orderResult,
          orders: orderResult?.orders || [],
          totalOrders: orderResult?.orders?.length || 0,
          successfulOrders: orderResult?.orders?.filter((order: PlacedOrder) => order.status === 'placed').length || 0,
          failedOrders: orderResult?.orders?.filter((order: PlacedOrder) => order.status === 'failed').length || 0,
          externalWebhooks: forwardingResult ? {
            totalUrls: forwardingResult.totalUrls,
            successfulForwards: forwardingResult.successfulForwards,
            failedForwards: forwardingResult.failedForwards,
            results: forwardingResult.results
          } : null
        }
      } as ApiResponse<{ 
        alertId: string; 
        processingTime: number;
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
