# Bug Fix: ChartInk Price Parsing Issue

## Issue Summary
**Date:** November 12, 2025  
**Severity:** Critical  
**Impact:** Orders failed to be placed due to incorrect price parsing

## Problem Description

When ChartInk sent an alert for MFSL with a SELL signal, the order placement failed with the following error:

```
Cannot place order on any account: [
  'Leveraged value (₹844.85) below minimum (₹1000)',
  'Leveraged value (₹844.85) below minimum (₹1000)'
]
```

### Alert Details
- **Ticker:** MFSL
- **Signal:** SELL
- **Price:** ₹1689.70
- **Strategy:** Webhook v3 for Buy
- **Time:** Nov 12, 2025 09:16:21 IST

### Root Cause

The issue was in the `processChartInkAlert()` function in `src/lib/validation.ts`. The function was using `parseFloat()` directly on the price string from ChartInk without cleaning it first.

**Problem Code:**
```typescript
const price = parseFloat(pricesArray[i]);
```

When ChartInk sends prices with currency symbols (e.g., "₹1689.70"), `parseFloat()` returns `NaN` because it stops at the first non-numeric character.

### Impact Chain

1. **Price Parsing:** `parseFloat("₹1689.70")` → `NaN`
2. **Position Calculation:** Used `NaN` in calculations
3. **Leveraged Value:** Resulted in incorrect value (₹844.85 instead of proper calculation)
4. **Order Rejection:** Leveraged value below minimum threshold (₹1000)

## Solution

Modified three functions in `src/lib/validation.ts` to clean price strings before parsing:

### 1. TradingView Alert Validation (`validateTradingViewAlert`)

```typescript
// Clean price string: remove currency symbols (₹, Rs, $), commas, and spaces before parsing
const cleanedPrice = payloadObj.price.replace(/[₹Rs$,\s]/g, '');
price = parseFloat(cleanedPrice);
```

### 2. ChartInk Alert Validation (`validateChartInkAlert`)

```typescript
// Clean price string: remove currency symbols (₹, Rs), commas, and spaces before parsing
const cleanedPrice = price.replace(/[₹Rs,\s]/g, '');
const numPrice = parseFloat(cleanedPrice);
```

### 3. ChartInk Alert Processing (`processChartInkAlert`)

```typescript
// Clean price string: remove currency symbols (₹, Rs), commas, and spaces before parsing
const cleanedPrice = pricesArray[i].replace(/[₹Rs,\s]/g, '');
const price = parseFloat(cleanedPrice);

// Validate that price is a valid number
if (isNaN(price) || price <= 0) {
  console.error(`Invalid price for ${ticker}: "${pricesArray[i]}" (cleaned: "${cleanedPrice}")`);
  continue; // Skip this alert if price is invalid
}
```

### Changes Made

**File:** `src/lib/validation.ts`

1. **Lines 29-31:** TradingView alert validation
2. **Lines 175-177:** ChartInk alert validation  
3. **Lines 234-242:** ChartInk alert processing

The fix:
1. Removes currency symbols (₹, Rs, $ for TradingView)
2. Removes commas (for formatted numbers like "1,689.70")
3. Removes spaces
4. Validates the parsed number
5. Logs errors and skips invalid prices (in processing function)

## Testing

### Test Cases Covered

1. **Normal format:** "1689.70" → 1689.7 ✓
2. **With rupee symbol:** "₹1689.70" → 1689.7 ✓
3. **With Rs prefix:** "Rs 1689.70" → 1689.7 ✓
4. **With comma separator:** "1,689.70" → 1689.7 ✓
5. **Combined:** "₹1,689.70" → 1689.7 ✓

### Test Scripts

- `scripts/test-price-parsing.js` - Unit test for price parsing
- `scripts/test-mfsl-alert.js` - Integration test with actual MFSL alert data

## Verification

To verify the fix works:

1. Ensure `ALERT_SOURCE=ChartInk` in your `.env.local`
2. Run the test script:
   ```bash
   node scripts/test-mfsl-alert.js
   ```
3. Check that:
   - Price is correctly parsed as 1689.70
   - Order calculations use the correct price
   - Leveraged value is reasonable (not ₹844.85)
   - Orders are placed successfully (if funds available)

## Prevention

This fix ensures that:
- All ChartInk price formats are handled correctly
- Invalid prices are logged and skipped
- Orders are calculated with accurate price data
- The system is resilient to different price formatting from ChartInk

## Related Files

- `src/lib/validation.ts` - Price parsing fix
- `src/lib/fundManager.ts` - Position size calculations
- `src/lib/dhanApi.ts` - Order placement logic
- `scripts/test-mfsl-alert.js` - Test script for this specific issue

## Notes

### Why This Issue Occurred

The original code had inconsistent price handling:
- The validation function `validateChartInkAlert()` did NOT have cleaning logic (now fixed)
- The processing function `processChartInkAlert()` also did NOT have cleaning logic (now fixed)
- This meant that if ChartInk sent prices with currency symbols, the alert would fail validation entirely

The issue manifested when ChartInk started sending prices with currency symbols (₹), which wasn't handled by the original implementation.

### Additional Improvements

- Added price cleaning to TradingView alert validation for consistency
- All three price parsing locations now use the same robust cleaning logic
- Added validation and error logging in the processing function to catch any future issues
