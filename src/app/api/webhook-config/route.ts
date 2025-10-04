import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/alert';

/**
 * Get configured external webhook URLs from environment variables
 */
function getConfiguredWebhookUrls(): string[] {
  const urls: string[] = [];
  
  for (let i = 1; i <= 10; i++) {
    const url = process.env[`EXTERNAL_WEBHOOK_URL_${i}`];
    if (url && url.trim()) {
      urls.push(url.trim());
    }
  }
  
  return urls;
}

// GET /api/webhook-config - Get configured external webhook URLs
export async function GET() {
  try {
    const webhookUrls = getConfiguredWebhookUrls();
    
    return NextResponse.json({
      success: true,
      data: {
        webhookUrls,
        totalConfigured: webhookUrls.length,
        maxAllowed: 10
      }
    } as ApiResponse<{
      webhookUrls: string[];
      totalConfigured: number;
      maxAllowed: number;
    }>);
  } catch (error) {
    console.error('Error fetching webhook config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhook configuration' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
