# TP/SL Rebase Timing Fix

## Problem Identified

The TP/SL rebase feature was failing with the error:
```
TP/SL rebase failed for order 1032510105023971: Invalid entry price from order details
```

## Root Cause

The rebase function was being called immediately after order placement (with only a 2-second delay), but MARKET orders take time to execute and populate their actual entry price. The order was still in "TRANSIT" status with `price: 0` and `averagePrice: null`.

## Solution Implemented

### 1. Enhanced Retry Logic in `rebaseOrderTpAndSl()`

**File:** `src/lib/dhanApi.ts`

- **Added retry mechanism**: Up to 5 attempts with 3-second delays between retries
- **Better status checking**: Waits for order to move from "TRANSIT" to "COMPLETE" status
- **Improved error handling**: More descriptive error messages
- **Entry price validation**: Only proceeds when valid entry price is available

### 2. Reduced Initial Delay

**Files:** 
- `src/app/api/tradingview-alert/route.ts`
- `src/app/api/place-order/route.ts`

- **Reduced initial delay**: From 2000ms to 1000ms since we now have robust retry logic

## Key Improvements

### Before (Problematic Flow)
```
1. Place order → Order ID returned
2. Wait 2 seconds
3. Try to get order details → Order still in TRANSIT
4. No entry price available → FAIL
```

### After (Fixed Flow)
```
1. Place order → Order ID returned
2. Wait 1 second
3. Try to get order details (Attempt 1) → Order in TRANSIT
4. Wait 3 seconds
5. Try to get order details (Attempt 2) → Order in TRANSIT
6. Wait 3 seconds
7. Try to get order details (Attempt 3) → Order COMPLETE with entry price
8. Calculate and apply rebase → SUCCESS
```

## Configuration

The rebase feature is controlled by these environment variables:

```env
# Enable/disable rebase per account
REBASE_TP_AND_SL_1=true
REBASE_TP_AND_SL_2=true

# Threshold for triggering rebase (percentage)
REBASE_THRESHOLD_PERCENTAGE_1=0.02  # 2%
REBASE_THRESHOLD_PERCENTAGE_2=0.02  # 2%
```

## Testing

Run the test script to verify the fix:
```bash
node scripts/test-rebase-timing-fix.js
```

## Expected Behavior

1. **ChartInk alerts** are processed normally
2. **Orders are placed** with initial TP/SL based on alert price
3. **Rebase function** waits for order execution (up to 15 seconds total)
4. **Entry price** is retrieved once order is complete
5. **TP/SL is adjusted** if price difference exceeds threshold
6. **Success/failure** is logged with detailed information

## Error Handling

The improved function now handles:
- ✅ Orders still in TRANSIT status
- ✅ Missing or zero entry prices
- ✅ API timeouts and failures
- ✅ Network connectivity issues
- ✅ Invalid order IDs

## Logging

Enhanced logging provides visibility into:
- Retry attempts and timing
- Order status changes
- Price difference calculations
- Rebase success/failure reasons

## Impact

- **Reliability**: Rebase now works consistently for MARKET orders
- **Performance**: Reduced initial delay, but robust retry logic
- **User Experience**: Better error messages and logging
- **ChartInk Integration**: Full TP/SL rebase support for ChartInk alerts
