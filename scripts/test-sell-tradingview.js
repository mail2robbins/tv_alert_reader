// Test script for SELL orders using TradingView alerts
// This script tests the SELL order functionality with TradingView format

async function testSellAlertTradingView() {
  const sellAlertPayload = {
    "ticker": "RELIANCE",
    "price": 2500.50,
    "signal": "SELL",
    "strategy": "SELL Signal Test",
    "timestamp": new Date().toISOString(),
    "custom_note": "Testing SELL order functionality",
    "webhook_secret": "Test123"  // This should match your TRADINGVIEW_WEBHOOK_SECRET
  };

  try {
    console.log('🧪 Testing SELL alert from TradingView...');
    console.log('Payload:', JSON.stringify(sellAlertPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sellAlertPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ SELL alert test completed!');
      console.log(`📊 Processed ${result.data?.totalAlerts || 0} alert(s)`);
      console.log(`📈 Attempted ${result.data?.totalOrders || 0} order(s)`);
      console.log(`✅ Successful orders: ${result.data?.successfulOrders || 0}`);
      console.log(`❌ Failed orders: ${result.data?.failedOrders || 0}`);
      
      if (result.data?.orders && result.data.orders.length > 0) {
        console.log('\n📋 Order Details:');
        result.data.orders.forEach((order, index) => {
          console.log(`  Order ${index + 1}:`);
          console.log(`    Ticker: ${order.ticker}`);
          console.log(`    Signal: ${order.signal}`);
          console.log(`    Status: ${order.status}`);
          console.log(`    Order ID: ${order.orderId || 'N/A'}`);
          console.log(`    Account: ${order.accountId || 'N/A'}`);
        });
      }
    } else {
      console.log('❌ SELL alert test failed!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing SELL alert:', error);
  }
}

async function testBuyAlertTradingView() {
  const buyAlertPayload = {
    "ticker": "TCS",
    "price": 3500.25,
    "signal": "BUY",
    "strategy": "BUY Signal Test",
    "timestamp": new Date().toISOString(),
    "custom_note": "Testing BUY order functionality",
    "webhook_secret": "Test123"  // This should match your TRADINGVIEW_WEBHOOK_SECRET
  };

  try {
    console.log('\n🧪 Testing BUY alert from TradingView (for comparison)...');
    console.log('Payload:', JSON.stringify(buyAlertPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buyAlertPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ BUY alert test completed!');
      console.log(`📊 Processed ${result.data?.totalAlerts || 0} alert(s)`);
      console.log(`📈 Attempted ${result.data?.totalOrders || 0} order(s)`);
      console.log(`✅ Successful orders: ${result.data?.successfulOrders || 0}`);
      console.log(`❌ Failed orders: ${result.data?.failedOrders || 0}`);
    } else {
      console.log('❌ BUY alert test failed!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing BUY alert:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting SELL order functionality tests with TradingView...\n');
  console.log('📋 Test Configuration:');
  console.log('  - ALERT_SOURCE should be set to "TradingView"');
  console.log('  - AUTO_PLACE_ORDER should be set to "true"');
  console.log('  - AUTO_PLACE_SELL_ORDER should be set to "true"');
  console.log('  - TRADINGVIEW_WEBHOOK_SECRET should be set to "Test123"');
  console.log('  - App should be running on http://localhost:5001/');
  console.log('');
  
  // Test SELL alert
  await testSellAlertTradingView();
  
  // Test BUY alert for comparison
  await testBuyAlertTradingView();
  
  console.log('\n✨ All tests completed!');
  console.log('\n📝 Notes:');
  console.log('  - SELL orders should be placed if AUTO_PLACE_SELL_ORDER=true');
  console.log('  - BUY orders should be placed if AUTO_PLACE_ORDER=true');
  console.log('  - Check the application logs for detailed order placement information');
  console.log('  - Make sure your Dhan API credentials are configured in .env.local');
}

runTests().catch(console.error);
