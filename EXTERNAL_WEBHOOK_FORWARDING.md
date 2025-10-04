# External Webhook Forwarding

This document describes the simple external webhook forwarding feature that allows TradingView alerts to be forwarded to up to 10 external webhook URLs before processing them for Dhan order placement.

## Overview

The external webhook forwarding system enables you to:
- Forward TradingView alerts to multiple external webhook URLs (Discord, Slack, Telegram, custom APIs, etc.)
- Configure up to 10 different webhook URLs using environment variables
- Forward the original JSON payload from TradingView
- Process forwards in parallel for better performance
- Monitor forwarding success/failure rates

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# External Webhook Forwarding (Optional)
# Configure up to 10 external webhook URLs to forward TradingView alerts to
# The original JSON payload from TradingView will be forwarded to these URLs
EXTERNAL_WEBHOOK_URL_1=https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK_URL
EXTERNAL_WEBHOOK_URL_2=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL
EXTERNAL_WEBHOOK_URL_3=https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage
EXTERNAL_WEBHOOK_URL_4=https://your-custom-api.com/webhook
# EXTERNAL_WEBHOOK_URL_5=
# EXTERNAL_WEBHOOK_URL_6=
# EXTERNAL_WEBHOOK_URL_7=
# EXTERNAL_WEBHOOK_URL_8=
# EXTERNAL_WEBHOOK_URL_9=
# EXTERNAL_WEBHOOK_URL_10=
```

### Supported Environment Variables

- `EXTERNAL_WEBHOOK_URL_1` through `EXTERNAL_WEBHOOK_URL_10`: Webhook URLs to forward alerts to
- Only configured URLs (non-empty) will be used for forwarding
- All forwards use POST method with JSON content type

## How It Works

1. **TradingView Alert Received**
   - Alert is validated and logged
   - Original payload is preserved

2. **External Webhook Forwarding** (NEW)
   - System checks for configured external webhook URLs
   - Forwards original JSON payload to all configured URLs in parallel
   - Each webhook receives the exact same payload that TradingView sent

3. **Order Processing** (EXISTING)
   - If auto-place order is enabled and signal is BUY
   - Order placement proceeds as before

## Payload Format

The original JSON payload from TradingView is forwarded as-is to all external webhooks. For example:

```json
{
  "ticker": "RELIANCE",
  "price": 2450.50,
  "signal": "BUY",
  "strategy": "My Strategy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "custom_note": "Volume: 1000000, RSI: 65",
  "webhook_secret": "your_secret_here"
}
```

## Common Use Cases

### 1. Discord Webhook
```bash
EXTERNAL_WEBHOOK_URL_1=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 2. Slack Webhook
```bash
EXTERNAL_WEBHOOK_URL_2=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL
```

### 3. Telegram Bot
```bash
EXTERNAL_WEBHOOK_URL_3=https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/sendMessage
```

### 4. Custom API Endpoint
```bash
EXTERNAL_WEBHOOK_URL_4=https://your-api.com/webhooks/tradingview-alerts
```

## Response Format

The webhook response includes information about external webhook forwarding:

```json
{
  "success": true,
  "message": "Alert received and logged successfully",
  "data": {
    "alertId": "alert_1234567890_abc123",
    "processingTime": 150,
    "orderPlaced": true,
    "orders": [...],
    "totalOrders": 2,
    "successfulOrders": 2,
    "failedOrders": 0,
    "externalWebhooks": {
      "totalUrls": 3,
      "successfulForwards": 3,
      "failedForwards": 0,
      "results": [
        {
          "url": "https://discord.com/api/webhooks/...",
          "success": true,
          "statusCode": 200,
          "responseTime": 45
        },
        {
          "url": "https://hooks.slack.com/services/...",
          "success": true,
          "statusCode": 200,
          "responseTime": 32
        },
        {
          "url": "https://api.telegram.org/bot...",
          "success": true,
          "statusCode": 200,
          "responseTime": 28
        }
      ]
    }
  }
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Network Errors**: Logged but don't affect order processing
2. **Timeout Errors**: 5-second timeout per webhook
3. **Authentication Errors**: Logged with response details
4. **Invalid URLs**: Skipped during processing

## Performance

- **Parallel Processing**: All webhooks are called simultaneously
- **Non-blocking**: Webhook failures don't affect order processing
- **Timeout Protection**: 5-second timeout prevents hanging requests
- **Efficient**: Only configured URLs are processed

## Monitoring

The system provides detailed monitoring information:

- Total number of webhook URLs configured
- Success/failure rates for each webhook
- Response times for each request
- Detailed error messages for failed forwards

## Security Considerations

1. **HTTPS Only**: All webhook URLs should use HTTPS
2. **Webhook Secrets**: Include in the payload for authentication
3. **Rate Limiting**: Built-in rate limiting for the main webhook
4. **Input Validation**: All inputs are validated before processing

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Alerts**
   - Check if URL is correctly configured in environment variables
   - Verify URL is accessible and accepts POST requests
   - Check logs for error messages

2. **Timeout Errors**
   - Check network connectivity to webhook URL
   - Verify webhook responds quickly
   - Consider webhook server performance

3. **Authentication Errors**
   - Verify webhook secret is included in payload
   - Check if webhook expects specific authentication headers
   - Ensure webhook URL includes necessary tokens

4. **Payload Format Issues**
   - External webhooks receive the original TradingView payload
   - Check if webhook expects specific field names or format
   - Verify webhook can handle the JSON structure

### Logs

Check the application logs for detailed information:
- External webhook forwarding errors are logged
- Network timeouts and failures are tracked
- Success/failure rates are monitored

## Example Setup

1. **Add to .env file:**
```bash
EXTERNAL_WEBHOOK_URL_1=https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK_URL
EXTERNAL_WEBHOOK_URL_2=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL
```

2. **Restart your application**

3. **Test with a TradingView alert**

4. **Check logs for forwarding results**

## Benefits

- **Simple Configuration**: Just add URLs to environment variables
- **No UI Required**: No complex management interface needed
- **Reliable**: Parallel processing with error handling
- **Flexible**: Works with any webhook that accepts JSON POST requests
- **Non-intrusive**: Doesn't affect existing order processing
- **Scalable**: Supports up to 10 webhook URLs

This simple approach provides all the functionality you need for forwarding TradingView alerts to external applications without the complexity of a full management interface.
