// Using built-in fetch in Node.js 18+

async function testApi() {
  try {
    console.log('🌐 Testing API Endpoint...\n');
    
    const chartInkPayload = {
      stocks: 'TCS',
      trigger_prices: '3800.25',
      triggered_at: new Date().toISOString(),
      scan_name: 'Volume Breakout',
      scan_url: 'https://chartink.com/screener/volume-breakout',
      alert_name: 'High Volume Alert',
      webhook_url: 'https://your-app.com/api/tradingview-alert'
    };
    
    console.log('📡 Sending ChartInk webhook payload:', chartInkPayload);
    
    const response = await fetch('http://localhost:3000/api/tradingview-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '127.0.0.1'
      },
      body: JSON.stringify(chartInkPayload)
    });
    
    const result = await response.json();
    
    console.log('\n📨 API Response:');
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    
    if (result.data) {
      console.log('Alert ID:', result.data.alertId);
      console.log('Order Placed:', result.data.orderPlaced);
      if (result.data.ordersPlaced) {
        console.log('Orders Placed:', result.data.ordersPlaced);
      }
    }
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
    console.log('\n✅ API test completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('💡 Make sure the development server is running: npm run dev');
  }
}

testApi();
