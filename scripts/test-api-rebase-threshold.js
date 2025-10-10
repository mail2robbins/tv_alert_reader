/**
 * Test script to verify rebase threshold display via API
 */

async function testApiRebaseThreshold() {
  console.log('🧪 Testing Rebase Threshold Display via API');
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
      console.log('📊 Account Configuration Details:');
      console.log('');
      
      data.data.config.accounts.forEach((account, index) => {
        console.log(`Account #${account.accountId} (${account.clientId}):`);
        console.log(`  • Rebase TP/SL: ${account.rebaseTpAndSl ? 'Enabled' : 'Disabled'}`);
        console.log(`  • Raw Threshold Value: ${account.rebaseThresholdPercentage}`);
        console.log(`  • Formatted Display: ${((account.rebaseThresholdPercentage || 0.1) * 100).toFixed(2)}%`);
        console.log('');
      });
      
      console.log('🎯 Your Environment Setting:');
      console.log('   REBASE_THRESHOLD_PERCENTAGE_1=0.02');
      console.log('   Expected Display: 2.00%');
      console.log('');
      
      const account1 = data.data.config.accounts.find(acc => acc.accountId === 1);
      if (account1) {
        const displayValue = ((account1.rebaseThresholdPercentage || 0.1) * 100).toFixed(2);
        console.log(`✅ Account 1 Threshold Display: ${displayValue}%`);
        console.log(`   Match Expected: ${displayValue === '2.00' ? '✅ YES' : '❌ NO'}`);
      }
      
    } else {
      console.log('❌ API Response failed:', data.error);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('💡 Make sure the development server is running on http://localhost:5001');
  }
}

// Run the test
testApiRebaseThreshold();
