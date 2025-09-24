# Multi-Account Setup Guide

This guide explains how to configure and use multiple Dhan.co accounts with the TradingView Alert Reader.

## Overview

The system now supports up to 5 Dhan.co accounts, each with individual configurations for:
- Available funds
- Leverage settings
- Position sizing
- Risk management parameters
- Order value limits

When a TradingView alert triggers, the system will automatically place orders on all configured accounts based on their individual settings.

## Environment Configuration

### Account 1 (Required)
```bash
# Dhan.co API Configuration - Account 1
DHAN_ACCESS_TOKEN_1=your_dhan_access_token_here
DHAN_CLIENT_ID_1=your_dhan_client_id_here
AVAILABLE_FUNDS_1=20000
LEVERAGE_1=2
MAX_POSITION_SIZE_1=0.1
MIN_ORDER_VALUE_1=1000
MAX_ORDER_VALUE_1=5000
STOP_LOSS_PERCENTAGE_1=0.01
TARGET_PRICE_PERCENTAGE_1=0.015
RISK_ON_CAPITAL_1=1.0
```

### Account 2 (Optional)
```bash
# Dhan.co API Configuration - Account 2
DHAN_ACCESS_TOKEN_2=your_second_access_token
DHAN_CLIENT_ID_2=your_second_client_id
AVAILABLE_FUNDS_2=15000
LEVERAGE_2=1.5
MAX_POSITION_SIZE_2=0.08
MIN_ORDER_VALUE_2=1000
MAX_ORDER_VALUE_2=4000
STOP_LOSS_PERCENTAGE_2=0.012
TARGET_PRICE_PERCENTAGE_2=0.018
RISK_ON_CAPITAL_2=1.2
```

### Account 3-5 (Optional)
Follow the same pattern with `_3`, `_4`, and `_5` suffixes.

## Configuration Parameters

### Required Parameters
- `DHAN_ACCESS_TOKEN_X`: Your Dhan.co API access token
- `DHAN_CLIENT_ID_X`: Your Dhan.co client ID

### Fund Management Parameters
- `AVAILABLE_FUNDS_X`: Total available funds for trading (in INR)
- `LEVERAGE_X`: Leverage multiplier (e.g., 2 for 2x leverage)
- `MAX_POSITION_SIZE_X`: Maximum percentage of funds per position (0.1 = 10%)
- `MIN_ORDER_VALUE_X`: Minimum order value (in INR)
- `MAX_ORDER_VALUE_X`: Maximum order value per order (in INR)
- `STOP_LOSS_PERCENTAGE_X`: Stop loss percentage (0.01 = 1%)
- `TARGET_PRICE_PERCENTAGE_X`: Target price percentage (0.015 = 1.5%)
- `RISK_ON_CAPITAL_X`: Risk on Capital multiplier for quantity (1.0 = 100%)

## How It Works

### 1. Order Placement
When a TradingView alert is received:
1. The system loads all active account configurations
2. Calculates position size for each account based on their individual settings
3. Places orders on all accounts that can fulfill the order requirements
4. Tracks each order with the corresponding account information

### 2. Position Sizing
Each account calculates its position size independently:
- **Base Quantity**: `availableFunds / stockPrice`
- **Final Quantity**: `baseQuantity * riskOnCapital`
- **Order Value**: `finalQuantity * stockPrice`
- **Leveraged Value**: `orderValue / leverage`

### 3. Order Tracking
All orders are tracked with:
- Account ID and Client ID
- Individual position calculations
- Account-specific risk parameters
- Success/failure status per account

## UI Features

### Account Configuration Card
- Displays all configured accounts
- Shows account status (Active/Inactive)
- Displays fund allocation and leverage settings
- Provides configuration validation

### Orders Table
- Shows DHAN_CLIENT_ID for each order
- Displays Account ID for easy identification
- Groups orders by account for better tracking

## API Endpoints

### Get Account Configuration
```
GET /api/account-config?includeValidation=true&includeSummary=true
```

### Place Order (Multi-Account)
```
POST /api/place-order
{
  "alert": { ... },
  "useMultiAccount": true,
  "useAutoPositionSizing": true
}
```

## Example Scenarios

### Scenario 1: Conservative + Aggressive Accounts
- **Account 1**: ₹20,000 funds, 2x leverage, 10% max position
- **Account 2**: ₹30,000 funds, 3x leverage, 15% max position

For a ₹100 stock:
- Account 1: 200 shares (₹20,000 value, ₹10,000 leveraged)
- Account 2: 450 shares (₹45,000 value, ₹15,000 leveraged)

### Scenario 2: Different Risk Profiles
- **Account 1**: 1% stop loss, 1.5% target
- **Account 2**: 2% stop loss, 3% target

Each account will have different stop-loss and target prices based on their risk settings.

## Backward Compatibility

The system maintains backward compatibility with the original single-account configuration:
- If no numbered accounts are configured, it falls back to legacy variables
- Legacy API endpoints continue to work
- Existing orders are preserved

## Testing

Run the test script to verify your configuration:
```bash
node scripts/test-multi-account.js
```

## Troubleshooting

### Common Issues

1. **No accounts configured**
   - Ensure at least `DHAN_ACCESS_TOKEN_1` and `DHAN_CLIENT_ID_1` are set

2. **Orders not placing on all accounts**
   - Check if accounts have sufficient funds
   - Verify leverage and position size settings
   - Ensure access tokens are valid

3. **Configuration validation errors**
   - Check parameter ranges (leverage 1-10x, percentages 0-100%)
   - Ensure min order value < max order value
   - Verify all required parameters are set

### Validation Rules
- Available funds > 0
- Leverage between 1x and 10x
- Max position size between 0% and 100%
- Min order value > 0
- Max order value > min order value
- Stop loss between 0% and 50%
- Target price between 0% and 100%
- Risk on capital between 0% and 500%

## Security Considerations

- Store access tokens securely
- Use environment variables, not hardcoded values
- Regularly rotate API tokens
- Monitor account activity for unauthorized access
- Implement proper access controls for the webhook endpoint

## Performance Notes

- Orders are placed in parallel across all accounts
- Position calculations are optimized for multiple accounts
- Memory usage scales with the number of active accounts
- Consider rate limits when using multiple accounts simultaneously
