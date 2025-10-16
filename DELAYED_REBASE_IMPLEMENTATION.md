# Delayed Rebase Queue Implementation

## Problem Solved

The original TP/SL rebase implementation was failing because it tried to fetch order details immediately after placing orders, but DHAN API returned undefined values for entry prices since orders hadn't been fully processed yet.

## Solution

Implemented a delayed rebase queue system that:

1. **Queues orders immediately** after successful placement without blocking the response
2. **Processes rebase with delays** to allow orders to execute and populate entry prices
3. **Retries failed attempts** with exponential backoff
4. **Runs asynchronously** so new order placement isn't impacted

## Key Components

### 1. RebaseQueueManager (`src/lib/rebaseQueueManager.ts`)

- **Singleton pattern** for global queue management
- **Queue management** with FIFO processing
- **Retry logic** with configurable attempts and delays
- **Result tracking** for monitoring rebase success/failure
- **Async processing** that doesn't block order placement

### 2. Updated API Routes

#### Place Order Route (`src/app/api/place-order/route.ts`)
- Replaced immediate rebase calls with queue additions
- Returns queue status instead of rebase results
- Supports both multi-account and legacy modes

#### TradingView Alert Route (`src/app/api/tradingview-alert/route.ts`)
- Same queue-based approach for TradingView alerts
- Maintains compatibility with existing alert processing

### 3. Rebase Status API (`src/app/api/rebase-status/route.ts`)

New endpoint to monitor rebase queue:
- `GET /api/rebase-status` - Get all results and queue status
- `GET /api/rebase-status?orderId=ORDER_ID` - Get result for specific order
- `DELETE /api/rebase-status` - Clear all results

## Configuration

The system uses existing configuration:

```env
# Per-account rebase settings
REBASE_TP_AND_SL_1=true
REBASE_TP_AND_SL_2=true
REBASE_TP_AND_SL_3=false

# Rebase thresholds
REBASE_THRESHOLD_PERCENTAGE_1=0.1  # 0.1%
REBASE_THRESHOLD_PERCENTAGE_2=0.1  # 0.1%

# Global settings
DISABLE_TP_SL_REBASE=false
REBASE_FALLBACK_TO_ALERT_PRICE=true
```

## Processing Flow

### Before (Problematic)
```
1. Place order → Get order ID
2. Wait 1 second
3. Try to get order details → Order still in TRANSIT
4. No entry price available → FAIL
```

### After (Fixed)
```
1. Place order → Get order ID
2. Add to rebase queue immediately
3. Return response (non-blocking)
4. Process queue asynchronously:
   a. Wait 1 second initial delay
   b. Try to get order details
   c. If no entry price, retry after 1 second
   d. Repeat up to 5 times
   e. Once entry price available, calculate and apply rebase
```

## Benefits

1. **Non-blocking**: Order placement responses are immediate
2. **Reliable**: Retry logic handles timing issues
3. **Scalable**: Queue can handle multiple orders simultaneously
4. **Monitorable**: Status API provides visibility into rebase progress
5. **Configurable**: Uses existing account-level rebase settings

## API Response Changes

### Place Order Response
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "dhanResponses": [...],
    "rebaseQueueStatus": {
      "queueLength": 2,
      "processing": true,
      "resultsCount": 0
    },
    "summary": {
      "totalOrders": 3,
      "successfulOrders": 3,
      "failedOrders": 0,
      "accountsUsed": 2,
      "rebaseQueued": 2
    }
  }
}
```

### Rebase Status Response
```json
{
  "success": true,
  "data": {
    "queueStatus": {
      "queueLength": 0,
      "processing": false,
      "resultsCount": 2
    },
    "results": [
      {
        "orderId": "ORDER_001",
        "accountId": "1",
        "clientId": "CLIENT_001",
        "success": true,
        "message": "TP/SL rebased successfully",
        "rebasedData": {
          "originalTp": 254.26,
          "originalSl": 248.00,
          "newTp": 253.90,
          "newSl": 247.65,
          "actualEntryPrice": 250.15
        }
      }
    ],
    "summary": {
      "totalResults": 2,
      "successfulRebases": 2,
      "failedRebases": 0,
      "pendingInQueue": 0
    }
  }
}
```

## Testing

Run the test script to verify the implementation:

```bash
node scripts/test-delayed-rebase-queue.js
```

This simulates the complete flow and shows how the system handles:
- Order queuing
- Delayed processing
- Retry logic
- Success/failure tracking

## Migration Notes

- **Backward compatible**: Existing configuration continues to work
- **No breaking changes**: API responses include additional queue status
- **Gradual rollout**: Can be enabled/disabled per account
- **Monitoring**: Use `/api/rebase-status` to track rebase progress
