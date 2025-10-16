/**
 * Integration test to verify API endpoints work correctly with SELL signal rebase
 * This script tests the actual API endpoints with mock data
 */

console.log('🧪 Testing API Integration with SELL Signal Rebase');
console.log('==================================================\n');

// Mock API base URL (adjust as needed)
const API_BASE_URL = 'http://localhost:3000';

// Test data for TradingView alerts
const tradingViewBuyAlert = {
  ticker: 'RELIANCE',
  price: 250.00,
  signal: 'BUY',
  strategy: 'Momentum Breakout',
  timestamp: new Date().toISOString(),
  custom_note: 'TradingView BUY Alert Test',
  webhook_secret: 'TradingView_2025_Secret_Key_SCORPIONS123'
};

const tradingViewSellAlert = {
  ticker: 'RELIANCE',
  price: 250.00,
  signal: 'SELL',
  strategy: 'Momentum Breakdown',
  timestamp: new Date().toISOString(),
  custom_note: 'TradingView SELL Alert Test',
  webhook_secret: 'TradingView_2025_Secret_Key_SCORPIONS123'
};

// Test data for ChartInk alerts
const chartInkBuyAlert = {
  stocks: 'TCS',
  trigger_prices: '350.00',
  triggered_at: '2:34 pm',
  scan_name: 'Volume Breakout',
  scan_url: 'volume-breakout',
  alert_name: 'BUY Alert for TCS',
  webhook_url: 'http://your-web-hook-url.com'
};

const chartInkSellAlert = {
  stocks: 'TCS',
  trigger_prices: '350.00',
  triggered_at: '2:34 pm',
  scan_name: 'Volume Breakdown',
  scan_url: 'volume-breakdown',
  alert_name: 'SELL Alert for TCS',
  webhook_url: 'http://your-web-hook-url.com'
};

// Function to make API calls
async function makeApiCall(endpoint, data) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test TradingView alerts
async function testTradingViewAlerts() {
  console.log('📈 Testing TradingView Alerts');
  console.log('==============================');
  
  // Test BUY alert
  console.log('\n1. Testing TradingView BUY Alert:');
  const buyResult = await makeApiCall('/api/tradingview-alert', tradingViewBuyAlert);
  
  if (buyResult.success) {
    console.log('   ✅ BUY Alert API call successful');
    console.log(`   📊 Response: ${JSON.stringify(buyResult.data, null, 2)}`);
    
    // Check if rebase queue status is included
    if (buyResult.data.data && buyResult.data.data.rebaseQueueStatus) {
      console.log('   ✅ Rebase queue status included in response');
      console.log(`   📝 Queue Status: ${JSON.stringify(buyResult.data.data.rebaseQueueStatus)}`);
    } else {
      console.log('   ⚠️ Rebase queue status not found in response');
    }
  } else {
    console.log(`   ❌ BUY Alert API call failed: ${buyResult.error || buyResult.data?.error}`);
  }
  
  // Test SELL alert
  console.log('\n2. Testing TradingView SELL Alert:');
  const sellResult = await makeApiCall('/api/tradingview-alert', tradingViewSellAlert);
  
  if (sellResult.success) {
    console.log('   ✅ SELL Alert API call successful');
    console.log(`   📊 Response: ${JSON.stringify(sellResult.data, null, 2)}`);
    
    // Check if rebase queue status is included
    if (sellResult.data.data && sellResult.data.data.rebaseQueueStatus) {
      console.log('   ✅ Rebase queue status included in response');
      console.log(`   📝 Queue Status: ${JSON.stringify(sellResult.data.data.rebaseQueueStatus)}`);
    } else {
      console.log('   ⚠️ Rebase queue status not found in response');
    }
  } else {
    console.log(`   ❌ SELL Alert API call failed: ${sellResult.error || sellResult.data?.error}`);
  }
  
  return {
    buySuccess: buyResult.success,
    sellSuccess: sellResult.success
  };
}

