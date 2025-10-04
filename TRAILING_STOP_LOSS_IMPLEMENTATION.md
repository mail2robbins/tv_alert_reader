# Trailing Stop Loss Implementation

## Overview
This implementation adds trailing stop loss functionality to the TV Alert Reader application. Each account can now be configured with:

1. **Enable Trailing Stop Loss**: A boolean flag to enable/disable trailing stop loss for the account
2. **Minimum Trail Jump**: The minimum price increment (in multiples of ₹0.05) for trailing stop loss

## Changes Made

### 1. Account Configuration (`src/lib/multiAccountManager.ts`)
- Added `enableTrailingStopLoss: boolean` to `DhanAccountConfig` interface
- Added `minTrailJump: number` to `DhanAccountConfig` interface
- Updated account loading logic to read from environment variables:
  - `ENABLE_TRAILING_STOP_LOSS_{i}` (e.g., `ENABLE_TRAILING_STOP_LOSS_1=true`)
  - `MIN_TRAIL_JUMP_{i}` (e.g., `MIN_TRAIL_JUMP_1=0.05`)
- Added validation for `minTrailJump`:
  - Must be between ₹0.05 and ₹10
  - Must be a multiple of ₹0.05

### 2. UI Updates (`src/components/AccountConfigCard.tsx`)
- Updated `DhanAccountConfig` interface to include new fields
- Added two new configuration cards in the Account Details section:
  - **Trailing Stop Loss**: Shows "Enabled" (green) or "Disabled" (red)
  - **Min Trail Jump**: Shows the configured value in ₹ format
- Changed grid layout from 4 columns to 5 columns to accommodate new fields

### 3. Order Placement Logic (`src/lib/dhanApi.ts`)
- Updated `DhanOrderRequest` interface to include `trailingJump?: number`
- Modified `placeDhanOrderForAccount()` to include trailing jump when account has trailing stop loss enabled:
  ```typescript
  trailingJump: accountConfig.enableTrailingStopLoss ? accountConfig.minTrailJump : undefined
  ```
- Updated all order placement function signatures to accept `trailingJump` parameter
- Updated legacy order placement functions for backward compatibility

### 4. API Route Updates (`src/app/api/place-order/route.ts`)
- Updated order placement calls to pass through `trailingJump` parameter from order configuration

### 5. Environment Configuration (`env.example`)
- Added example configurations for all 5 accounts:
  - `ENABLE_TRAILING_STOP_LOSS_1=true`
  - `MIN_TRAIL_JUMP_1=0.05`
- Added legacy configuration support:
  - `ENABLE_TRAILING_STOP_LOSS=true`
  - `MIN_TRAIL_JUMP=0.05`

## Configuration Examples

### Account 1 (Trailing Stop Loss Enabled)
```env
ENABLE_TRAILING_STOP_LOSS_1=true
MIN_TRAIL_JUMP_1=0.05
```

### Account 2 (Trailing Stop Loss Disabled)
```env
ENABLE_TRAILING_STOP_LOSS_2=false
MIN_TRAIL_JUMP_2=0.10
```

### Account 3 (Higher Trail Jump)
```env
ENABLE_TRAILING_STOP_LOSS_3=true
MIN_TRAIL_JUMP_3=0.15
```

## How It Works

1. **Configuration Loading**: The system reads trailing stop loss settings from environment variables for each account
2. **UI Display**: The Account Details section shows the current trailing stop loss configuration for each account
3. **Order Placement**: When placing orders, if an account has trailing stop loss enabled, the `trailingJump` value is included in the Dhan API request
4. **Validation**: The system validates that the minimum trail jump is within acceptable limits and is a multiple of ₹0.05

## Benefits

- **Flexible Configuration**: Each account can have different trailing stop loss settings
- **Risk Management**: Allows fine-tuning of trailing stop loss behavior per account
- **Visual Feedback**: Clear indication in the UI of which accounts have trailing stop loss enabled
- **Backward Compatibility**: Existing configurations continue to work without modification

## Testing

To test the implementation:

1. Set environment variables for trailing stop loss configuration
2. Start the development server: `npm run dev`
3. Navigate to the Account Configuration section
4. Verify that the new trailing stop loss fields are displayed
5. Place a test order to verify that trailing jump is included in the API request when enabled

## Notes

- The minimum trail jump must be a multiple of ₹0.05 as per Dhan API requirements
- If trailing stop loss is disabled, no `trailingJump` parameter is sent to the API
- The implementation maintains backward compatibility with existing configurations
