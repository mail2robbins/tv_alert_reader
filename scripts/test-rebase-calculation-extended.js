/**
 * Extended test script to validate TP/SL rebase calculations
 * Tests multiple scenarios including the threshold behavior
 */

function testRebaseCalculation(alertPrice, entryPrice, accountConfig, scenarioName) {
  console.log(`\n🧮 ${scenarioName}`);
  console.log('='.repeat(50));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)} (${priceDifferencePercentage.toFixed(2)}%)`);
  
  // Check if rebase should be triggered (threshold: 0.5%)
  const shouldRebase = priceDifferencePercentage >= 0.5;
  console.log(`Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'} (threshold: 0.5%)`);
  
  if (!shouldRebase) {
    console.log('✅ Price difference is minimal, no rebase needed');
    return { shouldRebase: false, priceDifferencePercentage };
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
    priceDifferencePercentage
  };
}

// Account configuration
const accountConfig = {
  clientId: 'DHAN_CLIENT_ID_1',
  targetPricePercentage: 0.01, // 1% target
  stopLossPercentage: 0.0075,  // 0.75% stop loss
  rebaseTpAndSl: true
};

console.log('🚀 TP/SL Rebase Calculation Test - Multiple Scenarios');
console.log('=====================================================');

// Test scenarios
const scenarios = [
  {
    name: 'Your Original Scenario (Below Threshold)',
    alertPrice: 250.50,
    entryPrice: 251.45
  },
  {
    name: 'Scenario 1: Above Threshold (Higher Entry)',
    alertPrice: 250.50,
    entryPrice: 252.00  // 0.6% difference
  },
  {
    name: 'Scenario 2: Above Threshold (Lower Entry)',
    alertPrice: 250.50,
    entryPrice: 249.25  // 0.5% difference
  },
  {
    name: 'Scenario 3: Large Difference',
    alertPrice: 250.50,
    entryPrice: 255.00  // 1.8% difference
  }
];

const results = [];

scenarios.forEach(scenario => {
  const result = testRebaseCalculation(
    scenario.alertPrice, 
    scenario.entryPrice, 
    accountConfig, 
    scenario.name
  );
  results.push({ scenario: scenario.name, ...result });
});

// Summary
console.log('\n📋 SUMMARY');
console.log('==========');
results.forEach(result => {
  const priceDiff = result.priceDifferencePercentage;
  console.log(`${result.shouldRebase ? '✅' : '❌'} ${result.scenario}: ${priceDiff.toFixed(2)}% difference`);
});

console.log('\n💡 Key Insights:');
console.log('- Rebase threshold is 0.5% price difference');
console.log('- Your original scenario (0.38% difference) does NOT trigger rebase');
console.log('- Scenarios with ≥0.5% difference WILL trigger rebase');
console.log('- Rebase maintains the same percentage margins on actual entry price');
