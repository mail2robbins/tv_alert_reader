# SELL Signal Rebase Logic Fix

## Problem Fixed

The rebase logic was incorrectly treating SELL orders as BUY orders when calculating Target Price (TP) and Stop Loss (SL). This caused:

- **SELL orders** to get BUY-style TP/SL calculations
- **Incorrect risk management** for SELL positions
- **Wrong profit/loss calculations** for short positions

## Solution Implemented

### 1. Updated Rebase Function (`src/lib/dhanApi.ts`)

**Added signal parameter:**
```typescript
export async function rebaseOrderTpAndSl(
  orderId: string,
  accountConfig: DhanAccountConfig,
  originalAlertPrice: number,
  signal: 'BUY' | 'SELL' = 'BUY'  // New parameter
)
```

**Fixed TP/SL calculation logic:**
```typescript
if (signal === 'SELL') {
  // For SELL signals: SL above entry (limit losses if price rises), TP below entry (profit if price falls)
  newTargetPrice = actualEntryPrice * (1 - accountConfig.targetPricePercentage);
  newStopLossPrice = actualEntryPrice * (1 + accountConfig.stopLossPercentage);
} else {
  // For BUY signals: SL below entry (limit losses if price falls), TP above entry (profit if price rises)
  newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);
  newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);
}
```

### 2. Updated RebaseQueueManager (`src/lib/rebaseQueueManager.ts`)

**Added signal to queue item:**
```typescript
export interface RebaseQueueItem {
  // ... existing fields
  signal: 'BUY' | 'SELL';  // New field
}
```

**Updated addToQueue method:**
```typescript
addToQueue(
  orderId: string,
  accountConfig: DhanAccountConfig,
  originalAlertPrice: number,
  clientId: string,
  accountId: string,
  signal: 'BUY' | 'SELL'  // New parameter
): void
```

**Pass signal to rebase function:**
```typescript
const result = await rebaseOrderTpAndSl(
  item.orderId,
  item.accountConfig,
  item.originalAlertPrice,
  item.signal  // Pass signal information
);
```

### 3. Updated API Routes

**Place Order Route (`src/app/api/place-order/route.ts`):**
```typescript
rebaseQueueManager.addToQueue(
  dhanResponse.orderId,
  accountConfig,
  alert.price,
  dhanResponse.clientId,
  dhanResponse.accountId.toString(),
  alert.signal  // Pass signal from alert
);
```

**TradingView Alert Route (`src/app/api/tradingview-alert/route.ts`):**
```typescript
rebaseQueueManager.addToQueue(
  dhanResponse.orderId,
  accountConfig,
  alert.price,
  dhanResponse.clientId,
  dhanResponse.accountId.toString(),
  alert.signal  // Pass signal from alert
);
```

## TP/SL Logic Comparison

### BUY Signal (Long Position)
- **Target Price**: Above entry price (profit if price rises)
- **Stop Loss**: Below entry price (limit loss if price falls)
- **Logic**: `TP = Entry × (1 + %)`, `SL = Entry × (1 - %)`

### SELL Signal (Short Position)  
- **Target Price**: Below entry price (profit if price falls)
- **Stop Loss**: Above entry price (limit loss if price rises)
- **Logic**: `TP = Entry × (1 - %)`, `SL = Entry × (1 + %)`

## Test Results

Created comprehensive test script (`scripts/test-sell-rebase-logic.js`) that verifies:

✅ **BUY Signal Tests**: TP above entry, SL below entry  
✅ **SELL Signal Tests**: TP below entry, SL above entry  
✅ **Risk/Reward Ratios**: Consistent 1:1.5 ratio for both signals  
✅ **Price Scenarios**: Works for both upward and downward price movements  

### Example Test Results

**BUY Signal (Entry: ₹250.50):**
- Target Price: ₹254.26 (above entry)
- Stop Loss: ₹248.00 (below entry)
- Risk/Reward: 1:1.50

**SELL Signal (Entry: ₹250.50):**
- Target Price: ₹246.74 (below entry)  
- Stop Loss: ₹253.00 (above entry)
- Risk/Reward: 1:1.50

## Coverage Status

### ✅ Alert Sources
- **TradingView Alerts**: Fully supported
- **ChartInk Alerts**: Fully supported

### ✅ Order Types  
- **BUY Orders**: Working correctly
- **SELL Orders**: Now working correctly ✅

### ✅ Signal Processing
- **BUY Signals**: TP above entry, SL below entry
- **SELL Signals**: TP below entry, SL above entry ✅

## Backward Compatibility

- **Default Parameter**: Signal defaults to 'BUY' for backward compatibility
- **Existing Code**: No breaking changes to existing functionality
- **API Responses**: Same response format maintained

## Build Status

✅ **TypeScript Compilation**: Passed  
✅ **ESLint Linting**: No errors  
✅ **Next.js Build**: Successful  
✅ **Type Checking**: All types correct  

## Files Modified

1. `src/lib/dhanApi.ts` - Updated rebase function signature and logic
2. `src/lib/rebaseQueueManager.ts` - Added signal support to queue system
3. `src/app/api/place-order/route.ts` - Pass signal to rebase queue
4. `src/app/api/tradingview-alert/route.ts` - Pass signal to rebase queue
5. `scripts/test-sell-rebase-logic.js` - Comprehensive test script

## Summary

The SELL signal rebase logic issue has been completely resolved. The system now correctly:

- ✅ Handles both BUY and SELL signals in rebase calculations
- ✅ Calculates appropriate TP/SL for both long and short positions  
- ✅ Maintains proper risk/reward ratios for all signal types
- ✅ Works with both TradingView and ChartInk alerts
- ✅ Preserves backward compatibility
- ✅ Passes all build and test validations

The delayed rebase queue system now provides accurate TP/SL rebasing for all order types and alert sources.
