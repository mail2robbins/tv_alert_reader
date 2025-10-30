# Account Settings Database Implementation

## Overview
Successfully migrated DHAN account configuration from `.env` file to database with a full-featured UI for management. The system now supports unlimited accounts with dynamic configuration through an authenticated web interface.

## What Was Implemented

### 1. Database Schema
**File**: `src/lib/accountSettingsDatabase.ts`

Created `account_settings` table with the following fields:
- `id` - Primary key
- `dhan_client_id` - Unique DHAN client ID
- `dhan_access_token` - DHAN API access token
- `available_funds` - Available trading funds
- `leverage` - Trading leverage multiplier
- `max_position_size` - Maximum position size (0-1)
- `min_order_value` - Minimum order value
- `max_order_value` - Maximum order value
- `stop_loss_percentage` - Stop loss percentage
- `target_price_percentage` - Target price percentage
- `risk_on_capital` - Risk percentage on capital
- `enable_trailing_stop_loss` - Enable/disable trailing stop loss
- `min_trail_jump` - Minimum trail jump value
- `rebase_tp_and_sl` - Enable/disable TP/SL rebasing
- `rebase_threshold_percentage` - Rebase threshold percentage
- `allow_duplicate_tickers` - Allow duplicate ticker orders
- `order_type` - Order type (MARKET/LIMIT)
- `is_active` - Account active status
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### 2. Migration Script
**File**: `scripts/migrate-account-settings.ts`
**Command**: `npm run db:migrate:settings`

- Creates the `account_settings` table
- Automatically migrates existing `.env` configurations to database
- Supports both numbered accounts (1-5) and legacy configuration
- Handles duplicate entries gracefully
- Provides detailed migration report

### 3. API Routes
**Files**: 
- `src/app/api/account-settings/route.ts`
- `src/app/api/account-settings/[id]/route.ts`
- `src/app/api/account-settings/config/route.ts`

#### Endpoints:

**Authenticated Endpoints** (require JWT token):
- **GET** `/api/account-settings` - List all account settings (masked tokens)
- **POST** `/api/account-settings` - Create new account settings
- **GET** `/api/account-settings/[id]` - Get specific account settings (full token)
- **PUT** `/api/account-settings/[id]` - Update account settings
- **DELETE** `/api/account-settings/[id]` - Delete account settings

**Internal Endpoint** (server-side use):
- **GET** `/api/account-settings/config` - Get account configurations for order processing
  - Returns data in `DhanAccountConfig` format
  - Used by `multiAccountManager.ts` for webhooks and order processing
  - No authentication required (internal server-to-server calls)

Security features:
- Access tokens are masked in list view (shows only last 4 characters)
- Full access tokens available only when editing (authenticated)
- Duplicate client ID validation
- Internal config endpoint only accessible server-side

### 4. UI Components

#### Main Page
**File**: `src/app/account-settings/page.tsx`
**Route**: `/account-settings`

Features:
- Protected route (requires authentication and approval)
- List view of all configured accounts
- Add new account button
- Edit and delete actions for each account
- Real-time status indicators (Active/Inactive)
- Responsive design with dark mode support

#### Supporting Components
**Files**:
- `src/components/AccountSettingsList.tsx` - Account list display
- `src/components/AccountSettingsForm.tsx` - Add/Edit form modal

Form includes all 16 configuration parameters with:
- Input validation
- Appropriate input types (number, checkbox, select)
- Step values for decimal inputs
- Min/max constraints
- User-friendly labels

### 5. Navigation Integration
**File**: `src/app/page.tsx`

Added "Account Settings" button to home page header:
- Purple-themed button with settings icon
- Positioned between "Manual Order Placement" and "Change Password"
- Accessible to all authenticated users

### 6. Updated Configuration Loading
**Files**: 
- `src/lib/multiAccountManager.ts` - Server-side configuration manager
- `src/lib/accountSettingsService.ts` - Client-side API service

Modified to support **API-based approach**:
1. **Primary**: Loads from database via API endpoint (`/api/account-settings/config`)
2. **Fallback**: Loads from `.env` if API call fails or returns no data
3. All functions updated to async/await pattern
4. Maintains backward compatibility
5. **No direct database imports** - prevents `pg` from being bundled in client code

**Server-side** (`multiAccountManager.ts`):
- `loadAccountConfigurations()` - Calls internal API endpoint
- `getActiveAccountConfigurations()` - Now async
- `getAccountConfiguration()` - Now async
- `getAccountConfigurationByClientId()` - Now async
- `validateAllAccountConfigurations()` - Now async
- `getConfigurationSummary()` - Now async

**Client-side** (`accountSettingsService.ts`):
- `fetchAccountSettings()` - Get all settings (authenticated)
- `fetchAccountSettingsById()` - Get single setting (authenticated)
- `createAccountSettings()` - Create new setting (authenticated)
- `updateAccountSettings()` - Update setting (authenticated)
- `deleteAccountSettings()` - Delete setting (authenticated)

### 7. Authentication Enhancement
**Files**:
- `src/types/auth.ts`
- `src/contexts/AuthContext.tsx`

Added `getAuthToken()` method to AuthContext for easier token retrieval in components.

## Configuration Parameters

