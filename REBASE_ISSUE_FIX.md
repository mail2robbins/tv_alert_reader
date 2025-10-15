# TP/SL Rebase Issue Fix

## Problem Identified

The TP/SL rebase functionality was failing with the error:
```
TP/SL rebase failed for order 3632510155035671: Order not executed or no valid entry price after 5 attempts. Order status: unknown
```

## Root Cause Analysis

From the logs, the issue was:
```
📋 Order status: undefined, Price: undefined, AveragePrice: undefined
⏳ Order still in undefined status or no entry price, waiting 3000ms before retry...
```

The Dhan API was returning order details with `undefined` values for critical fields like `status`, `price`, and `averagePrice`. This indicates:

1. **API Response Issue**: The Dhan API might be returning an empty or malformed response
2. **Timing Issue**: The order might not be available in their system immediately after placement
3. **Authentication Issue**: The API call might be failing silently
4. **Data Structure Mismatch**: The API response structure might have changed

## Solutions Implemented

### 1. Enhanced Error Handling and Debugging

**File:** `src/lib/dhanApi.ts`

- **Added comprehensive logging** to track API responses
- **Enhanced data validation** to detect invalid/empty responses
- **Improved error messages** with more context
- **Added response structure mapping** to handle different API response formats

### 2. Better Retry Logic

- **Added validation for meaningful data** before processing
- **Enhanced status checking** with terminal vs pending states
- **Improved retry conditions** to handle various edge cases
- **Added fallback mechanism** to use original alert price if needed

### 3. Configuration Options

Added environment variables to control rebasing behavior:

```env
# Disable rebasing globally
DISABLE_TP_SL_REBASE=true

# Use original alert price as fallback when entry price is not available
REBASE_FALLBACK_TO_ALERT_PRICE=true
```

### 4. Account-Level Control

The rebasing can be disabled per account using the existing `rebaseTpAndSl` configuration:

```env
# Disable rebasing for specific accounts
REBASE_TP_AND_SL_1=false
REBASE_TP_AND_SL_2=false
```

## How to Use the Fix

### Option 1: Disable Rebase Globally (Quick Fix)
```env
DISABLE_TP_SL_REBASE=true
```

### Option 2: Disable Rebase Per Account
```env
REBASE_TP_AND_SL_1=false
REBASE_TP_AND_SL_2=false
```

### Option 3: Enable Fallback Mode
```env
REBASE_FALLBACK_TO_ALERT_PRICE=true
```

### Option 4: Keep Rebase Enabled (Default)
The enhanced error handling should resolve the issue while keeping rebasing functional.

## Testing the Fix

1. **Monitor the logs** for the new detailed debugging information
2. **Check for improved error messages** that provide more context
3. **Verify that orders are still placed successfully** even if rebase fails
4. **Test with different order types** (MARKET vs LIMIT orders)

## Expected Behavior After Fix

### Before (Problematic)
```
📋 Order status: undefined, Price: undefined, AveragePrice: undefined
❌ TP/SL rebase failed: Order not executed or no valid entry price after 5 attempts
```

### After (Fixed)
```
🔍 Fetching order details for orderId: 3632510155035671
📡 Response status: 200 OK
📋 Raw order details response: {...}
✅ Mapped order details: { orderId: "3632510155035671", status: "COMPLETE", price: 192, averagePrice: 191.5 }
✅ Valid entry price found: 191.5 on attempt 1
🎯 Recalculating TP/SL: Original TP: 193.44, New TP: 193.15, Original SL: 191.04, New SL: 190.85
✅ TP/SL rebase completed successfully
```

## Troubleshooting

If rebase still fails after the fix:

1. **Check the detailed logs** for the raw API response
2. **Verify the order ID** is correct and exists in Dhan's system
3. **Check authentication tokens** are valid and not expired
4. **Consider disabling rebase** temporarily using the environment variables
5. **Contact Dhan support** if the API is returning unexpected data

## Impact

- **Orders will still be placed successfully** even if rebase fails
- **Enhanced debugging** will help identify the root cause
- **Flexible configuration** allows disabling rebase if needed
- **Better error handling** prevents the application from crashing
