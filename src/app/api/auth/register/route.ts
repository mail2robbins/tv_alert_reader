import { NextRequest, NextResponse } from 'next/server';
import { createUser, usernameExists, emailExists } from '@/lib/userDatabase';
import { validateUsername, validateEmail, validatePassword, sanitizeInput } from '@/lib/auth';
import { AuthResponse, RegisterRequest } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, fullName } = body;

    // Validate input
    if (!username || !email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' } as AuthResponse,
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData: RegisterRequest = {
      username: sanitizeInput(username),
      email: sanitizeInput(email),
      password: password, // Don't sanitize password as it might contain special chars
      fullName: sanitizeInput(fullName)
    };

    // Validate username
    const usernameValidation = validateUsername(sanitizedData.username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { success: false, error: usernameValidation.errors.join(', ') } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate email
    const emailValidation = validateEmail(sanitizedData.email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.errors.join(', ') } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(sanitizedData.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.errors.join(', ') } as AuthResponse,
        { status: 400 }
      );
    }

    // Check if username already exists
    if (await usernameExists(sanitizedData.username)) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' } as AuthResponse,
        { status: 409 }
      );
    }

    // Check if email already exists
    if (await emailExists(sanitizedData.email)) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' } as AuthResponse,
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(sanitizedData);

    // Remove sensitive data from response
    const { isApproved, ...userResponse } = user;

    return NextResponse.json(
      { 
        success: true, 
        user: userResponse,
        message: 'Registration successful. Your account is pending approval from the administrator.' 
      } as AuthResponse,
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle database constraint violations
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Username or email already exists' } as AuthResponse,
        { status: 409 }
      );
    }
    
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
