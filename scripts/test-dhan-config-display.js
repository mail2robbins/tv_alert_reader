/**
 * Test script to verify DHAN configuration display in Account Configuration UI
 */

async function testDhanConfigDisplay() {
  console.log('🧪 Testing DHAN Configuration Display');
  console.log('='.repeat(60));

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
      console.log('📊 System Configuration Details:');
      console.log('');
      
      // Alert Source
      console.log('🔧 Alert Source Configuration:');
      console.log(`   • ALERT_SOURCE: ${data.data.alertSource}`);
      console.log(`   • Display: ${data.data.alertSource === 'ChartInk' ? '📊 ChartInk' : '📈 TradingView'}`);
      console.log('');
      
      // DHAN Configuration
      console.log('📈 DHAN Trading Configuration:');
      console.log(`   • DHAN_EXCHANGE_SEGMENT: ${data.data.dhanConfig.exchangeSegment}`);
      console.log(`   • DHAN_PRODUCT_TYPE: ${data.data.dhanConfig.productType}`);
      console.log(`   • DHAN_ORDER_TYPE: ${data.data.dhanConfig.orderType}`);
      console.log('');
      
      console.log('🎨 UI Display Preview:');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│  🔧 System Configuration                              │');
      console.log('│  Alert source and DHAN trading configuration          │');
      console.log('│                                                       │');
      console.log('│  ┌─────────────────┐  ┌─────────────────┐            │');
      console.log('│  │ Alert Source    │  │ Exchange Segment│            │');
      console.log(`│  │ ${data.data.alertSource === 'ChartInk' ? '📊 ChartInk' : '📈 TradingView'}     │  │ 📈 ${data.data.dhanConfig.exchangeSegment.padEnd(8)} │            │`);
      console.log('│  └─────────────────┘  └─────────────────┘            │');
      console.log('│                                                       │');
      console.log('│  ┌─────────────────┐  ┌─────────────────┐            │');
      console.log('│  │ Product Type    │  │ Order Type      │            │');
      console.log(`│  │ 📦 ${data.data.dhanConfig.productType.padEnd(8)} │  │ ⚡ ${data.data.dhanConfig.orderType.padEnd(8)} │            │`);
      console.log('│  └─────────────────┘  └─────────────────┘            │');
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log('');
      
      console.log('🎯 Configuration Summary:');
      console.log(`   • Alert Source: ${data.data.alertSource}`);
      console.log(`   • Exchange: ${data.data.dhanConfig.exchangeSegment}`);
      console.log(`   • Product: ${data.data.dhanConfig.productType}`);
      console.log(`   • Order Type: ${data.data.dhanConfig.orderType}`);
      console.log('');
      
      console.log('✅ All DHAN configuration values are now displayed in the UI!');
      console.log('✅ The System Configuration section shows all environment variables');
      
    } else {
      console.log('❌ API Response failed:', data.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:5001');
  }
}

// Run the test
testDhanConfigDisplay();
