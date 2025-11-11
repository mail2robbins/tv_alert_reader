import { NextRequest, NextResponse } from 'next/server';
import { getAllAccountSettings } from '@/lib/accountSettingsDatabase';

/**
 * GET /api/account-settings/config
 * Get account configurations in the format expected by multiAccountManager
 * This is for internal server-side use (webhooks, order processing, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // This endpoint can be called without auth for internal server-side use
    // Or you can add webhook secret validation here if needed
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true
    
    // Get all account settings from database
    const dbSettings = await getAllAccountSettings(activeOnly);
    
    // Convert to DhanAccountConfig format
    const accounts = dbSettings.map((setting) => ({
      accountId: setting.id,
      accessToken: setting.dhanAccessToken,
      clientId: setting.dhanClientId,
      availableFunds: setting.availableFunds,
      leverage: setting.leverage,
      maxPositionSize: setting.maxPositionSize,
      minOrderValue: setting.minOrderValue,
      maxOrderValue: setting.maxOrderValue,
      stopLossPercentage: setting.stopLossPercentage,
      targetPricePercentage: setting.targetPricePercentage,
      riskOnCapital: setting.riskOnCapital,
      isActive: setting.isActive,
      enableTrailingStopLoss: setting.enableTrailingStopLoss,
      minTrailJump: setting.minTrailJump,
      rebaseTpAndSl: setting.rebaseTpAndSl,
      rebaseThresholdPercentage: setting.rebaseThresholdPercentage,
      allowDuplicateTickers: setting.allowDuplicateTickers,
      orderType: setting.orderType,
      limitBufferPercentage: setting.limitBufferPercentage
    }));
    
    const activeAccounts = accounts.filter(account => account.isActive);
    
    return NextResponse.json({
      success: true,
      data: {
        accounts,
        activeAccounts
      }
    });
  } catch (error) {
    console.error('Error fetching account configurations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch account configurations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