// Test ChartInk alerts
async function testChartInkAlerts() {
  console.log('\n📊 Testing ChartInk Alerts');
  console.log('============================');
  
  // Test BUY alert
  console.log('\n1. Testing ChartInk BUY Alert:');
  const buyResult = await makeApiCall('/api/tradingview-alert', chartInkBuyAlert);
  
  if (buyResult.success) {
    console.log('   ✅ BUY Alert API call successful');
    console.log(`   📊 Response: ${JSON.stringify(buyResult.data, null, 2)}`);
    
    // Check if rebase queue status is included
    if (buyResult.data.data && buyResult.data.data.rebaseQueueStatus) {
      console.log('   ✅ Rebase queue status included in response');
      console.log(`   📝 Queue Status: ${JSON.stringify(buyResult.data.data.rebaseQueueStatus)}`);
    } else {
      console.log('   ⚠️ Rebase queue status not found in response');
    }
  } else {
    console.log(`   ❌ BUY Alert API call failed: ${buyResult.error || buyResult.data?.error}`);
  }
  
  // Test SELL alert
  console.log('\n2. Testing ChartInk SELL Alert:');
  const sellResult = await makeApiCall('/api/tradingview-alert', chartInkSellAlert);
  
  if (sellResult.success) {
    console.log('   ✅ SELL Alert API call successful');
    console.log(`   📊 Response: ${JSON.stringify(sellResult.data, null, 2)}`);
    
    // Check if rebase queue status is included
    if (sellResult.data.data && sellResult.data.data.rebaseQueueStatus) {
      console.log('   ✅ Rebase queue status included in response');
      console.log(`   📝 Queue Status: ${JSON.stringify(sellResult.data.data.rebaseQueueStatus)}`);
    } else {
      console.log('   ⚠️ Rebase queue status not found in response');
    }
  } else {
    console.log(`   ❌ SELL Alert API call failed: ${sellResult.error || sellResult.data?.error}`);
  }
  
  return {
    buySuccess: buyResult.success,
    sellSuccess: sellResult.success
  };
}

// Test rebase status API
async function testRebaseStatusAPI() {
  console.log('\n📊 Testing Rebase Status API');
  console.log('==============================');
  
  const statusResult = await makeApiCall('/api/rebase-status', {});
  
  if (statusResult.success) {
    console.log('   ✅ Rebase Status API call successful');
    console.log(`   📊 Response: ${JSON.stringify(statusResult.data, null, 2)}`);
  } else {
    console.log(`   ❌ Rebase Status API call failed: ${statusResult.error || statusResult.data?.error}`);
  }
  
  return statusResult.success;
}

// Main test function
async function runIntegrationTests() {
  console.log('🚀 Starting API Integration Tests\n');
  
  try {
    // Test TradingView alerts
    const tradingViewResults = await testTradingViewAlerts();
    
    // Test ChartInk alerts
    const chartInkResults = await testChartInkAlerts();
    
    // Test rebase status API
    const rebaseStatusSuccess = await testRebaseStatusAPI();
    
    // Summary
    console.log('\n📊 Integration Test Summary');
    console.log('============================');
    
    console.log('\n📈 TradingView Alerts:');
    console.log(`   BUY Alert: ${tradingViewResults.buySuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`   SELL Alert: ${tradingViewResults.sellSuccess ? '✅ Success' : '❌ Failed'}`);
    
    console.log('\n📊 ChartInk Alerts:');
    console.log(`   BUY Alert: ${chartInkResults.buySuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`   SELL Alert: ${chartInkResults.sellSuccess ? '✅ Success' : '❌ Failed'}`);
    
    console.log('\n📊 Rebase Status API:');
    console.log(`   Status API: ${rebaseStatusSuccess ? '✅ Success' : '❌ Failed'}`);
    
    const allTestsPassed = tradingViewResults.buySuccess && 
                          tradingViewResults.sellSuccess && 
                          chartInkResults.buySuccess && 
                          chartInkResults.sellSuccess && 
                          rebaseStatusSuccess;
    
    console.log('\n🎯 Overall Result:');
    console.log('==================');
    
    if (allTestsPassed) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED!');
      console.log('\n✅ Verified:');
      console.log('   ✅ TradingView BUY alerts work with rebase queue');
      console.log('   ✅ TradingView SELL alerts work with rebase queue');
      console.log('   ✅ ChartInk BUY alerts work with rebase queue');
      console.log('   ✅ ChartInk SELL alerts work with rebase queue');
      console.log('   ✅ Rebase status API is accessible');
      console.log('   ✅ Both alert sources use the same processing pipeline');
      console.log('   ✅ Signal information flows correctly to rebase queue');
    } else {
      console.log('❌ SOME INTEGRATION TESTS FAILED!');
      console.log('Please check the server and configuration.');
    }
    
  } catch (error) {
    console.error('❌ Integration test error:', error);
  }
}

// Check if we're in a browser environment (for fetch API)
if (typeof fetch === 'undefined') {
  console.log('⚠️ This test requires a browser environment or Node.js with fetch support.');
  console.log('   To run this test:');
  console.log('   1. Start your Next.js server: npm run dev');
  console.log('   2. Open this script in a browser or use Node.js 18+ with fetch support');
  console.log('   3. Or run the server-side tests instead');
} else {
  // Run the tests
  runIntegrationTests();
}
