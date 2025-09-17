# TradingView Alert Reader

A Next.js application that receives TradingView alerts via webhook and provides a beautiful UI to view, filter, and analyze them.

## Features

- 🔗 **Webhook Endpoint**: Secure API endpoint to receive TradingView alerts
- 📊 **Real-time Dashboard**: Beautiful UI with statistics and alert visualization
- 📅 **Date Filtering**: Filter alerts by date range with quick presets
- 🔍 **Advanced Filters**: Filter by ticker, signal type, and strategy
- 📝 **File Logging**: Persistent storage of alerts in log files
- 🔒 **Security**: Webhook authentication and rate limiting
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd tv_alert_reader

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

### 2. Environment Configuration

Edit `.env.local` with your configuration:

```env
# TradingView Webhook Configuration
TRADINGVIEW_WEBHOOK_SECRET=your_secure_secret_here

# File Storage Configuration (optional)
ALERTS_LOG_FILE=./data/alerts.log
ERROR_LOG_FILE=./data/errors.log

# Rate Limiting Configuration (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`.

## TradingView Alert Configuration

### 1. Create an Alert in TradingView

1. Go to your TradingView chart
2. Click the "Alert" button (bell icon)
3. Set your conditions for the alert
4. In the "Message" field, use this JSON template:

```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "My Strategy",
  "timestamp": "{{time}}",
  "custom_note": "Custom alert message",
  "webhook_secret": "your_secure_secret_here"
}
```

### 2. Configure Webhook URL

- **Webhook URL**: `https://your-domain.com/api/tradingview-alert`
- **Method**: POST
- **Content Type**: application/json

### 3. Alert Message Templates

#### Basic Buy Signal
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "BUY",
  "strategy": "RSI Strategy",
  "timestamp": "{{time}}",
  "webhook_secret": "your_secure_secret_here"
}
```

#### Advanced Alert with Custom Note
```json
{
  "ticker": "{{ticker}}",
  "price": {{close}},
  "signal": "{{strategy.order.action}}",
  "strategy": "{{strategy.order.contracts}}",
  "timestamp": "{{time}}",
  "custom_note": "Volume: {{volume}}, RSI: {{rsi}}",
  "webhook_secret": "your_secure_secret_here"
}
```

## API Endpoints

### POST /api/tradingview-alert

Receives TradingView alerts via webhook.

**Request Body:**
```json
{
  "ticker": "AAPL",
  "price": 175.23,
  "signal": "BUY",
  "strategy": "RSI Strategy",
  "timestamp": "2025-01-17T10:30:00Z",
  "custom_note": "RSI oversold",
  "webhook_secret": "your_secure_secret_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert received and logged successfully",
  "data": {
    "alertId": "1705482600000-abc123def",
    "processingTime": 45
  }
}
```

### GET /api/alerts

Retrieves filtered alerts.

**Query Parameters:**
- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format
- `ticker` (optional): Filter by ticker symbol
- `signal` (optional): Filter by signal type (BUY/SELL/HOLD)
- `strategy` (optional): Filter by strategy name
- `includeStats` (optional): Include statistics in response
- `limit` (optional): Number of alerts to return (default: 100, max: 1000)
- `offset` (optional): Number of alerts to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [...],
    "pagination": {
      "total": 150,
      "limit": 100,
      "offset": 0,
      "hasMore": true
    },
    "stats": {
      "totalAlerts": 150,
      "buySignals": 75,
      "sellSignals": 60,
      "uniqueTickers": 25,
      "strategies": ["RSI Strategy", "MACD Strategy"]
    }
  }
}
```

### GET /api/stats

Retrieves alert statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAlerts": 150,
    "buySignals": 75,
    "sellSignals": 60,
    "uniqueTickers": 25,
    "strategies": ["RSI Strategy", "MACD Strategy"]
  }
}
```

## Security Features

### Webhook Authentication
- All webhook requests must include a valid `webhook_secret`
- Configure the secret in your environment variables
- Requests without valid secrets are rejected with 401 status

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Returns 429 status when limit exceeded

### Input Validation
- All alert data is validated before processing
- Malformed requests are rejected with 400 status
- Comprehensive error logging for debugging

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tradingview-alert/route.ts  # Webhook endpoint
│   │   ├── alerts/route.ts             # Alerts retrieval API
│   │   └── stats/route.ts              # Statistics API
│   ├── globals.css                     # Global styles
│   └── page.tsx                        # Main dashboard page
├── components/
│   ├── AlertTable.tsx                  # Alert display table
│   ├── AlertFilters.tsx                # Additional filters
│   ├── DateFilter.tsx                  # Date range picker
│   └── StatsCard.tsx                   # Statistics cards
├── lib/
│   ├── fileLogger.ts                   # File logging utilities
│   └── validation.ts                   # Input validation
└── types/
    └── alert.ts                        # TypeScript interfaces
```

## Data Storage

Alerts are stored in log files in the `data/` directory:
- `alerts.log`: All received alerts in JSON format
- `errors.log`: Error logs for debugging

Each log entry follows this format:
```
[2025-01-17T10:30:00.000Z] {"id":"1705482600000-abc123def","timestamp":"2025-01-17T10:30:00.000Z","data":{...}}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**Note**: Vercel has ephemeral file system. For production, consider using a database or external storage.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Traditional VPS

1. Install Node.js 18+
2. Clone repository
3. Install dependencies: `npm ci --production`
4. Build application: `npm run build`
5. Use PM2 or similar for process management

## Testing

### Test Webhook with curl

```bash
curl -X POST http://localhost:3000/api/tradingview-alert \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "price": 175.23,
    "signal": "BUY",
    "strategy": "Test Strategy",
    "timestamp": "2025-01-17T10:30:00Z",
    "webhook_secret": "your_secure_secret_here"
  }'
```

### Test Alerts API

```bash
curl "http://localhost:3000/api/alerts?includeStats=true"
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving alerts**
   - Check TradingView alert configuration
   - Verify webhook URL is accessible
   - Check webhook secret matches

2. **Alerts not displaying**
   - Check browser console for errors
   - Verify API endpoints are working
   - Check log files in `data/` directory

3. **Rate limiting issues**
   - Adjust rate limit settings in environment
   - Check for multiple TradingView alerts hitting same endpoint

### Log Files

Check these files for debugging:
- `data/alerts.log`: All received alerts
- `data/errors.log`: Error logs
- Browser console: Frontend errors
- Server logs: API errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review log files
3. Open an issue on GitHub
4. Check TradingView documentation for alert configuration