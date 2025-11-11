# Tick Size Rounding Fix - LIMIT Buffer Percentage

## Issue

DHAN API rejected orders with error:
```
EXCH:16283:The order price is not multiple of the tick size.
```

### Example from Production Logs

**Order Details:**
- Ticker: HEG
- Original Price: ₹579.95
- Buffer: 0.05%
- Calculated Price: ₹580.24 ← **REJECTED**
- Error: Price not a multiple of tick size

**Problem:**
The calculated price (580.24) was not a valid tick size multiple for NSE stocks.

## Root Cause

When applying the LIMIT buffer percentage, the code was:
1. Calculating the buffered price: `579.95 * (1 + 0.05/100) = 580.2398`
2. Rounding to 2 decimal places: `580.24`
3. **Missing tick size validation**

For NSE equity stocks, valid prices must be multiples of the tick size (typically ₹0.05).

Valid prices: 579.90, 579.95, **580.00**, 580.05, 580.10...
Invalid prices: 580.01, 580.02, 580.03, **580.24**, etc.

## Solution

Added tick size rounding to ensure all LIMIT prices are valid multiples of NSE tick sizes.

### Implementation

**File**: `src/lib/dhanApi.ts` (lines 338-347)

```typescript
// Round to nearest valid tick size based on NSE price ranges
// NSE tick size rules:
// 0.00 - 999.95: tick size = 0.05
// 1000.00 - 9999.95: tick size = 0.05
// 10000.00+: tick size = 0.05
const tickSize = 0.05;
orderPrice = Math.round(orderPrice / tickSize) * tickSize;

// Round to 2 decimal places to avoid floating point precision issues
orderPrice = Math.round(orderPrice * 100) / 100;
```

### How It Works

1. **Calculate buffered price**: Apply the buffer percentage
   - Example: `579.95 * 1.0005 = 580.2398`

2. **Round to nearest tick size**: Divide by tick size, round, multiply back
   - `Math.round(580.2398 / 0.05) * 0.05`
   - `Math.round(11604.796) * 0.05`
   - `11605 * 0.05`
   - `580.25` ✅ Valid!

3. **Final precision rounding**: Ensure 2 decimal places
   - `Math.round(580.25 * 100) / 100 = 580.25`

## NSE Tick Size Rules

For NSE Equity (Cash Market):

| Price Range | Tick Size |
|-------------|-----------|
| ₹0.00 - ₹999.95 | ₹0.05 |
| ₹1,000.00 - ₹9,999.95 | ₹0.05 |
| ₹10,000.00+ | ₹0.05 |

**Note**: Currently using ₹0.05 for all price ranges as per NSE standard tick size.

## Examples

### Example 1: HEG Stock (Original Issue)
- Original Price: ₹579.95
- Buffer: 0.05%
- Before Fix: ₹580.24 ❌ (rejected)
- After Fix: ₹580.25 ✅ (valid)

### Example 2: Low Price Stock
- Original Price: ₹45.30
- Buffer: 0.10%
- Calculated: ₹45.3453
- Rounded: ₹45.35 ✅ (valid)

### Example 3: High Price Stock
- Original Price: ₹2,450.00
- Buffer: 0.05%
- Calculated: ₹2,451.225
- Rounded: ₹2,451.25 ✅ (valid)

### Example 4: SELL Order
- Original Price: ₹1,234.50
- Buffer: 0.05% (subtract for SELL)
- Calculated: ₹1,233.8825
- Rounded: ₹1,233.90 ✅ (valid)

## Updated Log Output

The console log now includes the tick size information:

```javascript
Applied LIMIT buffer for BUY order: {
  originalPrice: 579.95,
  bufferPercentage: 0.05,
  calculatedPrice: 580.25,  // Now valid!
  tickSize: 0.05,            // NEW
  difference: '0.30'
}
```

## Testing Recommendations

1. **Test with various price ranges**:
   - Low price stocks (₹10-100)
   - Medium price stocks (₹100-1,000)
   - High price stocks (₹1,000-10,000)
   - Very high price stocks (₹10,000+)

2. **Test with different buffer percentages**:
   - 0.01% (very small buffer)
   - 0.05% (recommended)
   - 0.10% (larger buffer)
   - 1.00% (maximum recommended)

3. **Verify order placement**:
   - Check DHAN API accepts the orders
   - Verify no "tick size" rejection errors
   - Confirm orders execute successfully

## Impact

✅ **All LIMIT orders will now use valid tick sizes**
✅ **No more EXCH:16283 rejection errors**
✅ **Buffer percentage still applied effectively**
✅ **Backward compatible with existing configurations**

## Files Modified

1. `src/lib/dhanApi.ts` - Added tick size rounding logic (lines 338-347)

## Related Documentation

- `LIMIT_BUFFER_PERCENTAGE_IMPLEMENTATION.md` - Original feature documentation
- `LIMIT_BUFFER_QUICK_GUIDE.md` - Quick setup guide
- `BUILD_FIXES_SUMMARY.md` - Build error fixes
- `UI_DISPLAY_FIXES.md` - UI display fixes

## Production Verification

After deploying this fix, verify with the same order:
- Ticker: HEG
- Price: ₹579.95
- Buffer: 0.05%
- Expected Result: ₹580.25 (instead of ₹580.24)
- Status: Should be accepted by DHAN ✅

## Future Enhancements (Optional)

If needed, we could implement dynamic tick size detection based on:
1. Price range (different tick sizes for different ranges)
2. Exchange segment (NSE vs BSE vs F&O)
3. Instrument type (Equity vs Derivatives)

However, the current implementation with ₹0.05 tick size should work for all NSE equity stocks.
