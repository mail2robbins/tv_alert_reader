// Using built-in fetch (Node.js 18+)

// Test ChartInk alert with single stock
async function testSingleChartInkAlert() {
  const singleChartInkPayload = {
    "stocks": "RELIANCE",
    "trigger_prices": "2500.50",
    "triggered_at": "3:15 pm",
    "scan_name": "Single stock breakout",
    "scan_url": "single-stock-breakout",
    "alert_name": "Alert for RELIANCE breakout",
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('Testing ChartInk alert with single stock...');
    console.log('Payload:', JSON.stringify(singleChartInkPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(singleChartInkPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Single ChartInk alert test passed!');
      console.log(`📊 Processed ${result.data?.totalAlerts || 0} alert(s)`);
      console.log(`📈 Attempted ${result.data?.totalOrders || 0} order(s)`);
    } else {
      console.log('❌ Single ChartInk alert test failed!');
    }
  } catch (error) {
    console.error('Error testing single ChartInk alert:', error);
  }
}

// Test ChartInk alert with multiple stocks (for comparison)
async function testMultipleChartInkAlert() {
  const multipleChartInkPayload = {
    "stocks": "RELIANCE,TCS,INFY",
    "trigger_prices": "2500.50,3500.25,1800.75",
    "triggered_at": "3:20 pm",
    "scan_name": "Multiple stock breakouts",
    "scan_url": "multiple-stock-breakouts",
    "alert_name": "Alert for multiple stock breakouts",
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('\nTesting ChartInk alert with multiple stocks...');
    console.log('Payload:', JSON.stringify(multipleChartInkPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(multipleChartInkPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Multiple ChartInk alert test passed!');
      console.log(`📊 Processed ${result.data?.totalAlerts || 0} alert(s)`);
      console.log(`📈 Attempted ${result.data?.totalOrders || 0} order(s)`);
    } else {
      console.log('❌ Multiple ChartInk alert test failed!');
    }
  } catch (error) {
    console.error('Error testing multiple ChartInk alert:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting ChartInk single vs multiple stock tests...\n');
  
  // Test single stock first
  await testSingleChartInkAlert();
  
  // Test multiple stocks for comparison
  await testMultipleChartInkAlert();
  
  console.log('\n✨ Tests completed!');
  console.log('\nNote: Make sure ALERT_SOURCE=ChartInk is set in your .env.local file.');
}

runTests().catch(console.error);
