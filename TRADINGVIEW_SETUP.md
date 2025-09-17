# TradingView Alert Configuration Guide

This guide will help you set up TradingView alerts to send data to your webhook endpoint.

## Step 1: Create an Alert in TradingView

1. **Open TradingView Chart**
   - Go to [TradingView.com](https://tradingview.com)
   - Open the chart for your desired symbol

2. **Access Alert Creation**
   - Click the "Alert" button (bell icon) in the top toolbar
   - Or use the keyboard shortcut `Ctrl+Alt+A` (Windows) / `Cmd+Option+A` (Mac)

3. **Configure Alert Conditions**
   - Set your technical analysis conditions
   - Choose the timeframe
   - Select the symbol(s) to monitor

## Step 2: Configure Alert Message

In the "Message" field, use one of these JSON templates:

### Basic Template
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "My Strategy",
  "timestamp": "{{time}}",
  "webhook_secret": "your_secure_secret_here"
}
```

**Note:** The `price` field can be sent as either a number (`{{close}}`) or a string (`"{{close}}"`). The webhook will automatically convert string prices to numbers.

### Advanced Template with Custom Data
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "{{strategy.order.action}}",
  "strategy": "{{strategy.order.contracts}}",
  "timestamp": "{{time}}",
  "custom_note": "Volume: {{volume}}, RSI: {{rsi}}, MACD: {{macd}}",
  "webhook_secret": "your_secure_secret_here"
}
```

### Pine Script Strategy Template
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "{{strategy.order.action}}",
  "strategy": "{{strategy.order.comment}}",
  "timestamp": "{{time}}",
  "custom_note": "Entry: {{strategy.order.price}}, Stop: {{strategy.order.stop_price}}",
  "webhook_secret": "your_secure_secret_here"
}
```

## Step 3: Configure Webhook Settings

1. **Webhook URL**
   - Enter your webhook endpoint: `https://your-domain.com/api/tradingview-alert`
   - For local testing: `http://localhost:3000/api/tradingview-alert`

2. **HTTP Method**
   - Select: `POST`

3. **Content Type**
   - Select: `application/json`

4. **Headers** (Optional)
   - You can add custom headers if needed

## Step 4: Available TradingView Variables

TradingView provides these variables for use in your alert messages:

### Price Data
- `{{ticker}}` - Symbol name (e.g., "AAPL")
- `{{close}}` - Close price
- `{{open}}` - Open price
- `{{high}}` - High price
- `{{low}}` - Low price
- `{{volume}}` - Trading volume

### Time Data
- `{{time}}` - Timestamp in ISO format
- `{{time_today}}` - Today's date
- `{{time_yesterday}}` - Yesterday's date

### Technical Indicators
- `{{rsi}}` - RSI value
- `{{macd}}` - MACD value
- `{{sma_20}}` - 20-period SMA
- `{{ema_12}}` - 12-period EMA
- `{{bb_upper}}` - Bollinger Bands upper
- `{{bb_lower}}` - Bollinger Bands lower

### Strategy Variables (Pine Script)
- `{{strategy.order.action}}` - Order action (BUY/SELL)
- `{{strategy.order.contracts}}` - Number of contracts
- `{{strategy.order.price}}` - Order price
- `{{strategy.order.stop_price}}` - Stop loss price
- `{{strategy.order.comment}}` - Order comment

## Step 5: Test Your Alert

1. **Save the Alert**
   - Click "Create" to save your alert
   - The alert will be active immediately

2. **Test with Manual Trigger**
   - You can manually trigger the alert to test
   - Check your webhook endpoint logs

3. **Verify in Dashboard**
   - Open your application dashboard
   - Check if the alert appears in the UI

## Common Alert Examples

### RSI Oversold Alert
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "RSI Oversold",
  "timestamp": "{{time}}",
  "custom_note": "RSI: {{rsi}} - Oversold condition",
  "webhook_secret": "your_secure_secret_here"
}
```

### Moving Average Crossover
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "{{strategy.order.action}}",
  "strategy": "MA Crossover",
  "timestamp": "{{time}}",
  "custom_note": "SMA20: {{sma_20}}, EMA12: {{ema_12}}",
  "webhook_secret": "your_secure_secret_here"
}
```

### Volume Breakout
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "Volume Breakout",
  "timestamp": "{{time}}",
  "custom_note": "Volume: {{volume}} - Above average",
  "webhook_secret": "your_secure_secret_here"
}
```

## Troubleshooting

### Alert Not Triggering
1. Check alert conditions are met
2. Verify symbol and timeframe
3. Ensure alert is active (not paused)

### Webhook Not Receiving Data
1. Verify webhook URL is correct
2. Check if your server is accessible
3. Test with curl or Postman
4. Check server logs for errors

### Invalid JSON Format
1. Ensure all quotes are properly escaped
2. Check for missing commas
3. Validate JSON syntax
4. Test with a JSON validator

### Authentication Errors
1. Verify webhook secret matches
2. Check environment variables
3. Ensure secret is included in payload

## Best Practices

1. **Use Descriptive Strategy Names**
   - Make it easy to identify different strategies
   - Include version numbers for strategy updates

2. **Include Relevant Data**
   - Add technical indicator values
   - Include volume and price context
   - Add custom notes for context

3. **Test Thoroughly**
   - Test with different market conditions
   - Verify all data fields are populated
   - Check error handling

4. **Monitor Performance**
   - Watch for rate limiting
   - Monitor webhook response times
   - Check for failed deliveries

5. **Security**
   - Use strong webhook secrets
   - Rotate secrets periodically
   - Monitor for unauthorized access

## Advanced Configuration

### Multiple Alerts for Same Strategy
You can create multiple alerts for the same strategy with different conditions:

```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "RSI Strategy - Entry",
  "timestamp": "{{time}}",
  "custom_note": "RSI Entry: {{rsi}}",
  "webhook_secret": "your_secure_secret_here"
}
```

```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "SELL",
  "strategy": "RSI Strategy - Exit",
  "timestamp": "{{time}}",
  "custom_note": "RSI Exit: {{rsi}}",
  "webhook_secret": "your_secure_secret_here"
}
```

### Conditional Signals
Use Pine Script to create conditional signals:

```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "{{strategy.order.comment}}",
  "timestamp": "{{time}}",
  "custom_note": "Condition: {{strategy.order.alert_message}}",
  "webhook_secret": "your_secure_secret_here"
}
```

This setup will help you create comprehensive trading alerts that integrate seamlessly with your webhook application.



#Testing with Your Secret
#Update the Test Script
#You can test with your custom secret by running:
#node scripts/test-webhook.js http://localhost:5001/api/tradingview-alert your_custom_secret_here


#Test with curl
curl -X POST http://localhost:5001/api/tradingview-alert \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "price": 175.23,
    "signal": "BUY",
    "strategy": "RSI Strategy",
    "timestamp": "2025-01-17T10:30:00Z",
    "custom_note": "Test alert",
    "webhook_secret": "your_custom_secret_here"
  }'

  #TradingView Alert Configuration
  {
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "My Strategy",
  "timestamp": "{{time}}",
  "custom_note": "Custom alert message",
  "webhook_secret": "your_custom_secret_here"
}

#✅ Quick Setup Commands
# 1. Create the environment file
echo "TRADINGVIEW_WEBHOOK_SECRET=my_super_secure_secret_123" > .env.local

# 2. Restart the server
npm run dev

# 3. Test with your new secret
node scripts/test-webhook.js http://localhost:5001/api/tradingview-alert my_super_secure_secret_123

