# Serverless Deployment Guide

This guide explains how to deploy the TradingView Alert Reader to serverless platforms like Vercel, Netlify, or AWS Lambda.

## 🚀 **Serverless Compatibility**

The application has been updated to work seamlessly in serverless environments with the following features:

### **✅ Automatic Environment Detection**
- Detects serverless platforms (Vercel, AWS Lambda, Netlify)
- Automatically switches between file storage and memory storage
- Graceful fallback for read-only file systems

### **✅ Memory Storage for Serverless**
- In-memory storage for alerts (up to 1000 alerts)
- Automatic cleanup to prevent memory issues
- Full filtering and statistics support

### **✅ Console Logging**
- All alerts and errors logged to console
- Compatible with serverless logging systems
- No file system dependencies

## 📋 **Deployment Options**

### **1. Vercel (Recommended)**

#### **Deploy via Vercel CLI:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### **Deploy via GitHub:**
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

#### **Environment Variables in Vercel:**
```
TRADINGVIEW_WEBHOOK_SECRET=your_secure_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **2. Netlify**

#### **Deploy via Netlify CLI:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

#### **Environment Variables in Netlify:**
```
TRADINGVIEW_WEBHOOK_SECRET=your_secure_secret_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **3. AWS Lambda (via Serverless Framework)**

#### **Install Serverless Framework:**
```bash
npm install -g serverless
```

#### **Create serverless.yml:**
```yaml
service: tradingview-alert-reader

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    TRADINGVIEW_WEBHOOK_SECRET: ${env:TRADINGVIEW_WEBHOOK_SECRET}
    RATE_LIMIT_WINDOW_MS: 900000
    RATE_LIMIT_MAX_REQUESTS: 100

functions:
  app:
    handler: .next/server/pages/api/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-nextjs-plugin
```

#### **Deploy:**
```bash
serverless deploy
```

## 🔧 **Serverless-Specific Features**

### **Memory Storage**
- **Capacity**: Up to 1000 alerts stored in memory
- **Persistence**: Data persists during function execution
- **Cleanup**: Automatic cleanup of old alerts
- **Performance**: Faster than file I/O operations

### **Console Logging**
- **Alerts**: All received alerts logged to console
- **Errors**: All errors logged to console
- **Debugging**: Easy to debug in serverless logs
- **Monitoring**: Compatible with cloud monitoring tools

### **Environment Detection**
The application automatically detects serverless environments:
```typescript
const isServerless = process.env.VERCEL || 
                    process.env.AWS_LAMBDA_FUNCTION_NAME || 
                    process.env.NETLIFY;
```

## 📊 **Limitations in Serverless**

### **Data Persistence**
- **Memory Storage**: Data is lost when function restarts
- **No File System**: Cannot write to persistent files
- **Session-Based**: Data only available during function execution

### **Scaling Considerations**
- **Cold Starts**: First request may be slower
- **Memory Limits**: Limited by platform memory constraints
- **Timeout Limits**: Function execution time limits

## 🛠 **Production Recommendations**

### **For Production Use:**

1. **Use External Database**
   - Consider MongoDB, PostgreSQL, or DynamoDB
   - Implement database storage instead of memory storage
   - Ensure data persistence across function restarts

2. **Implement Caching**
   - Use Redis for caching frequently accessed data
   - Reduce database queries
   - Improve response times

3. **Monitor Performance**
   - Set up monitoring with tools like DataDog or New Relic
   - Monitor function execution times
   - Track memory usage and errors

### **Example Database Integration:**

```typescript
// Example with MongoDB
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export async function logAlert(alert: TradingViewAlert): Promise<string> {
  if (isServerless) {
    // Use database instead of memory
    await client.connect();
    const db = client.db('tradingview');
    const collection = db.collection('alerts');
    
    const alertEntry = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      data: alert
    };
    
    await collection.insertOne(alertEntry);
    return alertEntry.id;
  }
  
  // Fallback to file storage for non-serverless
  return logAlertToFile(alert);
}
```

## 🧪 **Testing in Serverless**

### **Local Testing:**
```bash
# Test with serverless environment variables
VERCEL=1 npm run dev

# Test webhook
node scripts/test-webhook.js https://your-vercel-app.vercel.app/api/tradingview-alert your_secret
```

### **Production Testing:**
```bash
# Test deployed webhook
curl -X POST https://your-app.vercel.app/api/tradingview-alert \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "price": 175.23,
    "signal": "BUY",
    "strategy": "Test Strategy",
    "timestamp": "2025-01-17T10:30:00Z",
    "webhook_secret": "your_secret"
  }'
```

## 📈 **Performance Optimization**

### **Memory Management:**
- Automatic cleanup of old alerts
- Limited to 1000 alerts maximum
- Efficient filtering and sorting

### **Response Times:**
- Memory storage is faster than file I/O
- Optimized data structures
- Minimal external dependencies

### **Scaling:**
- Stateless functions
- Horizontal scaling support
- Load balancer compatible

## 🔒 **Security in Serverless**

### **Environment Variables:**
- Store secrets in platform environment variables
- Never commit secrets to code
- Use different secrets for different environments

### **Rate Limiting:**
- Built-in rate limiting protection
- Configurable limits
- IP-based rate limiting

### **Input Validation:**
- Comprehensive payload validation
- Type checking and sanitization
- Error handling and logging

## 📝 **TradingView Configuration**

Use your deployed webhook URL in TradingView:

**Webhook URL:** `https://your-app.vercel.app/api/tradingview-alert`

**Alert Message:**
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

## 🎯 **Summary**

The TradingView Alert Reader is now fully compatible with serverless platforms:

- ✅ **Automatic serverless detection**
- ✅ **Memory storage for alerts**
- ✅ **Console logging for debugging**
- ✅ **Graceful error handling**
- ✅ **Production-ready deployment**
- ✅ **Scalable architecture**

Deploy with confidence to any serverless platform! 🚀
