// Test script for SELL orders using Chartink alerts
// This script tests the SELL order functionality

async function testSellAlert() {
  const sellAlertPayload = {
    "stocks": "RELIANCE",
    "trigger_prices": "2500.50",
    "triggered_at": "3:30 pm",
    "scan_name": "SELL signal test",
    "scan_url": "sell-signal-test",
    "alert_name": "SELL Alert for RELIANCE",  // This should trigger SELL signal
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('🧪 Testing SELL alert from Chartink...');
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

async function testBuyAlert() {
  const buyAlertPayload = {
    "stocks": "TCS",
    "trigger_prices": "3500.25",
    "triggered_at": "3:35 pm",
    "scan_name": "BUY signal test",
    "scan_url": "buy-signal-test",
    "alert_name": "BUY Alert for TCS",  // This should trigger BUY signal
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('\n🧪 Testing BUY alert from Chartink (for comparison)...');
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

async function testHoldAlert() {
  const holdAlertPayload = {
    "stocks": "INFY",
    "trigger_prices": "1800.75",
    "triggered_at": "3:40 pm",
    "scan_name": "HOLD signal test",
    "scan_url": "hold-signal-test",
    "alert_name": "HOLD Alert for INFY",  // This should trigger HOLD signal (no orders)
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('\n🧪 Testing HOLD alert from Chartink (should not place orders)...');
    console.log('Payload:', JSON.stringify(holdAlertPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(holdAlertPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ HOLD alert test completed!');
      console.log(`📊 Processed ${result.data?.totalAlerts || 0} alert(s)`);
      console.log(`📈 Attempted ${result.data?.totalOrders || 0} order(s) (should be 0)`);
      console.log(`✅ Successful orders: ${result.data?.successfulOrders || 0} (should be 0)`);
      console.log(`❌ Failed orders: ${result.data?.failedOrders || 0} (should be 0)`);
    } else {
      console.log('❌ HOLD alert test failed!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing HOLD alert:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting SELL order functionality tests...\n');
  console.log('📋 Test Configuration:');
  console.log('  - ALERT_SOURCE should be set to "ChartInk"');
  console.log('  - AUTO_PLACE_ORDER should be set to "true"');
  console.log('  - AUTO_PLACE_SELL_ORDER should be set to "true"');
  console.log('  - App should be running on http://localhost:5001/');
  console.log('');
  
  // Test SELL alert
  await testSellAlert();
  
  // Test BUY alert for comparison
  await testBuyAlert();
  
  // Test HOLD alert (should not place orders)
  await testHoldAlert();
  
  console.log('\n✨ All tests completed!');
  console.log('\n📝 Notes:');
  console.log('  - SELL orders should be placed if AUTO_PLACE_SELL_ORDER=true');
  console.log('  - BUY orders should be placed if AUTO_PLACE_ORDER=true');
  console.log('  - HOLD orders should never be placed');
  console.log('  - Check the application logs for detailed order placement information');
}

runTests().catch(console.error);
