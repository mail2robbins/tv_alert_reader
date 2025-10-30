import { NextRequest, NextResponse } from 'next/server';
import { validateFundConfig, FundConfig } from '@/lib/fundManager';
import { getAllAccountSettings } from '@/lib/accountSettingsDatabase';

// GET - Retrieve current fund configuration from first active account
export async function GET() {
  try {
    // Get account settings from database
    const accounts = await getAllAccountSettings(true); // Get active accounts only
    
    if (accounts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No active accounts configured' 
        },
        { status: 404 }
      );
    }
    
    // Use first active account for fund configuration
    const firstAccount = accounts[0];
    
    const config: FundConfig = {
      availableFunds: firstAccount.availableFunds,
      leverage: firstAccount.leverage,
      maxPositionSize: firstAccount.maxPositionSize,
      minOrderValue: firstAccount.minOrderValue,
      maxOrderValue: firstAccount.maxOrderValue,
      stopLossPercentage: firstAccount.stopLossPercentage,
      targetPricePercentage: firstAccount.targetPricePercentage,
      riskOnCapital: firstAccount.riskOnCapital
    };
    
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching fund config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fund configuration' 
      },
      { status: 500 }
    );
  }
}

// POST - Update fund configuration (updates first active account)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newConfig: Partial<FundConfig> = body;
    
    // Get account settings from database
    const accounts = await getAllAccountSettings(true);
    
    if (accounts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No active accounts configured' 
        },
        { status: 404 }
      );
    }
    
    const firstAccount = accounts[0];
    
    // Merge current config with new config for validation
    const currentConfig: FundConfig = {
      availableFunds: firstAccount.availableFunds,
      leverage: firstAccount.leverage,
      maxPositionSize: firstAccount.maxPositionSize,
      minOrderValue: firstAccount.minOrderValue,
      maxOrderValue: firstAccount.maxOrderValue,
      stopLossPercentage: firstAccount.stopLossPercentage,
      targetPricePercentage: firstAccount.targetPricePercentage,
      riskOnCapital: firstAccount.riskOnCapital
    };
    
    const mergedConfig = { ...currentConfig, ...newConfig };
    
    // Validate the configuration
    const validation = validateFundConfig(mergedConfig);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid configuration',
          details: validation.errors
        },
        { status: 400 }
      );
    }
    
    // Update the first account in database
    const { updateAccountSettings } = await import('@/lib/accountSettingsDatabase');
    await updateAccountSettings(firstAccount.id, newConfig);
    
    return NextResponse.json({
      success: true,
      data: mergedConfig
    });
  } catch (error) {
    console.error('Error updating fund config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update fund configuration' 
      },
      { status: 500 }
    );
  }
}
