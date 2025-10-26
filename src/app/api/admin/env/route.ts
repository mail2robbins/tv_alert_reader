import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all environment variables
    const envVars = Object.entries(process.env)
      .map(([key, value]) => ({
        key,
        value: value || ''
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return NextResponse.json({
      success: true,
      envVars,
      count: envVars.length
    });
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch environment variables',
        envVars: []
      },
      { status: 500 }
    );
  }
}
