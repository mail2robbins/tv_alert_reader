const https = require('https');

// Configuration
const DEFAULT_URL = 'http://localhost:3000';
const WEBHOOK_SECRET = 'TradingView_2025_Secret_Key_SCORPIONS123';

// Test alert payload for Dhan.co order placement
const testAlert = {
  ticker: "RELIANCE",
  price: "2500.50",
  signal: "BUY",
  strategy: "Dhan Integration Test",
  timestamp: new Date().toISOString(),
  custom_note: "Testing Dhan.co order placement",
  webhook_secret: WEBHOOK_SECRET
};

// Test order placement payload
const testOrderPayload = {
  alert: {
    ticker: "RELIANCE",
    price: 2500.50,
    signal: "BUY",
    strategy: "Dhan Integration Test",
    timestamp: new Date().toISOString()
  },
  quantity: 1,
  orderConfig: {
    exchangeSegment: "NSE_EQ",
    productType: "CNC",
    orderType: "LIMIT"
  }
};

function makeRequest(url, data, description) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : require('http');
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log(`\n✅ ${description}`);
          console.log(`Status: ${res.statusCode}`);
          console.log('Response:', JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (error) {
          console.log(`\n❌ ${description} - JSON Parse Error`);
          console.log(`Status: ${res.statusCode}`);
          console.log('Raw Response:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`\n❌ ${description} - Request Failed`);
      console.log('Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testDhanIntegration() {
  console.log('🚀 Testing Dhan.co Integration');
  console.log('================================');
  
  try {
    // Test 1: Send TradingView alert (should trigger auto-order if enabled)
    console.log('\n📡 Test 1: Sending TradingView Alert');
    await makeRequest(
      `${DEFAULT_URL}/api/tradingview-alert`,
      testAlert,
      'TradingView Alert Sent'
    );

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Manual order placement
    console.log('\n📡 Test 2: Manual Order Placement');
    await makeRequest(
      `${DEFAULT_URL}/api/place-order`,
      testOrderPayload,
      'Manual Order Placed'
    );

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Fetch orders
    console.log('\n📡 Test 3: Fetching Orders');
    const ordersResponse = await fetch(`${DEFAULT_URL}/api/orders?includeStats=true`);
    const ordersData = await ordersResponse.json();
    
    console.log('\n✅ Orders Retrieved');
    console.log(`Status: ${ordersResponse.status}`);
    console.log('Response:', JSON.stringify(ordersData, null, 2));

    console.log('\n🎉 Dhan.co Integration Test Complete!');
    console.log('\nNext Steps:');
    console.log('1. Check your Dhan.co account for placed orders');
    console.log('2. Verify the orders appear in the UI');
    console.log('3. Check the console logs for detailed information');

  } catch (error) {
    console.log('\n❌ Test Failed');
    console.log('Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your Next.js server is running');
    console.log('2. Check your .env.local file has DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID');
    console.log('3. Verify your Dhan.co API credentials are correct');
    console.log('4. Check the server console for detailed error messages');
  }
}

// Run the test
testDhanIntegration();
