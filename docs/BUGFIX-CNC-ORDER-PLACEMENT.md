# Bug Fix: CNC Order Placement Failure

## Issue Summary
**Date:** November 12, 2025  
**Severity:** Critical  
**Impact:** All CNC orders fail with "Stock price too high for available funds"

## Problem Description

When attempting to place CNC (Cash and Carry) orders through the Advanced Manual Order Placement form, all orders failed with:

```
Error: Cannot place order for account XXX: Stock price too high for available funds
```

### Example from Logs

```javascript
customSettings: {
  availableFunds: 3000,
  leverage: 1,
  stopLossPercentage: 0.006,
  targetPricePercentage: 0.015,
  riskOnCapital: 0,  // ❌ PROBLEM!
  enableTrailingStopLoss: false
}

Result:
- quantity: 0
- orderValue: 0
- leveragedValue: 0
- status: 'failed'
- error: 'Stock price too high for available funds'
```

## Root Cause

In `AdvancedManualOrderPlacement.tsx`, the code was hardcoded to set `riskOnCapital: 0` for CNC orders:

```typescript
// PROBLEMATIC CODE (Line 312 & 388)
riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 0,
```

### Why This Breaks CNC Orders

The position calculation formula is:
```javascript
riskAdjustedFunds = availableFunds × riskOnCapital
quantity = Math.floor(riskAdjustedFunds / stockPrice)
```

With `riskOnCapital = 0`:
```javascript
riskAdjustedFunds = 3000 × 0 = 0
quantity = Math.floor(0 / 312.05) = 0
```

Since `quantity = 0`, the system rejects the order with "Stock price too high for available funds".

### Example Calculation

**Stock:** IVALUE  
**Price:** ₹312.05  
**Available Funds:** ₹3000

| riskOnCapital | Risk Adjusted Funds | Quantity | Result |
|---------------|---------------------|----------|--------|
| 0 (OLD) | ₹3000 × 0 = ₹0 | 0 | ❌ Failed |
| 1.0 (NEW) | ₹3000 × 1.0 = ₹3000 | 9 | ✅ Success |

## Solution

Changed `riskOnCapital` for CNC orders from `0` to `1.0`:

```typescript
// FIXED CODE
riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 1.0,
```

### What This Means

- **INTRADAY orders:** Use the user-specified `riskOnCapital` value (can be adjusted)
- **CNC orders:** Always use `riskOnCapital = 1.0` (100% of available funds)

This makes sense because:
1. CNC orders don't use leverage (leverage = 1)
2. CNC is for delivery, so you typically want to use your full capital
3. `riskOnCapital = 1.0` means "use 100% of available funds for calculation"

## Files Modified

**File:** `src/components/AdvancedManualOrderPlacement.tsx`

### Changes Made:

#### 1. Fixed riskOnCapital for CNC Orders (Lines 312 & 388)
Changed from:
```typescript
riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 0,
```

To:
```typescript
riskOnCapital: formData.productType === 'INTRADAY' ? formData.riskOnCapital / 100 : 1.0,
```

#### 2. Auto-reset Values When Switching to CNC (Lines 129-134)
Added automatic reset in `handleInputChange`:
```typescript
// If Product Type is changed to CNC, set leverage to 1 and riskOnCapital to 100%
// CNC orders don't use leverage (delivery trading)
if (field === 'productType' && value === 'CNC') {
  newData.leverage = 1;
  newData.riskOnCapital = 100.0; // 100% for CNC (will be converted to 1.0 when sending)
}
```

#### 3. Added Visual Info Display for CNC Orders (Lines 711-725)
Added informational box showing:
- Leverage: 1x (No leverage - full margin required)
- Risk on Capital: 100% (Uses full available funds)

This helps users understand that these values are fixed for CNC orders.

## Testing

### Before Fix
```bash
Stock: IVALUE
Price: ₹312.05
Available Funds: ₹3000
Product Type: CNC

Result:
✗ riskOnCapital: 0
✗ quantity: 0
✗ Error: "Stock price too high for available funds"
```

### After Fix
```bash
Stock: IVALUE
Price: ₹312.05
Available Funds: ₹3000
Product Type: CNC

Result:
✓ riskOnCapital: 1.0
✓ quantity: 9
✓ orderValue: ₹2808.45
✓ Order placed successfully
```

## Verification Steps

1. Open Advanced Manual Order Placement form
2. Select **CNC** as product type
3. Enter ticker and price
4. Set available funds (e.g., ₹3000)
5. Submit order
6. Verify order is placed with correct quantity

### Expected Behavior

For CNC orders with:
- Stock Price: ₹312.05
- Available Funds: ₹3000
- Leverage: 1 (automatic for CNC)
- riskOnCapital: 1.0 (automatic for CNC)

Should calculate:
- Quantity: 9 shares
- Order Value: ₹2808.45
- Leveraged Value: ₹2808.45 (same as order value since leverage = 1)

## Related Issues

This bug only affected **manual CNC orders** placed through the Advanced Order Placement form. It did not affect:
- INTRADAY orders (which use user-specified riskOnCapital)
- Automated orders from webhooks (which use account settings)
- Simple manual order form (different implementation)

## Prevention

### Code Review Checklist
- [ ] Verify `riskOnCapital` is never set to 0 for actual orders
- [ ] Test both INTRADAY and CNC order types
- [ ] Ensure quantity calculation produces non-zero values
- [ ] Check that all product types have appropriate defaults

### Understanding riskOnCapital

`riskOnCapital` is a multiplier that determines what percentage of available funds to use:

| Value | Meaning | Use Case |
|-------|---------|----------|
| 0 | Use 0% of funds | ❌ Never valid for real orders |
| 0.5 | Use 50% of funds | Conservative trading |
| 1.0 | Use 100% of funds | ✅ Standard for CNC |
| 1.5 | Use 150% of funds | Moderate leverage |
| 2.0 | Use 200% of funds | Aggressive trading |

For CNC orders (no leverage), `riskOnCapital = 1.0` is the appropriate default.

## Conclusion

The bug was a simple logic error where CNC orders were hardcoded to use `riskOnCapital = 0`, making it impossible to place any CNC orders. The fix sets `riskOnCapital = 1.0` for CNC orders, allowing them to use 100% of available funds for position calculation.