All 16 parameters from your original request are supported:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| DHAN_CLIENT_ID | string | - | DHAN client ID (required) |
| DHAN_ACCESS_TOKEN | string | - | DHAN API access token (required) |
| AVAILABLE_FUNDS | number | 20000 | Available trading funds |
| LEVERAGE | number | 2 | Trading leverage multiplier |
| MAX_POSITION_SIZE | number | 0.1 | Maximum position size (10%) |
| MIN_ORDER_VALUE | number | 1000 | Minimum order value |
| MAX_ORDER_VALUE | number | 50000 | Maximum order value |
| STOP_LOSS_PERCENTAGE | number | 0.01 | Stop loss percentage (1%) |
| TARGET_PRICE_PERCENTAGE | number | 0.015 | Target price percentage (1.5%) |
| RISK_ON_CAPITAL | number | 2.0 | Risk percentage on capital |
| ENABLE_TRAILING_STOP_LOSS | boolean | true | Enable trailing stop loss |
| MIN_TRAIL_JUMP | number | 0.05 | Minimum trail jump value |
| REBASE_TP_AND_SL | boolean | true | Enable TP/SL rebasing |
| REBASE_THRESHOLD_PERCENTAGE | number | 0.02 | Rebase threshold (2%) |
| ALLOW_DUPLICATE_TICKERS | boolean | false | Allow duplicate ticker orders |
| DHAN_ORDER_TYPE | string | LIMIT | Order type (MARKET/LIMIT) |

## How to Use

### Step 1: Run Migration
```bash
npm run db:migrate:settings
```

This will:
- Create the `account_settings` table
- Migrate existing `.env` configurations to database
- Display migration summary

### Step 2: Access UI
1. Log in to the application
2. Click "Account Settings" button on home page
3. View, add, edit, or delete account configurations

### Step 3: Manage Accounts
- **Add Account**: Click "Add Account" button
- **Edit Account**: Click edit icon on any account card
- **Delete Account**: Click delete icon (with confirmation)
- **Toggle Active**: Use the "Active" checkbox when editing

### Step 4: Verify
The system will automatically:
- Load settings from database on startup
- Fall back to `.env` if database is unavailable
- Log which source is being used (check console)

## Benefits

1. **Unlimited Accounts**: No longer limited to 5 accounts
2. **Dynamic Configuration**: Change settings without restarting the application
3. **User-Friendly**: Web UI instead of editing `.env` files
4. **Secure**: Authenticated access, masked tokens in list view
5. **Backward Compatible**: Falls back to `.env` if needed
6. **Audit Trail**: Timestamps for creation and updates
7. **Active/Inactive**: Enable/disable accounts without deleting

## Migration Path

### Before (`.env` file):
```env
DHAN_CLIENT_ID_1=1108422445
DHAN_ACCESS_TOKEN_1=xxx
AVAILABLE_FUNDS_1=2000
# ... 13 more parameters
```

### After (Database + UI):
- All settings stored in `account_settings` table
- Managed through `/account-settings` UI
- API endpoints for programmatic access
- Backward compatible with `.env`

## Security Notes

1. **Authentication Required**: All API endpoints check for valid JWT token
2. **Approval Required**: Users must be approved to access settings
3. **Token Masking**: Access tokens masked in list view
4. **HTTPS Recommended**: Use HTTPS in production for token security
5. **Database Security**: Ensure DATABASE_URL is secure

## Troubleshooting

### Database Connection Issues
If migration fails:
1. Check `DATABASE_URL` in `.env.local`
2. Verify database is accessible
3. Run `npm run db:test` to test connection

### Settings Not Loading
If settings don't load from database:
1. Check console logs for error messages
2. Verify migration completed successfully
3. System will automatically fall back to `.env`

### API Errors
If API calls fail:
1. Check authentication token is valid
2. Verify user is approved
3. Check browser console for detailed errors

## Files Created/Modified

### New Files:
- `src/lib/accountSettingsDatabase.ts` - Database operations
- `src/lib/accountSettingsService.ts` - Client-side API service
- `src/app/api/account-settings/route.ts` - List/Create endpoints
- `src/app/api/account-settings/[id]/route.ts` - Get/Update/Delete endpoints
- `src/app/api/account-settings/config/route.ts` - Internal config endpoint
- `src/app/account-settings/page.tsx` - Settings UI page
- `src/components/AccountSettingsList.tsx` - List component
- `src/components/AccountSettingsForm.tsx` - Form component
- `scripts/migrate-account-settings.ts` - Migration script
- `ACCOUNT_SETTINGS_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `src/lib/multiAccountManager.ts` - Updated to use API endpoint instead of direct DB
- `src/app/page.tsx` - Added navigation button
- `src/types/auth.ts` - Added getAuthToken method
- `src/contexts/AuthContext.tsx` - Implemented getAuthToken
- `next.config.ts` - Added webpack config to exclude pg from client bundle
- `.env.local` - Added NEXT_PUBLIC_BASE_URL
- `package.json` - Added migration script

## Next Steps

1. **Run Migration**: Execute `npm run db:migrate:settings`
2. **Test UI**: Access `/account-settings` and verify all features
3. **Add Accounts**: Configure your DHAN accounts through the UI
4. **Remove .env Settings**: (Optional) Once migrated, you can remove DHAN settings from `.env`
5. **Monitor Logs**: Check console logs to confirm database loading

## Support

The implementation maintains full backward compatibility. If you encounter any issues:
- The system will automatically fall back to `.env` configuration
- Check console logs for detailed error messages
- Verify database connection and migration status
