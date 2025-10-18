import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { findUserById, changeUserPassword, logUserAction } from '@/lib/userDatabase';
import { AuthResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    // Extract and verify authentication token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' } as AuthResponse,
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' } as AuthResponse,
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' } as AuthResponse,
        { status: 400 }
      );
    }

    // Get user from database
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as AuthResponse,
        { status: 404 }
      );
    }

    // Check if user is still approved and active
    if (!user.isApproved || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User account is not approved or inactive' } as AuthResponse,
        { status: 403 }
      );
    }

    // Get IP address and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Change password
    const success = await changeUserPassword(user.id, currentPassword, newPassword);
    
    if (!success) {
      // Log failed password change attempt
      await logUserAction(user.id, 'PASSWORD_CHANGE_FAILED', {
        reason: 'invalid_current_password',
        username: user.username
      }, ipAddress, userAgent);

      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' } as AuthResponse,
        { status: 400 }
      );
    }

    // Log successful password change
    await logUserAction(user.id, 'PASSWORD_CHANGED', {
      username: user.username
    }, ipAddress, userAgent);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Password changed successfully' 
      } as AuthResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as AuthResponse,
      { status: 500 }
    );
  }
}
