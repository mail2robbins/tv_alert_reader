/**
 * Test script to validate rebase calculation with user's specific scenario
 * Alert Price: ₹250.50, Entry Price: ₹250.15, Account: DHAN_CLIENT_ID_1
 */

function testRebaseValidation(alertPrice, entryPrice, accountConfig, scenarioName) {
  console.log(`\n🧮 ${scenarioName}`);
  console.log('='.repeat(60));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Account: ${accountConfig.clientId}`);
  console.log(`Rebase Enabled: ${accountConfig.rebaseTpAndSl ? 'YES' : 'NO'}`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  console.log('');
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log('📊 Price Analysis:');
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log('');
  
  // Check if rebase should be triggered
  const shouldRebase = accountConfig.rebaseTpAndSl && priceDifferencePercentage >= accountConfig.rebaseThresholdPercentage;
  console.log(`🔄 Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'}`);
  
  if (!accountConfig.rebaseTpAndSl) {
    console.log('❌ Rebase is disabled for this account');
    return { shouldRebase: false, reason: 'Rebase disabled' };
  }
  
  if (priceDifferencePercentage < accountConfig.rebaseThresholdPercentage) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${accountConfig.rebaseThresholdPercentage}%), skipping rebase`);
    return { 
      shouldRebase: false, 
      reason: 'Price difference below threshold',
      priceDifferencePercentage,
      threshold: accountConfig.rebaseThresholdPercentage
    };
  }

  // Calculate original TP/SL based on alert price
  const originalTargetPrice = alertPrice * (1 + accountConfig.targetPricePercentage);
  const originalStopLossPrice = alertPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate new TP/SL based on actual entry price
  const newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate the differences
  const targetPriceDifference = newTargetPrice - originalTargetPrice;
  const stopLossDifference = newStopLossPrice - originalStopLossPrice;

  console.log('\n🎯 Original TP/SL (based on alert price ₹' + alertPrice + '):');
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)} (${(accountConfig.targetPricePercentage * 100).toFixed(1)}% above alert price)`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)} (${(accountConfig.stopLossPercentage * 100).toFixed(2)}% below alert price)`);

  console.log('\n🎯 New TP/SL (based on entry price ₹' + entryPrice + '):');
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)} (${(accountConfig.targetPricePercentage * 100).toFixed(1)}% above entry price)`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)} (${(accountConfig.stopLossPercentage * 100).toFixed(2)}% below entry price)`);

  console.log('\n📈 Rebase Adjustments:');
  console.log(`  Target Price Change: ₹${targetPriceDifference.toFixed(2)} (${((targetPriceDifference/originalTargetPrice)*100).toFixed(2)}%)`);
  console.log(`  Stop Loss Change: ₹${stopLossDifference.toFixed(2)} (${((stopLossDifference/originalStopLossPrice)*100).toFixed(2)}%)`);

  // Calculate potential profit/loss impact
  const quantity = 100; // Assume 100 shares for calculation
  const originalProfit = (originalTargetPrice - alertPrice) * quantity;
  const newProfit = (newTargetPrice - entryPrice) * quantity;
  const originalLoss = (alertPrice - originalStopLossPrice) * quantity;
  const newLoss = (entryPrice - newStopLossPrice) * quantity;

  console.log('\n💰 Impact Analysis (assuming 100 shares):');
  console.log(`  Original Expected Profit: ₹${originalProfit.toFixed(2)}`);
  console.log(`  New Expected Profit: ₹${newProfit.toFixed(2)}`);
  console.log(`  Profit Difference: ₹${(newProfit - originalProfit).toFixed(2)}`);
  console.log(`  Original Max Loss: ₹${originalLoss.toFixed(2)}`);
  console.log(`  New Max Loss: ₹${newLoss.toFixed(2)}`);
  console.log(`  Loss Difference: ₹${(newLoss - originalLoss).toFixed(2)}`);

  return {
    shouldRebase: true,
    originalTargetPrice,
    originalStopLossPrice,
    newTargetPrice,
    newStopLossPrice,
    targetPriceDifference,
    stopLossDifference,
    priceDifferencePercentage,
    threshold: accountConfig.rebaseThresholdPercentage,
    profitImpact: newProfit - originalProfit,
    lossImpact: newLoss - originalLoss
  };
}

console.log('🚀 Rebase Calculation Validation Test');
console.log('=====================================');
console.log('');

// Your specific scenario
const alertPrice = 250.50;
const entryPrice = 250.15;

console.log(`📊 Your Test Scenario:`);
console.log(`Alert Price: ₹${alertPrice}`);
console.log(`Entry Price: ₹${entryPrice}`);
console.log(`Price Difference: ₹${Math.abs(entryPrice - alertPrice).toFixed(2)} (${((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2)}%)`);
console.log('');

// Test with different threshold configurations for DHAN_CLIENT_ID_1
const testConfigs = [
  {
    name: 'DHAN_CLIENT_ID_1 - Default Threshold (0.1%)',
    config: {
      clientId: 'DHAN_CLIENT_ID_1',
      targetPricePercentage: 0.01, // 1% target
      stopLossPercentage: 0.0075,  // 0.75% stop loss
      rebaseTpAndSl: true,
      rebaseThresholdPercentage: 0.1
    }
  },
  {
    name: 'DHAN_CLIENT_ID_1 - High Sensitivity (0.05%)',
    config: {
      clientId: 'DHAN_CLIENT_ID_1',
      targetPricePercentage: 0.01,
      stopLossPercentage: 0.0075,
      rebaseTpAndSl: true,
      rebaseThresholdPercentage: 0.05
    }
  },
  {
    name: 'DHAN_CLIENT_ID_1 - Low Sensitivity (0.2%)',
    config: {
      clientId: 'DHAN_CLIENT_ID_1',
      targetPricePercentage: 0.01,
      stopLossPercentage: 0.0075,
      rebaseTpAndSl: true,
      rebaseThresholdPercentage: 0.2
    }
  },
  {
    name: 'DHAN_CLIENT_ID_1 - Rebase Disabled',
    config: {
      clientId: 'DHAN_CLIENT_ID_1',
      targetPricePercentage: 0.01,
      stopLossPercentage: 0.0075,
      rebaseTpAndSl: false,
      rebaseThresholdPercentage: 0.1
    }
  }
];

const results = [];

testConfigs.forEach(testConfig => {
  const result = testRebaseValidation(alertPrice, entryPrice, testConfig.config, testConfig.name);
  results.push({ config: testConfig.name, ...result });
});

// Summary
console.log('\n📋 SUMMARY');
console.log('==========');
console.log(`Test Scenario: Alert ₹${alertPrice} → Entry ₹${entryPrice} (${((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2)}% difference)`);
console.log('');

results.forEach(result => {
  const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
  const reason = result.reason ? ` (${result.reason})` : '';
  console.log(`${status} - ${result.config}${reason}`);
});

console.log('\n💡 Key Insights:');
const priceDiff = ((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2);
console.log(`- Your scenario has a ${priceDiff}% price difference`);
console.log(`- Entry price is ₹${(entryPrice - alertPrice).toFixed(2)} LOWER than alert price`);
console.log(`- This is a DOWNWARD price movement (entry < alert)`);

const rebaseResults = results.filter(r => r.shouldRebase);
if (rebaseResults.length > 0) {
  console.log(`- Rebase will be triggered on ${rebaseResults.length} configuration(s)`);
  rebaseResults.forEach(r => {
    console.log(`  • ${r.config}: TP ₹${r.originalTargetPrice.toFixed(2)} → ₹${r.newTargetPrice.toFixed(2)}, SL ₹${r.originalStopLossPrice.toFixed(2)} → ₹${r.newStopLossPrice.toFixed(2)}`);
  });
} else {
  console.log('- No rebase will be triggered with current configurations');
}

console.log('\n🔧 Environment Variable for Your Account:');
console.log('REBASE_THRESHOLD_PERCENTAGE_1=0.1  # This will trigger rebase for your scenario');
