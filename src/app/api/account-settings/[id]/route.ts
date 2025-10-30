import { NextRequest, NextResponse } from 'next/server';
import { 
  getAccountSettingsById,
  updateAccountSettings,
  deleteAccountSettings,
  clientIdExists,
  AccountSettings 
} from '@/lib/accountSettingsDatabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { findUserById } from '@/lib/userDatabase';

/**
 * GET /api/account-settings/[id]
 * Get account settings by ID (authenticated users only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account settings ID' },
        { status: 400 }
      );
    }
    
    const settings = await getAccountSettingsById(id);
    
    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Account settings not found' },
        { status: 404 }
      );
    }
    
    // Return full access token for editing (user is authenticated)
    return NextResponse.json({
      success: true,
      data: settings
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
 * PUT /api/account-settings/[id]
 * Update account settings (authenticated users only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account settings ID' },
        { status: 400 }
      );
    }
    
    // Check if settings exist
    const existingSettings = await getAccountSettingsById(id);
    if (!existingSettings) {
      return NextResponse.json(
        { success: false, error: 'Account settings not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Check if client ID is being changed and if it already exists
    if (body.dhanClientId && body.dhanClientId !== existingSettings.dhanClientId) {
      const exists = await clientIdExists(body.dhanClientId, id);
      if (exists) {
        return NextResponse.json(
          { success: false, error: 'An account with this Client ID already exists' },
          { status: 409 }
        );
      }
    }
    
    // Update settings
    const updatedSettings = await updateAccountSettings(id, body);
    
    // Mask access token in response
    const maskedSettings = {
      ...updatedSettings,
      dhanAccessToken: updatedSettings.dhanAccessToken 
        ? `${'*'.repeat(Math.max(0, updatedSettings.dhanAccessToken.length - 4))}${updatedSettings.dhanAccessToken.slice(-4)}`
        : ''
    };
    
    return NextResponse.json({
      success: true,
      data: maskedSettings,
      message: 'Account settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating account settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update account settings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account-settings/[id]
 * Delete account settings (authenticated users only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account settings ID' },
        { status: 400 }
      );
    }
    
    const deleted = await deleteAccountSettings(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Account settings not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Account settings deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete account settings',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
