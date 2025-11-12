// Test the actual MFSL alert that failed
// This simulates the ChartInk alert that came in on Nov 12, 2025

async function testMFSLAlert() {
  // Simulate the actual ChartInk payload that might have been received
  // Based on the logs, the price displayed was ₹1689.70
  const chartInkPayload = {
    "stocks": "MFSL",
    "trigger_prices": "₹1689.70",  // With rupee symbol
    "triggered_at": "09:16:21",
    "scan_name": "Webhook v3",
    "scan_url": "webhook-v3",
    "alert_name": "SELL Alert for Webhook v3",
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('Testing MFSL ChartInk alert with rupee symbol...');
    console.log('Payload:', JSON.stringify(chartInkPayload, null, 2));
    console.log('\nExpected behavior:');
    console.log('- Price should be parsed as 1689.70');
    console.log('- Order calculation should use correct price');
    console.log('- Leveraged value should be reasonable (not ₹844.85)\n');
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartInkPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ MFSL alert test passed!');
      if (result.data?.orders && result.data.orders.length > 0) {
        const order = result.data.orders[0];
        console.log('\n📊 Order Details:');
        console.log(`  Price: ₹${order.price}`);
        console.log(`  Quantity: ${order.quantity}`);
        console.log(`  Order Value: ₹${order.orderValue?.toFixed(2)}`);
        console.log(`  Leveraged Value: ₹${order.leveragedValue?.toFixed(2)}`);
        console.log(`  Position Size: ${order.positionSizePercentage?.toFixed(2)}%`);
      }
    } else {
      console.log('\n❌ MFSL alert test failed!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing MFSL alert:', error);
  }
}

// Also test without rupee symbol for comparison
async function testMFSLAlertWithoutSymbol() {
  const chartInkPayload = {
    "stocks": "MFSL",
    "trigger_prices": "1689.70",  // Without rupee symbol
    "triggered_at": "09:16:21",
    "scan_name": "Webhook v3",
    "scan_url": "webhook-v3",
    "alert_name": "SELL Alert for Webhook v3",
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('\n\n=== Testing MFSL alert WITHOUT rupee symbol (for comparison) ===\n');
    console.log('Payload:', JSON.stringify(chartInkPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartInkPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ MFSL alert (no symbol) test passed!');
      if (result.data?.orders && result.data.orders.length > 0) {
        const order = result.data.orders[0];
        console.log('\n📊 Order Details:');
        console.log(`  Price: ₹${order.price}`);
        console.log(`  Quantity: ${order.quantity}`);
        console.log(`  Order Value: ₹${order.orderValue?.toFixed(2)}`);
        console.log(`  Leveraged Value: ₹${order.leveragedValue?.toFixed(2)}`);
        console.log(`  Position Size: ${order.positionSizePercentage?.toFixed(2)}%`);
      }
    } else {
      console.log('\n❌ MFSL alert (no symbol) test failed!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Error testing MFSL alert:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Testing MFSL ChartInk Alert Fix\n');
  console.log('This test reproduces the Nov 12, 2025 issue where');
  console.log('the order failed due to incorrect price parsing.\n');
  console.log('='.repeat(60));
  
  await testMFSLAlert();
  await testMFSLAlertWithoutSymbol();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Tests completed!');
  console.log('\nNote: Make sure ALERT_SOURCE=ChartInk is set in your .env.local file.');
  console.log('      Also ensure your test accounts have sufficient funds.');
}

runTests().catch(console.error);
