/**
 * Test script to validate the new configurable rebase threshold
 * Tests different threshold values with the same price scenario
 */

function testConfigurableRebaseThreshold(alertPrice, entryPrice, thresholdPercentage, scenarioName) {
  console.log(`\n🧮 ${scenarioName}`);
  console.log('='.repeat(60));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Threshold: ${thresholdPercentage}%`);
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)} (${priceDifferencePercentage.toFixed(2)}%)`);
  
  // Check if rebase should be triggered with configurable threshold
  const shouldRebase = priceDifferencePercentage >= thresholdPercentage;
  console.log(`Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'} (threshold: ${thresholdPercentage}%)`);
  
  if (!shouldRebase) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${thresholdPercentage}%), skipping rebase`);
    return { shouldRebase: false, priceDifferencePercentage, thresholdPercentage };
  }

  // Account configuration
  const accountConfig = {
    targetPricePercentage: 0.01, // 1% target
    stopLossPercentage: 0.0075,  // 0.75% stop loss
    rebaseThresholdPercentage: thresholdPercentage
  };

  // Calculate original TP/SL based on alert price
  const originalTargetPrice = alertPrice * (1 + accountConfig.targetPricePercentage);
  const originalStopLossPrice = alertPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate new TP/SL based on actual entry price
  const newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);

  // Calculate the differences
  const targetPriceDifference = newTargetPrice - originalTargetPrice;
  const stopLossDifference = newStopLossPrice - originalStopLossPrice;

  console.log('\n🎯 Original TP/SL (based on alert price):');
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)}`);

  console.log('\n🎯 New TP/SL (based on entry price):');
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);

  console.log('\n📈 Rebase Adjustments:');
  console.log(`  Target Price Change: ₹${targetPriceDifference.toFixed(2)} (${((targetPriceDifference/originalTargetPrice)*100).toFixed(2)}%)`);
  console.log(`  Stop Loss Change: ₹${stopLossDifference.toFixed(2)} (${((stopLossDifference/originalStopLossPrice)*100).toFixed(2)}%)`);

  return {
    shouldRebase: true,
    originalTargetPrice,
    originalStopLossPrice,
    newTargetPrice,
    newStopLossPrice,
    targetPriceDifference,
    stopLossDifference,
    priceDifferencePercentage,
    thresholdPercentage
  };
}

console.log('🚀 Configurable Rebase Threshold Test');
console.log('=====================================');
console.log('Testing your scenario with different threshold values');
console.log('');

// Your specific scenario
const alertPrice = 250.50;
const entryPrice = 251.45;
const priceDifferencePercentage = ((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2);

console.log(`📊 Your Scenario: Alert ₹${alertPrice} → Entry ₹${entryPrice} (${priceDifferencePercentage}% difference)`);
console.log('');

// Test different threshold values
const thresholds = [
  { value: 0.05, name: 'Very Low Threshold (0.05%)' },
  { value: 0.1, name: 'New Default Threshold (0.1%)' },
  { value: 0.2, name: 'Low Threshold (0.2%)' },
  { value: 0.5, name: 'Old Default Threshold (0.5%)' },
  { value: 1.0, name: 'High Threshold (1.0%)' }
];

const results = [];

thresholds.forEach(threshold => {
  const result = testConfigurableRebaseThreshold(
    alertPrice, 
    entryPrice, 
    threshold.value, 
    threshold.name
  );
  results.push({ threshold: threshold.name, ...result });
});

// Summary
console.log('\n📋 SUMMARY');
console.log('==========');
console.log(`Your scenario: ${priceDifferencePercentage}% price difference`);
console.log('');

results.forEach(result => {
  const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
  console.log(`${status} - ${result.threshold}`);
});

console.log('\n💡 Key Insights:');
console.log(`- With 0.1% threshold (new default): Your scenario WILL trigger rebase`);
console.log(`- With 0.5% threshold (old default): Your scenario would NOT trigger rebase`);
console.log(`- You can now configure per-account thresholds via environment variables:`);
console.log(`  REBASE_THRESHOLD_PERCENTAGE_1=0.1  # For account 1`);
console.log(`  REBASE_THRESHOLD_PERCENTAGE_2=0.2  # For account 2`);
console.log(`  REBASE_THRESHOLD_PERCENTAGE_3=0.05 # For account 3`);

console.log('\n🔧 Environment Variable Examples:');
console.log('# For numbered accounts');
console.log('REBASE_THRESHOLD_PERCENTAGE_1=0.1');
console.log('REBASE_THRESHOLD_PERCENTAGE_2=0.2');
console.log('REBASE_THRESHOLD_PERCENTAGE_3=0.05');
console.log('');
console.log('# For legacy configuration');
console.log('REBASE_THRESHOLD_PERCENTAGE=0.1');
