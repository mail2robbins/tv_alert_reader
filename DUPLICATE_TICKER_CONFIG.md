# Duplicate Ticker Configuration

## Overview
A new per-account configuration setting has been added to control whether duplicate ticker orders can be placed on the same day for each account.

## Configuration

### Environment Variables

For each account (1-5), you can now set:

```
ALLOW_DUPLICATE_TICKERS_1=true
ALLOW_DUPLICATE_TICKERS_2=false
ALLOW_DUPLICATE_TICKERS_3=true
ALLOW_DUPLICATE_TICKERS_4=false
ALLOW_DUPLICATE_TICKERS_5=false
```

For legacy single-account configuration:
```
ALLOW_DUPLICATE_TICKERS=true
```

### Default Value
**Default: `false`** (duplicate orders for the same ticker on the same day are blocked)

## Behavior

### When `allowDuplicateTickers = false` (Default)
- Each account will check if a ticker has already been ordered today for that specific account
- If the ticker was already ordered today for that account, the new order will be blocked
- The order will return an error: `"Order blocked: Ticker {TICKER} has already been ordered today for this account"`
- Other accounts can still place orders for the same ticker if their configuration allows it

### When `allowDuplicateTickers = true`
- The account can place multiple orders for the same ticker on the same day
- No duplicate ticker checking is performed for that account

## Implementation Details

### Files Modified

1. **`src/lib/multiAccountManager.ts`**
   - Added `allowDuplicateTickers: boolean` field to `DhanAccountConfig` interface
   - Updated `loadAccountConfigurations()` to read the environment variable for each account
   - Defaults to `false` if not specified

2. **`src/lib/orderDatabase.ts`**
   - Added `hasTickerBeenOrderedTodayForAccountInDatabase()` function
   - Checks the `placed_orders` table for existing orders by ticker and account ID for today

3. **`src/lib/orderTracker.ts`**
   - Added `hasTickerBeenOrderedTodayForAccount()` function
   - Supports both database and in-memory fallback for checking per-account ticker orders

4. **`src/lib/dhanApi.ts`**
   - Updated `placeDhanOrderForAccount()` to check `allowDuplicateTickers` setting
   - Performs per-account duplicate ticker check before placing orders
   - Returns error response if duplicate is detected and not allowed

5. **`src/app/api/tradingview-alert/route.ts`**
   - Removed global duplicate ticker check
   - Now relies on per-account checking in `placeDhanOrderForAccount()`

6. **`src/app/api/place-order/route.ts`**
   - Removed global duplicate ticker check
   - Added `allowDuplicateTickers` field to legacy account configuration
   - Now relies on per-account checking in `placeDhanOrderForAccount()`

## Example Use Cases

### Scenario 1: Different strategies per account
- Account 1: Day trading strategy (allow duplicates) → `ALLOW_DUPLICATE_TICKERS_1=true`
- Account 2: Swing trading strategy (no duplicates) → `ALLOW_DUPLICATE_TICKERS_2=false`

### Scenario 2: Risk management
- Account 1: High-risk account (allow duplicates) → `ALLOW_DUPLICATE_TICKERS_1=true`
- Account 2: Conservative account (no duplicates) → `ALLOW_DUPLICATE_TICKERS_2=false`

### Scenario 3: Testing vs Production
- Account 1: Testing account (allow duplicates for testing) → `ALLOW_DUPLICATE_TICKERS_1=true`
- Account 2: Production account (no duplicates) → `ALLOW_DUPLICATE_TICKERS_2=false`

## Database Schema

The duplicate ticker checking uses the existing `placed_orders` table with the following query:

```sql
SELECT COUNT(*) as count FROM placed_orders 
WHERE ticker = $1 
  AND account_id = $2 
  AND DATE(timestamp) = $3
  AND status IN ('placed', 'pending')
```

## Logging

When an order is blocked due to duplicate ticker:
```
Order blocked for account {CLIENT_ID}: Ticker {TICKER} has already been ordered today and allowDuplicateTickers is false
```

## Migration Notes

- **Backward Compatible**: Existing configurations will default to `false` (no duplicates allowed)
- **No Database Changes Required**: Uses existing `placed_orders` table
- **No Breaking Changes**: All existing functionality remains intact
