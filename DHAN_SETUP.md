# Dhan.co API Integration Setup

This guide will help you set up automatic order placement using Dhan.co API when TradingView alerts are received.

## Prerequisites

1. **Dhan.co Trading Account**: You need an active trading account with Dhan.co
2. **API Access**: Ensure your Dhan.co account has API access enabled
3. **Environment Variables**: Configure the required environment variables

## Step 1: Get Dhan.co API Credentials

### 1.1 Access Token
1. Log in to your Dhan.co account
2. Navigate to API settings or developer section
3. Generate or copy your `access-token`
4. This token is used for authentication with Dhan.co API

### 1.2 Client ID
1. In your Dhan.co account, find your `dhanClientId`
2. This is typically your account identifier
3. Copy this value for the environment variable

## Step 2: Configure Environment Variables

Create or update your `.env.local` file with the following variables:

```bash
# Dhan.co API Configuration
DHAN_ACCESS_TOKEN=your_actual_access_token_here
DHAN_CLIENT_ID=your_actual_client_id_here

# Auto Order Placement (Optional)
AUTO_PLACE_ORDER=true
DEFAULT_ORDER_QUANTITY=1
DHAN_EXCHANGE_SEGMENT=NSE_EQ
DHAN_PRODUCT_TYPE=CNC
DHAN_ORDER_TYPE=LIMIT
```

### Environment Variables Explained:

- **`DHAN_ACCESS_TOKEN`**: Your Dhan.co API access token (required)
- **`DHAN_CLIENT_ID`**: Your Dhan.co client ID (required)
- **`AUTO_PLACE_ORDER`**: Set to `true` to automatically place orders on BUY signals
- **`DEFAULT_ORDER_QUANTITY`**: Default number of shares to buy (default: 1)
- **`DHAN_EXCHANGE_SEGMENT`**: Exchange segment (NSE_EQ, BSE_EQ, etc.)
- **`DHAN_PRODUCT_TYPE`**: Product type (CNC, MTF, MARGIN, INTRADAY)
- **`DHAN_ORDER_TYPE`**: Order type (LIMIT, MARKET, SL, SL_M)

## Step 3: Order Configuration Options

### Exchange Segments
- **`NSE_EQ`**: NSE Equity
- **`BSE_EQ`**: BSE Equity
- **`NSE_FO`**: NSE Futures & Options
- **`BSE_FO`**: BSE Futures & Options
- **`MCX`**: Multi Commodity Exchange
- **`NCDEX`**: National Commodity & Derivatives Exchange

### Product Types
- **`CNC`**: Cash and Carry (delivery)
- **`MIS`**: Intraday
- **`NRML`**: Normal (carry forward)

### Order Types
- **`LIMIT`**: Limit order (specify price)
- **`MARKET`**: Market order (current market price)
- **`SL`**: Stop Loss order
- **`SL_M`**: Stop Loss Market order

## Step 4: Testing the Integration

### 4.1 Test with Manual Order Placement
1. Start your Next.js application
2. Send a test TradingView alert with `"signal": "BUY"`
3. Check the orders section in the UI
4. Verify the order was placed successfully

### 4.2 Test API Endpoint Directly
You can test the order placement API directly:

```bash
curl -X POST http://localhost:3000/api/place-order \
  -H "Content-Type: application/json" \
  -d '{
    "alert": {
      "ticker": "RELIANCE",
      "price": 2500.50,
      "signal": "BUY",
      "strategy": "Test Strategy",
      "timestamp": "2025-01-17T10:00:00Z"
    },
    "quantity": 1,
    "orderConfig": {
      "exchangeSegment": "NSE_EQ",
      "productType": "CNC",
      "orderType": "LIMIT"
    }
  }'
```

## Step 5: Monitoring and Troubleshooting

### 5.1 Check Order Status
- Use the "Refresh Orders" button in the UI
- Check the orders table for status updates
- Monitor the console logs for API responses

### 5.2 Common Issues

#### Authentication Errors
- Verify your `DHAN_ACCESS_TOKEN` is correct
- Ensure the token hasn't expired
- Check if your account has API access enabled

#### Order Placement Failures
- Verify your `DHAN_CLIENT_ID` is correct
- Check if the ticker symbol is valid for the exchange
- Ensure you have sufficient funds in your account
- Verify the exchange segment matches the ticker

#### Invalid Ticker Symbols
- Some tickers may need special formatting
- Check Dhan.co documentation for ticker symbol requirements
- You may need to modify the `mapTickerToSecurityId` function in `src/lib/dhanApi.ts`

## Step 6: Security Considerations

### 6.1 Environment Variables
- Never commit your `.env.local` file to version control
- Use strong, unique access tokens
- Regularly rotate your API credentials

### 6.2 Order Limits
- Set reasonable default quantities
- Consider implementing order size limits
- Monitor your account balance regularly

### 6.3 Error Handling
- The system logs all order placement attempts
- Failed orders are tracked and displayed in the UI
- Webhook failures don't affect order placement

## Step 7: Advanced Configuration

### 7.1 Custom Order Logic
You can modify the order placement logic in `src/lib/dhanApi.ts`:

```typescript
// Custom ticker mapping
function mapTickerToSecurityId(ticker: string): string {
  // Add your custom mapping logic here
  const customMappings: Record<string, string> = {
    'RELIANCE': 'RELIANCE',
    'TCS': 'TCS',
    // Add more mappings as needed
  };
  
  return customMappings[ticker] || ticker.toUpperCase();
}
```

### 7.2 Conditional Order Placement
Modify the webhook logic to place orders based on specific conditions:

```typescript
// In src/app/api/tradingview-alert/route.ts
if (autoPlaceOrder && 
    validation.alert!.signal === 'BUY' && 
    validation.alert!.price > 100 && // Only for stocks above ₹100
    validation.alert!.ticker !== 'EXCLUDE_TICKER') {
  // Place order logic
}
```

## Step 8: Production Deployment

### 8.1 Environment Variables
- Set all required environment variables in your deployment platform
- Use secure secret management for sensitive credentials
- Test the integration in a staging environment first

### 8.2 Monitoring
- Set up logging and monitoring for order placement
- Monitor your Dhan.co account for unexpected orders
- Set up alerts for failed order placements

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your Dhan.co API credentials
3. Test with a small quantity first
4. Contact Dhan.co support for API-related issues

## Disclaimer

⚠️ **Important**: This integration automatically places real orders with real money. Always test thoroughly in a safe environment before using in production. The authors are not responsible for any financial losses.
