# TP/SL Rebasement Implementation

## Overview
This implementation adds automatic TP/SL rebasement functionality to the TV Alert Reader application. When using MARKET orders, the actual entry price often differs from the TradingView alert price, causing incorrect Stop Loss and Target Price calculations. This feature automatically rebases the TP/SL based on the actual entry price.

## Problem Solved
- **Issue**: MARKET orders execute at different prices than TradingView alerts
- **Impact**: SL and TP are calculated based on alert price, not actual entry price
- **Solution**: Automatically fetch actual entry price and recalculate TP/SL after order placement

## New Configuration

### Account Configuration
Each account now has a new boolean configuration:
- **`rebaseTpAndSl`**: Enable/disable automatic TP/SL rebasement for the account

### Environment Variables
```env
# For numbered accounts
REBASE_TP_AND_SL_1=true
REBASE_TP_AND_SL_2=false
REBASE_TP_AND_SL_3=true

# For legacy configuration
REBASE_TP_AND_SL=true
```

## Implementation Details

### 1. Account Configuration (`src/lib/multiAccountManager.ts`)
- Added `rebaseTpAndSl: boolean` to `DhanAccountConfig` interface
- Updated account loading logic to read from environment variables
- Added support for both numbered and legacy configurations

### 2. Dhan API Functions (`src/lib/dhanApi.ts`)

#### New Interfaces
```typescript
interface DhanOrderDetails {
  orderId: string;
  dhanClientId: string;
  averagePrice?: number;
  price: number;
  targetPrice?: number;
  stopLossPrice?: number;
  // ... other fields
}
```

#### New Functions
- **`getDhanOrderDetails(orderId, accessToken)`**: Fetches order details from Dhan API
- **`updateDhanOrderTargetPrice(orderId, dhanClientId, targetPrice, accessToken)`**: Updates target price
- **`updateDhanOrderStopLoss(orderId, dhanClientId, stopLossPrice, accessToken, trailingJump?)`**: Updates stop loss
- **`rebaseOrderTpAndSl(orderId, accountConfig, originalAlertPrice)`**: Main rebasing function

### 3. Rebasement Logic

#### Process Flow
1. **Order Placement**: Place order with initial TP/SL based on alert price
2. **Delay**: Wait 2 seconds for order to be processed
3. **Fetch Details**: Get order details to find actual entry price
4. **Price Check**: Only rebase if price difference > 0.5%
5. **Recalculate**: Calculate new TP/SL based on actual entry price
6. **Update**: Update TP/SL via Dhan API

#### Rebasement Criteria
- Only rebase if `rebaseTpAndSl` is enabled for the account
- Only rebase if price difference is > 0.5% (configurable threshold)
- Uses `averagePrice` if available, otherwise uses `price` from order details

#### Calculation Logic
```typescript
// New Target Price = Actual Entry Price × (1 + Target Price Percentage)
const newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);

// New Stop Loss = Actual Entry Price × (1 - Stop Loss Percentage)
const newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);
```

### 4. Order Placement Integration (`src/app/api/place-order/route.ts`)

#### Multi-Account Orders
- After successful order placement, check each account's `rebaseTpAndSl` setting
- For accounts with rebasing enabled, call `rebaseOrderTpAndSl()`
- Include rebase results in API response

#### Legacy Orders
- Similar logic for single-account orders
- Uses legacy environment variables for configuration

#### Response Enhancement
```typescript
{
  success: true,
  data: {
    orders: [...],
    dhanResponses: [...],
    rebaseResults: [
      {
        orderId: "123456",
        accountId: 1,
        clientId: "client123",
        success: true,
        message: "TP/SL rebased successfully",
        rebasedData: {
          originalTp: 150.00,
          originalSl: 140.00,
          newTp: 152.50,
          newSl: 142.50,
          actualEntryPrice: 145.00
        }
      }
    ],
    summary: {
      totalOrders: 3,
      successfulOrders: 3,
      rebaseAttempted: 2,
      rebaseSuccessful: 2,
      rebaseFailed: 0
    }
  }
}
```

