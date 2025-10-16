import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { findUserById, findSessionByToken } from '@/lib/userDatabase';
import { AuthResponse } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
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

    // Check if session is still active
    const session = await findSessionByToken(token);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or expired' } as AuthResponse,
        { status: 401 }
      );
    }

    // Get current user data
    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as AuthResponse,
        { status: 401 }
      );
    }

    // Check if user is still approved and active
    if (!user.isApproved || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User account is not approved or inactive' } as AuthResponse,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        user,
        message: 'Token is valid' 
      } as AuthResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as AuthResponse,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as AuthResponse,
    { status: 405 }
  );
}
