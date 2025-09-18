import { NextRequest, NextResponse } from 'next/server';
import { getFundConfig, updateFundConfig, validateFundConfig, FundConfig } from '@/lib/fundManager';

// GET - Retrieve current fund configuration
export async function GET() {
  try {
    const config = getFundConfig();
    
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

// POST - Update fund configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newConfig: Partial<FundConfig> = body;
    
    // Validate the configuration
    const validation = validateFundConfig({ ...getFundConfig(), ...newConfig });
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
    
    // Update the configuration
    const updatedConfig = updateFundConfig(newConfig);
    
    return NextResponse.json({
      success: true,
      data: updatedConfig
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
