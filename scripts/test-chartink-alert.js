// Using built-in fetch (Node.js 18+)

// Test ChartInk alert
async function testChartInkAlert() {
  const chartInkPayload = {
    "stocks": "SEPOWER,ASTEC,EDUCOMP",
    "trigger_prices": "3.75,541.8,2.1",
    "triggered_at": "2:34 pm",
    "scan_name": "Short term breakouts",
    "scan_url": "short-term-breakouts",
    "alert_name": "Alert for Short term breakouts",
    "webhook_url": "http://your-web-hook-url.com"
  };

  try {
    console.log('Testing ChartInk alert...');
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
      console.log('✅ ChartInk alert test passed!');
    } else {
      console.log('❌ ChartInk alert test failed!');
    }
  } catch (error) {
    console.error('Error testing ChartInk alert:', error);
  }
}

// Test TradingView alert
async function testTradingViewAlert() {
  const tradingViewPayload = {
    "ticker": "RELIANCE",
    "price": 2500.50,
    "signal": "BUY",
    "strategy": "My Strategy",
    "timestamp": "2024-01-15T10:30:00Z",
    "custom_note": "Custom alert message",
    "webhook_secret": "test123"
  };

  try {
    console.log('\nTesting TradingView alert...');
    console.log('Payload:', JSON.stringify(tradingViewPayload, null, 2));
    
    const response = await fetch('http://localhost:5001/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradingViewPayload)
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ TradingView alert test passed!');
    } else {
      console.log('❌ TradingView alert test failed!');
    }
  } catch (error) {
    console.error('Error testing TradingView alert:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting alert source tests...\n');
  
  // Test ChartInk first
  await testChartInkAlert();
  
  // Test TradingView
  await testTradingViewAlert();
  
  console.log('\n✨ Tests completed!');
  console.log('\nNote: Make sure to set ALERT_SOURCE environment variable to "ChartInk" or "TradingView" to test the respective alert source.');
}

runTests().catch(console.error);
