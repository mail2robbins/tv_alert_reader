# LIMIT_BUFFER_PERCENTAGE Implementation Summary

## Overview
Added a new account-level setting `LIMIT_BUFFER_PERCENTAGE` that allows users to add a buffer to the LIMIT price when placing orders with DHAN. This helps reduce slippage issues when using LIMIT execution type.

## Problem Statement
- MARKET orders have significant slippage in DHAN
- LIMIT orders without buffer often fail to execute because:
  - BUY orders: Last traded price is above the LIMIT price
  - SELL orders: Last traded price is below the LIMIT price

## Solution
Added `LIMIT_BUFFER_PERCENTAGE` setting that:
- Applies only when Execution Type is LIMIT
- For BUY orders: Adds buffer to increase the limit price → `price + (price × buffer%)`
- For SELL orders: Subtracts buffer to decrease the limit price → `price - (price × buffer%)`
- Default value: 0.0% (no buffer)

## Example
```
Alert Price: ₹100.00
LIMIT_BUFFER_PERCENTAGE: 0.01% (0.01)

BUY Order:
  LIMIT Price = 100.00 + (100.00 × 0.01%) = 100.00 + 0.01 = ₹100.01

SELL Order:
  LIMIT Price = 100.00 - (100.00 × 0.01%) = 100.00 - 0.01 = ₹99.99
```

## Files Modified

### 1. Database Schema & Interfaces
- **`src/lib/accountSettingsDatabase.ts`**
  - Added `limitBufferPercentage: number` to `AccountSettings` interface
  - Updated table schema to include `limit_buffer_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.0`
  - Updated all CRUD operations to handle the new field

- **`src/lib/accountSettingsService.ts`**
  - Added `limitBufferPercentage: number` to `AccountSettingsDTO` interface

- **`src/lib/multiAccountManager.ts`**
  - Added `limitBufferPercentage: number` to `DhanAccountConfig` interface
  - Updated environment variable loading for numbered accounts: `LIMIT_BUFFER_PERCENTAGE_${i}`
  - Updated legacy account loading: `LIMIT_BUFFER_PERCENTAGE`

### 2. Order Placement Logic
- **`src/lib/dhanApi.ts`** (lines 319-350)
  - Implemented price calculation logic with buffer for LIMIT orders
  - Applies buffer based on transaction type (BUY/SELL)
  - Rounds calculated price to 2 decimal places
  - Logs buffer application details for debugging

### 3. API Routes
- **`src/app/api/account-settings/config/route.ts`**
  - Added `limitBufferPercentage` to account config mapping

### 4. User Interface
- **`src/components/AccountSettingsForm.tsx`**
  - Added input field for LIMIT Buffer %
  - Input type: number, step: 0.01, min: 0, max: 10
  - Added help text explaining the buffer behavior
  - Default value: 0.0

### 5. Database Migration
- **`scripts/add-limit-buffer-percentage-migration.sql`**
  - SQL migration script to add the new column to existing databases
  - Safe to run multiple times (checks if column exists)

## Configuration

### Environment Variables (Optional)
For numbered accounts (1-5):
```env
LIMIT_BUFFER_PERCENTAGE_1=0.01
LIMIT_BUFFER_PERCENTAGE_2=0.02
LIMIT_BUFFER_PERCENTAGE_3=0.0
```

For legacy single account:
```env
LIMIT_BUFFER_PERCENTAGE=0.01
```

### Database Configuration
The setting is stored in the `account_settings` table and can be managed through:
1. Account Settings UI (recommended)
2. Direct database updates
3. API endpoints

## Usage

### For Manual Order Placement
1. Navigate to Account Settings
2. Edit the account configuration
3. Set "LIMIT Buffer %" field (e.g., 0.01 for 0.01%)
4. Ensure "Order Type" is set to "LIMIT"
5. Save the configuration
6. Place manual orders - buffer will be automatically applied

### For Alert-Based Order Placement
1. Configure the account with desired LIMIT_BUFFER_PERCENTAGE
2. Set account's Order Type to "LIMIT"
3. When TradingView or ChartInk alerts are received:
   - System checks the account's execution type
   - If LIMIT, applies the buffer percentage
   - Places order with adjusted price

## Testing Recommendations

1. **Test with small buffer values first** (e.g., 0.01% = 0.01)
2. **Monitor order execution rates** before and after enabling buffer
3. **Check logs** for buffer application details:
   ```
   Applied LIMIT buffer for BUY order: {
     originalPrice: 100.00,
     bufferPercentage: 0.01,
     calculatedPrice: 100.01,
     difference: 0.01
   }
   ```

## Database Migration Steps

### For Existing Databases
Run the migration script:
```bash
psql -U your_username -d your_database -f scripts/add-limit-buffer-percentage-migration.sql
```

Or execute directly in PostgreSQL:
```sql
ALTER TABLE account_settings ADD COLUMN limit_buffer_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.0;
```

### For New Installations
The column is automatically created when initializing the database using `initializeAccountSettingsTable()`.

## Validation

The system validates:
- Buffer percentage is a number
- Stored as DECIMAL(6,4) in database (supports up to 99.9999%)
- UI limits input to 0-10% for safety
- Default is 0.0% (no buffer)

## Impact on Existing Orders

- **No impact on MARKET orders** - buffer is only applied to LIMIT orders
- **Backward compatible** - existing accounts default to 0.0% buffer
- **Per-account setting** - each account can have different buffer values

## Logging & Debugging

The implementation includes detailed logging:
- Buffer application details (original price, buffer %, calculated price)
- Transaction type (BUY/SELL)
- Price difference after buffer application

Check logs for entries like:
```
Applied LIMIT buffer for BUY order: {...}
```

## Future Enhancements (Optional)

1. Add buffer percentage validation based on market conditions
2. Implement dynamic buffer calculation based on volatility
3. Add buffer statistics and success rate tracking
4. Support different buffer values for BUY vs SELL orders

## Support

For issues or questions:
1. Check application logs for buffer application details
2. Verify account settings in the UI
3. Ensure Order Type is set to "LIMIT"
4. Confirm database migration was successful
