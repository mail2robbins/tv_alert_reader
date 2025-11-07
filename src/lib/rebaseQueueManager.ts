import { DhanAccountConfig } from './multiAccountManager';
import { rebaseOrderTpAndSl } from './dhanApi';

export interface RebaseQueueItem {
  orderId: string;
  accountConfig: DhanAccountConfig;
  originalAlertPrice: number;
  clientId: string;
  accountId: string;
  signal: 'BUY' | 'SELL';
  addedAt: number;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: number;
}

export interface RebaseResult {
  orderId: string;
  accountId: string;
  clientId: string;
  success: boolean;
  message?: string;
  error?: string;
  rebasedData?: {
    originalTp?: number;
    originalSl?: number;
    newTp?: number;
    newSl?: number;
    actualEntryPrice?: number;
  };
}

class RebaseQueueManager {
  private queue: RebaseQueueItem[] = [];
  private processing = false;
  private results: RebaseResult[] = [];
  private readonly DELAY_BETWEEN_ATTEMPTS = 2000; // 2 seconds between retries
  private readonly MAX_ATTEMPTS = 8;
  private readonly INITIAL_DELAY = 5000; // 5 seconds initial delay to allow order execution

  /**
   * Add an order to the rebase queue
   */
  addToQueue(
    orderId: string,
    accountConfig: DhanAccountConfig,
    originalAlertPrice: number,
    clientId: string,
    accountId: string,
    signal: 'BUY' | 'SELL'
  ): void {
    // Check if rebasing is enabled for this account
    if (!accountConfig.rebaseTpAndSl) {
      console.log(`⚠️ TP/SL rebasing is disabled for account ${clientId}, skipping queue`);
      return;
    }

    // Check if already in queue
    const existingItem = this.queue.find(item => item.orderId === orderId);
    if (existingItem) {
      console.log(`⚠️ Order ${orderId} already in rebase queue, skipping`);
      return;
    }

    const queueItem: RebaseQueueItem = {
      orderId,
      accountConfig,
      originalAlertPrice,
      clientId,
      accountId,
      signal,
      addedAt: Date.now(),
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS
    };

    this.queue.push(queueItem);
    console.log(`📝 Added order ${orderId} to rebase queue (${this.queue.length} items in queue)`);

    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }
  }

  /**
   * Start processing the rebase queue
   */
  private async startProcessing(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    console.log(`🚀 Starting rebase queue processing (${this.queue.length} items)`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        await this.processQueueItem(item);
      } catch (error) {
        console.error(`❌ Error processing rebase queue item ${item.orderId}:`, error);
        this.addResult({
          orderId: item.orderId,
          accountId: item.accountId,
          clientId: item.clientId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during rebase'
        });
      }

      // Add delay between processing items to avoid overwhelming the API
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.processing = false;
    console.log(`✅ Rebase queue processing completed`);
  }

  /**
   * Process a single queue item with retry logic
   */
  private async processQueueItem(item: RebaseQueueItem): Promise<void> {
    console.log(`🔄 Processing rebase for order ${item.orderId} (attempt ${item.attempts + 1}/${item.maxAttempts})`);

    // Add initial delay for first attempt
    if (item.attempts === 0) {
      console.log(`⏳ Waiting ${this.INITIAL_DELAY}ms before first rebase attempt for order ${item.orderId}`);
      await new Promise(resolve => setTimeout(resolve, this.INITIAL_DELAY));
    }

    item.attempts++;
    item.lastAttemptAt = Date.now();

    try {
      const result = await rebaseOrderTpAndSl(
        item.orderId,
        item.accountConfig,
        item.originalAlertPrice,
        item.signal
      );

      if (result.success) {
        console.log(`✅ Rebase successful for order ${item.orderId}`);
        this.addResult({
          orderId: item.orderId,
          accountId: item.accountId,
          clientId: item.clientId,
          success: true,
          message: result.message,
          rebasedData: result.rebasedData
        });
      } else {
        // Check if we should retry
        if (item.attempts < item.maxAttempts) {
          console.log(`⚠️ Rebase failed for order ${item.orderId}: ${result.error}. Retrying in ${this.DELAY_BETWEEN_ATTEMPTS}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_ATTEMPTS));
          
          // Add back to queue for retry
          this.queue.unshift(item);
        } else {
          console.error(`❌ Rebase failed for order ${item.orderId} after ${item.maxAttempts} attempts: ${result.error}`);
          this.addResult({
            orderId: item.orderId,
            accountId: item.accountId,
            clientId: item.clientId,
            success: false,
            error: result.error
          });
        }
      }
    } catch (error) {
      // Check if we should retry
      if (item.attempts < item.maxAttempts) {
        console.log(`⚠️ Exception during rebase for order ${item.orderId}: ${error}. Retrying in ${this.DELAY_BETWEEN_ATTEMPTS}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_ATTEMPTS));
        
        // Add back to queue for retry
        this.queue.unshift(item);
      } else {
        console.error(`❌ Exception during rebase for order ${item.orderId} after ${item.maxAttempts} attempts:`, error);
        this.addResult({
          orderId: item.orderId,
          accountId: item.accountId,
          clientId: item.clientId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during rebase'
        });
      }
    }
  }

  /**
   * Add a result to the results array
   */
  private addResult(result: RebaseResult): void {
    this.results.push(result);
  }

  /**
   * Get all rebase results
   */
  getResults(): RebaseResult[] {
    return [...this.results];
  }

  /**
   * Get results for a specific order
   */
  getResultForOrder(orderId: string): RebaseResult | undefined {
    return this.results.find(result => result.orderId === orderId);
  }

  /**
   * Clear all results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    resultsCount: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      resultsCount: this.results.length
    };
  }

  /**
   * Wait for all rebase operations to complete
   */
  async waitForCompletion(timeoutMs: number = 30000): Promise<RebaseResult[]> {
    const startTime = Date.now();
    
    while (this.processing || this.queue.length > 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn(`⚠️ Timeout waiting for rebase completion after ${timeoutMs}ms`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.getResults();
  }
}

// Export a singleton instance
export const rebaseQueueManager = new RebaseQueueManager();
