import { logError } from './fileLogger';

interface ForwardingResult {
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

interface AlertForwardingResult {
  totalUrls: number;
  successfulForwards: number;
  failedForwards: number;
  results: ForwardingResult[];
}

/**
 * Get external webhook URLs from environment variables
 * Supports EXTERNAL_WEBHOOK_URL_1 through EXTERNAL_WEBHOOK_URL_10
 */
function getExternalWebhookUrls(): string[] {
  const urls: string[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const url = process.env[`EXTERNAL_WEBHOOK_URL_${i}`];
    if (url && url.trim()) {
      urls.push(url.trim());
    }
  }
  
  return urls;
}

/**
 * Forward alert to a single external webhook URL
 */
async function forwardToSingleWebhook(
  url: string, 
  payload: Record<string, unknown>,
  timeout: number = 5000
): Promise<ForwardingResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TradingView-Alert-Forwarder/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    try {
      await response.text();
    } catch {
      // Response body might be empty or not readable
    }

    return {
      url,
      success: response.ok,
      statusCode: response.status,
      responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      url,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    };
  }
}

/**
 * Forward TradingView alert to all configured external webhook URLs
 * This function forwards the alert in parallel to all configured URLs
 */
export async function forwardAlertToExternalWebhooks(
  originalPayload: Record<string, unknown>
): Promise<AlertForwardingResult> {
  const webhookUrls = getExternalWebhookUrls();
  
  if (webhookUrls.length === 0) {
    return {
      totalUrls: 0,
      successfulForwards: 0,
      failedForwards: 0,
      results: []
    };
  }

  console.log(`Forwarding alert to ${webhookUrls.length} external webhook(s)...`);

  // Forward to all webhook URLs in parallel
  const forwardingPromises = webhookUrls.map(url => 
    forwardToSingleWebhook(url, originalPayload)
  );

  const results = await Promise.all(forwardingPromises);
  
  const successfulForwards = results.filter(result => result.success).length;
  const failedForwards = results.filter(result => !result.success).length;

  // Log any failures
  const failedResults = results.filter(result => !result.success);
  if (failedResults.length > 0) {
    console.error('Some external webhook forwards failed:', failedResults);
    await logError('External webhook forwarding failures', {
      failedResults: failedResults.map(r => ({
        url: r.url,
        error: r.error,
        responseTime: r.responseTime
      }))
    });
  }

  console.log('External webhook forwarding completed:', {
    totalUrls: webhookUrls.length,
    successfulForwards,
    failedForwards
  });

  return {
    totalUrls: webhookUrls.length,
    successfulForwards,
    failedForwards,
    results
  };
}
