import { NextRequest, NextResponse } from 'next/server';
import { 
  loadAccountConfigurations, 
  validateAllAccountConfigurations, 
  getConfigurationSummary 
} from '@/lib/multiAccountManager';
import { ApiResponse } from '@/types/alert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeValidation = searchParams.get('includeValidation') === 'true';
    const includeSummary = searchParams.get('includeSummary') === 'true';

    const config = loadAccountConfigurations();
    
    const responseData: {
      config: typeof config;
      validation?: ReturnType<typeof validateAllAccountConfigurations>;
      summary?: ReturnType<typeof getConfigurationSummary>;
    } = {
      config
    };

    if (includeValidation) {
      responseData.validation = validateAllAccountConfigurations();
    }

    if (includeSummary) {
      responseData.summary = getConfigurationSummary();
    }

    return NextResponse.json(
      { 
        success: true, 
        data: responseData 
      } as ApiResponse<typeof responseData>,
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching account configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account configuration' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' } as ApiResponse<null>,
    { status: 405 }
  );
}
