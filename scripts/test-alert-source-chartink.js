/**
 * Test script to simulate ChartInk ALERT_SOURCE configuration
 */

// Simulate ChartInk configuration
process.env.ALERT_SOURCE = 'ChartInk';

async function testChartInkAlertSource() {
  console.log('🧪 Testing ChartInk ALERT_SOURCE Configuration');
  console.log('='.repeat(60));
  console.log('📊 Simulating ALERT_SOURCE=ChartInk');
  console.log('');

  try {
    const response = await fetch('http://localhost:5001/api/account-config?includeSummary=true', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API Response successful');
      console.log('📊 Alert Source:', data.data.alertSource);
      
      console.log('\n🎯 ALERT_SOURCE Configuration:');
      console.log(`   • Current Value: ${data.data.alertSource}`);
      console.log(`   • Environment Variable: ALERT_SOURCE=${data.data.alertSource}`);
      
      if (data.data.alertSource === 'ChartInk') {
        console.log('   • Status: 📊 ChartInk alerts will be processed');
        console.log('   • Features: Multi-stock alerts, comma-separated values');
        console.log('   • UI Display: Orange badge with ChartInk icon');
      } else {
        console.log('   • Status: 📈 TradingView alerts will be processed');
        console.log('   • Features: Single stock alerts, webhook secret validation');
        console.log('   • UI Display: Blue badge with TradingView icon');
      }
      
      console.log('\n🎨 UI Display Preview:');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│  🔧 Alert Source Configuration                         │');
      console.log('│  Current alert processing source                       │');
      console.log(`│  ${data.data.alertSource === 'ChartInk' ? '📊 ChartInk' : '📈 TradingView'}  ALERT_SOURCE=${data.data.alertSource}  │`);
      console.log('└─────────────────────────────────────────────────────────┘');
      
    } else {
      console.log('❌ API Response failed:', data.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testChartInkAlertSource();
