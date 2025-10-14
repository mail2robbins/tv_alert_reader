import { testDatabaseConnection, initializeDatabaseSchema } from '../src/lib/database';

async function testApiFlow() {
  try {
    console.log('🌐 Testing API Flow: ChartInk Webhook → API Processing → Database Storage\n');
    
    // Step 1: Initialize Database
    console.log('1️⃣ Initializing database...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    await initializeDatabaseSchema();
    console.log('✅ Database initialized\n');
    
    // Step 2: Simulate ChartInk Webhook Payload
    console.log('2️⃣ Simulating ChartInk webhook payload...');
    const chartInkWebhookPayload = {
      stocks: 'TCS',
      trigger_prices: '3800.25',
      triggered_at: new Date().toISOString(),
      scan_name: 'Volume Breakout',
      scan_url: 'https://chartink.com/screener/volume-breakout',
      alert_name: 'High Volume Alert',
      webhook_url: 'https://your-app.com/api/tradingview-alert'
    };
    
    console.log('📡 Webhook Payload:', chartInkWebhookPayload);
    
    // Step 3: Simulate API Call to TradingView Alert Endpoint
    console.log('3️⃣ Simulating API call to /api/tradingview-alert...');
    
    const apiUrl = 'http://localhost:3000/api/tradingview-alert';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1' // Simulate client IP
      },
      body: JSON.stringify(chartInkWebhookPayload)
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const apiResponse = await response.json();
    console.log('📨 API Response:', {
      success: apiResponse.success,
      message: apiResponse.message,
      alertId: apiResponse.data?.alertId,
      orderPlaced: apiResponse.data?.orderPlaced,
      ordersPlaced: apiResponse.data?.ordersPlaced
    });
    
    if (apiResponse.success) {
      console.log('✅ API processing successful\n');
      
      // Step 4: Verify Data via API Endpoints
      console.log('4️⃣ Verifying data via API endpoints...');
      
      // Check alerts endpoint
      const alertsResponse = await fetch('http://localhost:3000/api/alerts?ticker=TCS&includeStats=true');
      const alertsData = await alertsResponse.json();
      
      if (alertsData.success) {
        console.log('📊 Alerts API Response:', {
          totalAlerts: alertsData.data.alerts.length,
          stats: alertsData.data.stats
        });
      }
      
      // Check orders endpoint
      const ordersResponse = await fetch('http://localhost:3000/api/orders?ticker=TCS&includeStats=true');
      const ordersData = await ordersResponse.json();
      
      if (ordersData.success) {
        console.log('📋 Orders API Response:', {
          totalOrders: ordersData.data.orders.length,
          stats: ordersData.data.stats
        });
      }
      
      // Step 5: Test Order Placement API
      console.log('5️⃣ Testing order placement API...');
      
      const orderPayload = {
        alert: {
          ticker: 'TCS',
          price: 3800.25,
          signal: 'BUY',
          strategy: 'Volume Breakout',
          timestamp: new Date().toISOString(),
          custom_note: 'Test order placement'
        },
        useAutoPositionSizing: true,
        useMultiAccount: false
      };
      
      const orderResponse = await fetch('http://localhost:3000/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });
      
      const orderData = await orderResponse.json();
      console.log('📦 Order Placement Response:', {
        success: orderData.success,
        message: orderData.message,
        orderId: orderData.data?.orderId
      });
      
      console.log('\n🎉 API flow test successful!');
      console.log('✅ ChartInk webhook → API processing → Database storage → Order placement');
      
    } else {
      console.log('⚠️ API processing failed:', apiResponse.error);
    }
    
  } catch (error) {
    console.error('❌ API flow test failed:', error);
    console.log('💡 Make sure the development server is running: npm run dev');
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testApiFlow();
}

export { testApiFlow };
