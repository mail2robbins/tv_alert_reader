import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials, updateLastLogin, createUserSession, logUserAction } from '@/lib/userDatabase';
import { generateToken } from '@/lib/auth';
import { AuthResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' } as AuthResponse,
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await verifyUserCredentials(username, password);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' } as AuthResponse,
        { status: 401 }
      );
    }

    // Check if user is approved
    if (!user.isApproved) {
      await logUserAction(user.id, 'LOGIN_DENIED', {
        reason: 'not_approved',
        username
      });
      
      return NextResponse.json(
        { success: false, error: 'Your account is pending approval. Please contact the administrator.' } as AuthResponse,
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    await createUserSession(user.id, token, userAgent, ipAddress);

    // Update last login
    await updateLastLogin(user.id);

    // Log successful login
    await logUserAction(user.id, 'LOGIN_SUCCESS', {
      username,
      ipAddress
    });

    return NextResponse.json(
      { 
        success: true, 
        user, 
        token,
        message: 'Login successful' 
      } as AuthResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
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
