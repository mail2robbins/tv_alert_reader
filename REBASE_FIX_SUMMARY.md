# Rebase Network Timeout Fix - Summary

## Problem
The rebase queue was failing with network timeout errors when trying to fetch order details from Dhan API:
- `ETIMEDOUT` errors on write operations
- Orders failing after 5 retry attempts
- Queue backing up with 35+ items

## Root Cause
1. **Insufficient timeout duration** - 10 seconds was too short for Dhan API responses
2. **Inadequate retry delays** - 3 seconds between retries wasn't enough for order execution
3. **No retry logic in fetch** - Network errors weren't being retried at the fetch level
4. **Too short initial delay** - 1 second wasn't enough for orders to execute before fetching details

## Solutions Implemented

### 1. Increased API Timeouts (`.env.local`)
```
DHAN_API_TIMEOUT_MS=30000  (was 10000)
REBASE_RETRY_DELAY_MS=5000 (was 3000)
REBASE_MAX_RETRIES=8       (was 5)
```

### 2. Enhanced Queue Manager Delays (`rebaseQueueManager.ts`)
```typescript
DELAY_BETWEEN_ATTEMPTS = 2000  (was 1000)
MAX_ATTEMPTS = 8               (was 5)
INITIAL_DELAY = 5000           (was 1000)
```

### 3. Added Retry Logic to Fetch (`dhanApi.ts`)
- Added 3-level retry with exponential backoff in `getDhanOrderDetails()`
- Retries on network errors: ETIMEDOUT, ECONNRESET, fetch failed
- Exponential backoff: 1s, 2s, 4s between retries
- Better error detection and handling

## Expected Behavior After Fix

### Timeline for Each Order:
1. **Order placed** → Status: TRANSIT
2. **Wait 5 seconds** (INITIAL_DELAY) → Allow order execution
3. **Attempt 1** → Fetch order details (30s timeout)
   - If network error → Retry after 1s
   - If network error → Retry after 2s
   - If network error → Retry after 4s
4. **If still failing** → Wait 5s (REBASE_RETRY_DELAY_MS)
5. **Attempt 2-8** → Repeat with same retry logic
6. **Total attempts**: Up to 8 attempts with 3 retries each = 24 fetch attempts max

### Success Indicators:
- ✅ `Rebase successful for order XXXXX`
- ✅ `Target price updated successfully`
- ✅ `Stop loss updated successfully`

### Failure Indicators:
- ❌ `Rebase failed for order XXXXX after 8 attempts`
- Queue should process faster with better retry logic

## Testing Steps

1. **Restart your application** to load new environment variables
2. **Monitor logs** for new orders:
   - Look for `⏳ Waiting 5000ms before first rebase attempt`
   - Check for successful retries: `⏳ Retrying in Xms due to network error`
3. **Check rebase status** via API:
   ```bash
   curl https://your-production-url/api/rebase-status
   ```
4. **Verify queue is processing**:
   - Queue length should decrease over time
   - Success rate should improve

## Rollback Plan

If issues persist, you can:
1. Temporarily disable rebasing:
   ```
   DISABLE_TP_SL_REBASE=true
   ```
2. Or disable per account in database:
   ```sql
   UPDATE account_configurations 
   SET rebase_tp_and_sl = false 
   WHERE account_id = 1;
   ```

## Monitoring

Watch for these log patterns:
- **Good**: `✅ Rebase successful`
- **Retry working**: `⏳ Retrying in Xms due to network error`
- **Still failing**: `❌ Rebase failed after 8 attempts`

## Next Steps

1. Deploy these changes to production
2. Monitor the first few orders
3. Check `/api/rebase-status` endpoint for success rate
4. If still failing, consider:
   - Increasing INITIAL_DELAY to 10 seconds
   - Checking Dhan API rate limits
   - Verifying server network connectivity
