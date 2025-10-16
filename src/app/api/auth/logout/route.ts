import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { deactivateSession, logUserAction } from '@/lib/userDatabase';
import { AuthResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
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
        { success: false, error: 'Invalid token' } as AuthResponse,
        { status: 401 }
      );
    }

    // Deactivate session
    await deactivateSession(token);

    // Log logout action
    await logUserAction(payload.userId, 'LOGOUT', {
      username: payload.username
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Logout successful' 
      } as AuthResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as AuthResponse,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as AuthResponse,
    { status: 405 }
  );
}
