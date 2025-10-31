import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllAccountSettings, 
  createAccountSettings,
  AccountSettings 
} from '@/lib/accountSettingsDatabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { findUserById } from '@/lib/userDatabase';
import { invalidateAccountConfigCache } from '@/lib/accountConfigCache';

/**
 * GET /api/account-settings
 * Get all account settings (authenticated users only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Verify user exists and is approved
    const user = await findUserById(payload.userId);
    if (!user || !user.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - User not approved' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // Get all account settings
    const settings = await getAllAccountSettings(activeOnly);
    
    // Mask access tokens for security (show only last 4 characters)
    const maskedSettings = settings.map(setting => ({
      ...setting,
      dhanAccessToken: setting.dhanAccessToken 
        ? `${'*'.repeat(Math.max(0, setting.dhanAccessToken.length - 4))}${setting.dhanAccessToken.slice(-4)}`
        : ''
    }));
    
    return NextResponse.json({
      success: true,
      data: maskedSettings
    });
  } catch (error) {
    console.error('Error fetching account settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch account settings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account-settings
 * Create new account settings (authenticated users only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Verify user exists and is approved
    const user = await findUserById(payload.userId);
    if (!user || !user.isApproved) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - User not approved' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.dhanClientId || !body.dhanAccessToken) {
      return NextResponse.json(
        { success: false, error: 'DHAN Client ID and Access Token are required' },
        { status: 400 }
      );
    }
    
    // Create settings object with defaults
    const settingsData: Omit<AccountSettings, 'id' | 'createdAt' | 'updatedAt'> = {
      dhanClientId: body.dhanClientId,
      dhanAccessToken: body.dhanAccessToken,
      availableFunds: body.availableFunds ?? 20000,
      leverage: body.leverage ?? 2,
      maxPositionSize: body.maxPositionSize ?? 0.1,
      minOrderValue: body.minOrderValue ?? 1000,
      maxOrderValue: body.maxOrderValue ?? 50000,
      stopLossPercentage: body.stopLossPercentage ?? 0.01,
      targetPricePercentage: body.targetPricePercentage ?? 0.015,
      riskOnCapital: body.riskOnCapital ?? 2.0,
      enableTrailingStopLoss: body.enableTrailingStopLoss ?? true,
      minTrailJump: body.minTrailJump ?? 0.05,
      rebaseTpAndSl: body.rebaseTpAndSl ?? true,
      rebaseThresholdPercentage: body.rebaseThresholdPercentage ?? 0.02,
      allowDuplicateTickers: body.allowDuplicateTickers ?? false,
      orderType: body.orderType ?? 'LIMIT',
      isActive: body.isActive ?? true
    };
    
    // Create account settings
    const newSettings = await createAccountSettings(settingsData);
    
    // Invalidate cache since we created new settings
    invalidateAccountConfigCache();
    
    // Mask access token in response
    const maskedSettings = {
      ...newSettings,
      dhanAccessToken: newSettings.dhanAccessToken 
        ? `${'*'.repeat(Math.max(0, newSettings.dhanAccessToken.length - 4))}${newSettings.dhanAccessToken.slice(-4)}`
        : ''
    };
    
    return NextResponse.json({
      success: true,
      data: maskedSettings,
      message: 'Account settings created successfully'
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating account settings:', error);
    
    // Handle duplicate client ID error
    if (error instanceof Error && error.message && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this Client ID already exists'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create account settings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
