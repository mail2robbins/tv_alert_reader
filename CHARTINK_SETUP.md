# ChartInk Alert Integration

This document explains how to configure and use ChartInk alerts with the TV Alert Reader application.

## Overview

The application now supports both TradingView and ChartInk alerts. You can configure which alert source to use via the `ALERT_SOURCE` environment variable.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Alert Source Configuration
# Set to 'TradingView' or 'ChartInk' to specify which alert source to process
ALERT_SOURCE=ChartInk

# TradingView Webhook Configuration (only needed for TradingView alerts)
TRADINGVIEW_WEBHOOK_SECRET=your_webhook_secret_here
```

### Alert Source Options

- `ALERT_SOURCE=TradingView` - Process TradingView alerts (default)
- `ALERT_SOURCE=ChartInk` - Process ChartInk alerts

## ChartInk Alert Format

ChartInk sends alerts in the following JSON format:

```json
{
    "stocks": "SEPOWER,ASTEC,EDUCOMP,KSERASERA,IOLCP,GUJAPOLLO,EMCO",
    "trigger_prices": "3.75,541.8,2.1,0.2,329.6,166.8,1.25",
    "triggered_at": "2:34 pm",
    "scan_name": "Short term breakouts",
    "scan_url": "short-term-breakouts",
    "alert_name": "Alert for Short term breakouts",
    "webhook_url": "http://your-web-hook-url.com"
}
```

### Field Descriptions

- `stocks`: Comma-separated list of stock tickers
- `trigger_prices`: Comma-separated list of trigger prices (must match the number of stocks)
- `triggered_at`: Time when the alert was triggered (e.g., "2:34 pm")
- `scan_name`: Name of the scan that triggered the alert
- `scan_url`: URL identifier for the scan
- `alert_name`: Name of the alert
- `webhook_url`: The webhook URL (not used by the application)

## How It Works

1. **Alert Processing**: When a ChartInk alert is received, the application:
   - Validates the alert format
   - Parses the comma-separated stocks and prices
   - Creates individual alerts for each stock
   - Converts ChartInk time format to ISO timestamp

2. **Order Placement**: If `AUTO_PLACE_ORDER=true`, the application will:
   - Place BUY orders for each stock in the alert
   - Use the same multi-account fund management system
   - Apply the same risk management rules

3. **External Webhook Forwarding**: The original ChartInk JSON payload is forwarded to all configured external webhook URLs without modification.

## Security

- **No Authentication**: ChartInk alerts do not include webhook secrets, so authentication is skipped when `ALERT_SOURCE=ChartInk`
- **Rate Limiting**: Still applies to prevent abuse
- **Validation**: All ChartInk alerts are validated for proper format and data integrity

## Testing

Use the provided test script to verify ChartInk integration:

```bash
# Set ALERT_SOURCE=ChartInk in your .env file first
node scripts/test-chartink-alert.js
```

## Switching Between Alert Sources

To switch between TradingView and ChartInk:

1. Update the `ALERT_SOURCE` environment variable
2. Restart the application
3. Configure the appropriate webhook URL in your alert source

## Limitations

- ChartInk alerts are always treated as BUY signals
- Time parsing is basic and may need adjustment based on ChartInk's actual time format
- No webhook secret validation for ChartInk alerts

## Troubleshooting

### Common Issues

1. **"Invalid alert payload"**: Check that the ChartInk alert format matches the expected structure
2. **"Number of stocks must match number of trigger prices"**: Ensure both fields have the same number of comma-separated values
3. **"Invalid price"**: Verify all prices are valid positive numbers

### Debugging

Enable detailed logging by checking the console output and log files:
- `data/alerts.log` - All processed alerts
- `data/errors.log` - Any errors during processing

## Example ChartInk Webhook Configuration

In ChartInk, configure your webhook URL as:
```
https://your-domain.com/api/tradingview-alert
```

The application will automatically detect and process ChartInk alerts when `ALERT_SOURCE=ChartInk` is set.
