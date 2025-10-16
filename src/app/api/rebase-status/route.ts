import { NextRequest, NextResponse } from 'next/server';
import { rebaseQueueManager, RebaseResult } from '@/lib/rebaseQueueManager';
import { ApiResponse } from '@/types/alert';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (orderId) {
      // Get result for specific order
      const result = rebaseQueueManager.getResultForOrder(orderId);
      return NextResponse.json(
        { 
          success: true, 
          data: { 
            orderId,
            result: result || null
          }
        } as ApiResponse<{ 
          orderId: string; 
          result: RebaseResult | null; 
        }>,
        { status: 200 }
      );
    } else {
      // Get all results and queue status
      const results = rebaseQueueManager.getResults();
      const queueStatus = rebaseQueueManager.getQueueStatus();
      
      return NextResponse.json(
        { 
          success: true, 
          data: { 
            queueStatus,
            results,
            summary: {
              totalResults: results.length,
              successfulRebases: results.filter(r => r.success).length,
              failedRebases: results.filter(r => !r.success).length,
              pendingInQueue: queueStatus.queueLength
            }
          }
        } as ApiResponse<{ 
          queueStatus: { queueLength: number; processing: boolean; resultsCount: number };
          results: RebaseResult[];
          summary: {
            totalResults: number;
            successfulRebases: number;
            failedRebases: number;
            pendingInQueue: number;
          };
        }>,
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error fetching rebase status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rebase status' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    rebaseQueueManager.clearResults();
    return NextResponse.json(
      { success: true, message: 'Rebase results cleared' } as ApiResponse<null>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing rebase results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear rebase results' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
