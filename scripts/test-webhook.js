#!/usr/bin/env node

/**
 * Test script for TradingView webhook endpoint
 * Usage: node scripts/test-webhook.js [webhook-url] [secret]
 */

const https = require('https');
const http = require('http');

const DEFAULT_URL = 'http://localhost:5001/api/tradingview-alert';
const DEFAULT_SECRET = 'test_secret_123';

const webhookUrl = process.argv[2] || DEFAULT_URL;
const secret = process.argv[3] || DEFAULT_SECRET;

// Sample alert data
const testAlerts = [
  {
    ticker: 'AAPL',
    price: 175.23,
    signal: 'BUY',
    strategy: 'RSI Strategy',
    timestamp: new Date().toISOString(),
    custom_note: 'RSI oversold condition met',
    webhook_secret: secret
  },
  {
    ticker: 'GOOGL',
    price: 142.50,
    signal: 'SELL',
    strategy: 'MACD Strategy',
    timestamp: new Date().toISOString(),
    custom_note: 'MACD bearish crossover',
    webhook_secret: secret
  },
  {
    ticker: 'MSFT',
    price: 378.85,
    signal: 'HOLD',
    strategy: 'Moving Average Strategy',
    timestamp: new Date().toISOString(),
    custom_note: 'Price consolidating near support',
    webhook_secret: secret
  }
];

function sendRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testWebhook() {
  console.log(`🧪 Testing TradingView Webhook`);
  console.log(`📍 URL: ${webhookUrl}`);
  console.log(`🔑 Secret: ${secret}`);
  console.log('─'.repeat(50));

  for (let i = 0; i < testAlerts.length; i++) {
    const alert = testAlerts[i];
    console.log(`\n📤 Sending Alert ${i + 1}/${testAlerts.length}:`);
    console.log(`   Ticker: ${alert.ticker}`);
    console.log(`   Signal: ${alert.signal}`);
    console.log(`   Price: $${alert.price}`);
    console.log(`   Strategy: ${alert.strategy}`);

    try {
      const response = await sendRequest(webhookUrl, alert);
      
      if (response.statusCode === 200) {
        console.log(`✅ Success (${response.statusCode})`);
        if (response.data.success) {
          console.log(`   Alert ID: ${response.data.data?.alertId}`);
          console.log(`   Processing Time: ${response.data.data?.processingTime}ms`);
        }
      } else {
        console.log(`❌ Error (${response.statusCode})`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`💥 Request Failed:`);
      console.log(`   Error: ${error.message}`);
    }

    // Wait 1 second between requests
    if (i < testAlerts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log('🏁 Test completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Check your application dashboard');
  console.log('   2. Verify alerts appear in the UI');
  console.log('   3. Test date filtering and other features');
}

// Run the test
testWebhook().catch(console.error);