### 5. UI Updates (`src/components/AccountConfigCard.tsx`)
- Added "Rebase TP/SL" configuration card
- Shows "Enabled" (blue) or "Disabled" (gray) status
- Updated grid layout from 5 to 6 columns

## Configuration Examples

### Account 1 (Rebasing Enabled)
```env
REBASE_TP_AND_SL_1=true
STOP_LOSS_PERCENTAGE_1=0.01
TARGET_PRICE_PERCENTAGE_1=0.015
```

### Account 2 (Rebasing Disabled)
```env
REBASE_TP_AND_SL_2=false
STOP_LOSS_PERCENTAGE_2=0.012
TARGET_PRICE_PERCENTAGE_2=0.018
```

## How It Works

### Example Scenario
1. **TradingView Alert**: Price = ₹100.00, Signal = BUY
2. **Initial Order**: TP = ₹101.50, SL = ₹99.00 (based on alert price)
3. **Market Execution**: Actual entry price = ₹100.50
4. **Rebasement Triggered**: Price difference = 0.5% > threshold
5. **Recalculation**: 
   - New TP = ₹100.50 × 1.015 = ₹102.01
   - New SL = ₹100.50 × 0.99 = ₹99.50
6. **API Update**: TP and SL updated via Dhan Super Order API

### Logging
The system provides detailed logging:
```
🔄 Starting TP/SL rebase for order 123456 on account client123
📊 Order details: { orderId: "123456", originalAlertPrice: 100.00, actualEntryPrice: 100.50 }
🎯 Recalculating TP/SL: { originalTp: 101.50, newTp: 102.01, originalSl: 99.00, newSl: 99.50 }
✅ Target price updated successfully: ₹102.01
✅ Stop loss updated successfully: ₹99.50
🎉 TP/SL rebase completed successfully for order 123456
```

## Benefits

### Risk Management
- **Accurate SL/TP**: Ensures stop loss and target prices are based on actual entry price
- **Consistent Risk**: Maintains intended risk-reward ratios regardless of execution price
- **Market Volatility**: Handles price slippage in volatile market conditions

### Flexibility
- **Per-Account Control**: Each account can enable/disable rebasing independently
- **Threshold Control**: Only rebases when price difference is significant (>0.5%)
- **Trailing Stop Loss**: Integrates with existing trailing stop loss functionality

### Reliability
- **Error Handling**: Comprehensive error handling and logging
- **Partial Success**: Handles cases where only TP or SL update succeeds
- **API Resilience**: Retries and fallback mechanisms for API calls

## API Endpoints Used

### Get Order Details
```
GET https://api.dhan.co/v2/orders/{order-id}
```

### Update Target Price
```
PUT https://api.dhan.co/v2/super/orders/{order-id}
{
  "dhanClientId": "client123",
  "orderId": "123456",
  "legName": "TARGET_LEG",
  "targetPrice": 102.01
}
```

### Update Stop Loss
```
PUT https://api.dhan.co/v2/super/orders/{order-id}
{
  "dhanClientId": "client123",
  "orderId": "123456",
  "legName": "STOP_LOSS_LEG",
  "stopLossPrice": 99.50,
  "trailingJump": 0.05
}
```

## Testing

### Test Scenarios
1. **Price Difference < 0.5%**: Should skip rebasement
2. **Price Difference > 0.5%**: Should rebase TP/SL
3. **Rebasing Disabled**: Should not attempt rebasement
4. **API Failures**: Should handle gracefully with error logging
5. **Partial Updates**: Should handle TP success, SL failure scenarios

### Verification
- Check order details in Dhan dashboard after rebasement
- Verify TP/SL values match calculated values
- Monitor logs for rebasement activity
- Test with different price difference scenarios

## Notes

- **Timing**: 2-second delay ensures order is processed before rebasement
- **Threshold**: 0.5% minimum price difference prevents unnecessary API calls
- **Trailing Stop Loss**: Rebasement preserves trailing stop loss settings
- **Backward Compatibility**: Existing configurations continue to work
- **Performance**: Rebasement runs asynchronously after order placement
