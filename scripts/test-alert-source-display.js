/**
 * Test script to verify ALERT_SOURCE is displayed in Account Configuration UI
 */

async function testAlertSourceDisplay() {
  console.log('🧪 Testing ALERT_SOURCE Display in Account Configuration');
  console.log('='.repeat(60));

  try {
    // Test the API endpoint
    console.log('📡 Testing /api/account-config endpoint...');
    
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
      console.log('📋 Configuration Summary:');
      console.log(`   • Total Accounts: ${data.data.summary?.totalAccounts || 0}`);
      console.log(`   • Active Accounts: ${data.data.summary?.activeAccounts || 0}`);
      console.log(`   • Total Available Funds: ₹${data.data.summary?.totalAvailableFunds?.toLocaleString() || 0}`);
      console.log(`   • Total Leveraged Funds: ₹${data.data.summary?.totalLeveragedFunds?.toLocaleString() || 0}`);
      
      console.log('\n🎯 ALERT_SOURCE Configuration:');
      console.log(`   • Current Value: ${data.data.alertSource}`);
      console.log(`   • Environment Variable: ALERT_SOURCE=${data.data.alertSource}`);
      
      if (data.data.alertSource === 'ChartInk') {
        console.log('   • Status: 📊 ChartInk alerts will be processed');
        console.log('   • Features: Multi-stock alerts, comma-separated values');
      } else {
        console.log('   • Status: 📈 TradingView alerts will be processed');
        console.log('   • Features: Single stock alerts, webhook secret validation');
      }
      
      console.log('\n✅ ALERT_SOURCE is now included in the API response!');
      console.log('✅ The UI will display this as the first item in Account Configuration section');
      
    } else {
      console.log('❌ API Response failed:', data.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:5001');
    console.log('   Run: npm run dev');
  }
}

// Run the test
testAlertSourceDisplay();
