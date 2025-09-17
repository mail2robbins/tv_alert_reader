import { NextRequest, NextResponse } from 'next/server';
import { validateTradingViewAlert, validateWebhookSecret } from '@/lib/validation';
import { logAlert, logError } from '@/lib/fileLogger';
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
               request.ip || 
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
      await logError('Invalid JSON payload', { error, ip: clientIp });
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate webhook secret
    if (!validateWebhookSecret(payload.webhook_secret)) {
      await logError('Invalid webhook secret', { ip: clientIp });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // Validate alert payload
    const validation = validateTradingViewAlert(payload);
    if (!validation.isValid) {
      await logError('Invalid alert payload', { 
        error: validation.error, 
        payload, 
        ip: clientIp 
      });
      return NextResponse.json(
        { success: false, error: validation.error } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Log the alert
    const alertId = await logAlert(validation.alert!);
    
    const processingTime = Date.now() - startTime;
    
    // Log successful processing
    console.log(`Alert processed successfully: ${alertId} (${processingTime}ms)`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Alert received and logged successfully',
        data: { alertId, processingTime }
      } as ApiResponse<{ alertId: string; processingTime: number }>,
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
    await logError('Unexpected error in webhook', { 
      error, 
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
