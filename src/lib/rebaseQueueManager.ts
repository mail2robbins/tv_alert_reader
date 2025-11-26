import { DhanAccountConfig } from './multiAccountManager';
import { rebaseOrderTpAndSl, getOrdersNeedingRebase, rebaseSuperOrderTpAndSl } from './dhanApi';

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
  private rebasedOrderIds = new Set<string>(); // Track successfully rebased orders to prevent duplicates
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
        // Check if this is a terminal failure (REJECTED, CANCELLED, etc.) that should not be retried
        if (result.terminalFailure) {
          console.error(`❌ Terminal failure for order ${item.orderId}: ${result.error}. Not retrying.`);
          this.addResult({
            orderId: item.orderId,
            accountId: item.accountId,
            clientId: item.clientId,
            success: false,
            error: result.error
          });
        } else if (item.attempts < item.maxAttempts) {
          // Only retry if not a terminal failure and we haven't exceeded max attempts
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
    rebasedOrdersCount: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      resultsCount: this.results.length,
      rebasedOrdersCount: this.rebasedOrderIds.size
    };
  }

  /**
   * Clear rebased orders tracking (useful for testing or daily reset)
   */
  clearRebasedOrdersTracking(): void {
    const count = this.rebasedOrderIds.size;
    this.rebasedOrderIds.clear();
    console.log(`🧹 [REBASE-SUPER-API] Cleared rebased orders tracking (${count} orders removed)`);
  }

  /**
   * Check if an order has been rebased in this session
   */
  isOrderRebased(orderId: string): boolean {
    return this.rebasedOrderIds.has(orderId);
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

  /**
   * Process all orders needing rebase using super orders API (improved approach)
   * This is more efficient as it fetches all orders at once instead of polling individual orders
   */
  async processAllOrdersNeedingRebase(accountConfig: DhanAccountConfig): Promise<RebaseResult[]> {
    const startTime = Date.now();
    try {
      console.log(`🔍 [REBASE-SUPER-API] Checking for orders needing rebase for account ${accountConfig.clientId}`);
      console.log(`📋 [REBASE-SUPER-API] Account config:`, {
        accountId: accountConfig.accountId,
        clientId: accountConfig.clientId,
        rebaseTpAndSl: accountConfig.rebaseTpAndSl,
        rebaseThresholdPercentage: accountConfig.rebaseThresholdPercentage,
        stopLossPercentage: accountConfig.stopLossPercentage,
        targetPricePercentage: accountConfig.targetPricePercentage
      });
      
      // Fetch all orders that need rebasing
      const ordersToRebase = await getOrdersNeedingRebase(accountConfig.accessToken, accountConfig);
      
      console.log(`📊 [REBASE-SUPER-API] Fetched ${ordersToRebase.length} TRADED orders with PENDING legs`);
      
      if (ordersToRebase.length === 0) {
        console.log(`✅ [REBASE-SUPER-API] No TRADED orders found for account ${accountConfig.clientId}`);
        return [];
      }
      
      // Filter only orders that actually need rebasing
      const needingRebase = ordersToRebase.filter(item => item.needsRebase);
      
      if (needingRebase.length === 0) {
        console.log(`✅ [REBASE-SUPER-API] All ${ordersToRebase.length} orders are within rebase threshold (${(accountConfig.rebaseThresholdPercentage * 100).toFixed(2)}%)`);
        return [];
      }
      
      console.log(`🎯 [REBASE-SUPER-API] Found ${needingRebase.length} orders exceeding rebase threshold:`, 
        needingRebase.map(item => ({
          orderId: item.order.orderId,
          symbol: item.order.tradingSymbol,
          entryPrice: item.entryPrice,
          currentSL: item.currentStopLoss,
          currentTP: item.currentTarget,
          reason: item.reason
        }))
      );
      
      // Process each order that needs rebasing
      const results: RebaseResult[] = [];
      
      for (const item of needingRebase) {
        try {
          // Check if this order has already been rebased successfully in this session
          if (this.rebasedOrderIds.has(item.order.orderId)) {
            console.log(`⏭️ [REBASE-SUPER-API] Skipping order ${item.order.orderId} - already rebased successfully in this session`);
            results.push({
              orderId: item.order.orderId,
              accountId: accountConfig.accountId.toString(),
              clientId: accountConfig.clientId,
              success: true,
              message: 'Already rebased in this session (skipped duplicate)'
            });
            continue;
          }
          
          console.log(`🔄 [REBASE-SUPER-API] Processing order ${item.order.orderId} (${item.order.tradingSymbol})`);
          console.log(`📈 [REBASE-SUPER-API] Order details:`, {
            orderId: item.order.orderId,
            symbol: item.order.tradingSymbol,
            signal: item.order.transactionType,
            entryPrice: item.entryPrice,
            currentStopLoss: item.currentStopLoss,
            currentTarget: item.currentTarget,
            quantity: item.order.quantity
          });
          
          const result = await rebaseSuperOrderTpAndSl(item.order, accountConfig);
          
          results.push({
            orderId: item.order.orderId,
            accountId: accountConfig.accountId.toString(),
            clientId: accountConfig.clientId,
            success: result.success,
            message: result.message,
            error: result.error,
            rebasedData: result.rebasedData
          });
          
          if (result.success) {
            // Mark this order as successfully rebased to prevent duplicate processing
            this.rebasedOrderIds.add(item.order.orderId);
            
            console.log(`✅ [REBASE-SUPER-API] Successfully rebased order ${item.order.orderId}:`, {
              originalTP: result.rebasedData?.originalTp,
              newTP: result.rebasedData?.newTp,
              originalSL: result.rebasedData?.originalSl,
              newSL: result.rebasedData?.newSl,
              entryPrice: result.rebasedData?.actualEntryPrice
            });
            console.log(`🔒 [REBASE-SUPER-API] Order ${item.order.orderId} marked as rebased (total: ${this.rebasedOrderIds.size} orders tracked)`);
          } else {
            console.error(`❌ [REBASE-SUPER-API] Failed to rebase order ${item.order.orderId}: ${result.error}`);
          }
          
          // Add small delay between orders to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ [REBASE-SUPER-API] Error processing rebase for order ${item.order.orderId}:`, error);
          results.push({
            orderId: item.order.orderId,
            accountId: accountConfig.accountId.toString(),
            clientId: accountConfig.clientId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      console.log(`✅ [REBASE-SUPER-API] Completed rebase processing for account ${accountConfig.clientId}: ${successCount}/${results.length} successful in ${duration}ms`);
      
      return results;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [REBASE-SUPER-API] Error in processAllOrdersNeedingRebase after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Process all orders for all active accounts using super orders API
   * Call this after order placement to rebase all pending orders efficiently
   */
  async processAllAccountsOrdersNeedingRebase(accounts: DhanAccountConfig[]): Promise<Map<string, RebaseResult[]>> {
    const startTime = Date.now();
    const resultsByAccount = new Map<string, RebaseResult[]>();
    
    console.log(`🚀 [REBASE-SUPER-API] Starting batch rebase for ${accounts.length} accounts`);
    
    for (const accountConfig of accounts) {
      if (!accountConfig.rebaseTpAndSl) {
        console.log(`⏭️ [REBASE-SUPER-API] Skipping account ${accountConfig.clientId} - rebasing disabled`);
        continue;
      }
      
      try {
        const results = await this.processAllOrdersNeedingRebase(accountConfig);
        resultsByAccount.set(accountConfig.clientId, results);
        
        // Add small delay between accounts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ [REBASE-SUPER-API] Failed to process account ${accountConfig.clientId}:`, error);
        resultsByAccount.set(accountConfig.clientId, []);
      }
    }
    
    const duration = Date.now() - startTime;
    const totalResults = Array.from(resultsByAccount.values()).flat();
    const successCount = totalResults.filter(r => r.success).length;
    
    console.log(`✅ [REBASE-SUPER-API] Batch rebase completed: ${successCount}/${totalResults.length} successful across ${accounts.length} accounts in ${duration}ms`);
    
    return resultsByAccount;
  }
}

// Export a singleton instance
export const rebaseQueueManager = new RebaseQueueManager();
