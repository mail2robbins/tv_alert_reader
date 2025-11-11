# LIMIT Buffer Percentage - Quick Setup Guide

## What is it?
A buffer percentage added to LIMIT order prices to improve execution rates and reduce failed orders.

## Quick Setup

### Step 1: Run Database Migration
```bash
psql -U your_username -d your_database -f scripts/add-limit-buffer-percentage-migration.sql
```

### Step 2: Configure in UI
1. Go to **Account Settings**
2. Click **Edit** on your account
3. Set **Order Type** to `LIMIT`
4. Set **LIMIT Buffer %** (e.g., `0.01` for 0.01%)
5. Click **Save**

### Step 3: Test
Place a manual order or send an alert and check the logs for:
```
Applied LIMIT buffer for BUY order: {
  originalPrice: 100.00,
  bufferPercentage: 0.01,
  calculatedPrice: 100.01,
  difference: 0.01
}
```

## How It Works

### BUY Orders
```
Alert Price: ₹100.00
Buffer: 0.01%
LIMIT Price Sent to DHAN: ₹100.01 (price + buffer)
```

### SELL Orders
```
Alert Price: ₹100.00
Buffer: 0.01%
LIMIT Price Sent to DHAN: ₹99.99 (price - buffer)
```

## Environment Variable (Optional)

Add to `.env.local`:
```env
# For account 1
LIMIT_BUFFER_PERCENTAGE_1=0.01

# For account 2
LIMIT_BUFFER_PERCENTAGE_2=0.02

# Legacy single account
LIMIT_BUFFER_PERCENTAGE=0.01
```

## Recommended Values

- **Conservative**: 0.01% (₹0.01 per ₹100)
- **Moderate**: 0.05% (₹0.05 per ₹100)
- **Aggressive**: 0.10% (₹0.10 per ₹100)

Start with conservative values and adjust based on execution rates.

## Troubleshooting

**Orders still not executing?**
- Increase buffer percentage slightly
- Check if Order Type is set to LIMIT
- Verify buffer is being applied in logs

**Too much slippage?**
- Reduce buffer percentage
- Consider market conditions

**Buffer not applying?**
- Ensure database migration was run
- Restart the application
- Check account settings are saved correctly
