/**
 * Test script to calculate rebase logic for multiple scenarios using env.example configuration
 * Tests all user-provided alert price and entry price combinations
 */

// Simulate the rebase logic based on env.example configuration
function simulateRebaseLogic(alertPrice, entryPrice, accountConfig, scenarioName) {
  console.log(`\n🧮 ${scenarioName} - Account ${accountConfig.accountId}`);
  console.log('='.repeat(70));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Rebase Enabled: ${accountConfig.rebaseTpAndSl ? 'YES' : 'NO'}`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  console.log(`Target %: ${(accountConfig.targetPricePercentage * 100).toFixed(1)}%`);
  console.log(`Stop Loss %: ${(accountConfig.stopLossPercentage * 100).toFixed(2)}%`);
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log(`\n📊 Price Analysis:`);
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log(`Direction: ${entryPrice > alertPrice ? 'UPWARD' : 'DOWNWARD'}`);
  
  // Check if rebase should be triggered
  const shouldRebase = accountConfig.rebaseTpAndSl && priceDifferencePercentage >= accountConfig.rebaseThresholdPercentage;
  console.log(`\n🔄 Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'}`);
  
  if (!accountConfig.rebaseTpAndSl) {
    console.log('❌ Rebase is disabled for this account');
    return { shouldRebase: false, reason: 'Rebase disabled', priceDifferencePercentage };
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

  console.log(`\n🎯 Original TP/SL (based on alert price):`);
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)}`);

  console.log(`\n🎯 New TP/SL (based on entry price):`);
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);

  console.log(`\n📈 Rebase Adjustments:`);
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
    threshold: accountConfig.rebaseThresholdPercentage
  };
}

console.log('🚀 Multiple Scenarios Rebase Logic Test - env.example Configuration');
console.log('================================================================');
console.log('');

// All test scenarios from user
const testScenarios = [
  {
    name: 'Scenario 1: Small Downward Movement',
    alertPrice: 250.50,
    entryPrice: 250.15
  },
  {
    name: 'Scenario 2: Small Upward Movement',
    alertPrice: 120.00,
    entryPrice: 120.75
  },
  {
    name: 'Scenario 3: Small Upward Movement (High Price)',
    alertPrice: 760.50,
    entryPrice: 760.95
  },
  {
    name: 'Scenario 4: Small Downward Movement (High Price)',
    alertPrice: 760.50,
    entryPrice: 759.95
  },
  {
    name: 'Scenario 5: Small Downward Movement (Medium Price)',
    alertPrice: 431.50,
    entryPrice: 431.15
  },
  {
    name: 'Scenario 6: Small Upward Movement (Medium Price)',
    alertPrice: 578.34,
    entryPrice: 579.05
  }
];

// Account configurations from env.example
const accountConfigs = [
  {
    accountId: 1,
    clientId: 'ACCOUNT_1',
    targetPricePercentage: 0.015, // 1.5% from env.example
    stopLossPercentage: 0.01,     // 1.0% from env.example
    rebaseTpAndSl: true,
    rebaseThresholdPercentage: 0.1
  },
  {
    accountId: 2,
    clientId: 'ACCOUNT_2',
    targetPricePercentage: 0.018, // 1.8% from env.example
    stopLossPercentage: 0.012,    // 1.2% from env.example
    rebaseTpAndSl: false,         // Disabled in env.example
    rebaseThresholdPercentage: 0.2
  },
  {
    accountId: 3,
    clientId: 'ACCOUNT_3',
    targetPricePercentage: 0.02,  // 2.0% from env.example
    stopLossPercentage: 0.008,    // 0.8% from env.example
    rebaseTpAndSl: true,
    rebaseThresholdPercentage: 0.05
  },
  {
    accountId: 4,
    clientId: 'ACCOUNT_4',
    targetPricePercentage: 0.012, // 1.2% from env.example
    stopLossPercentage: 0.015,    // 1.5% from env.example
    rebaseTpAndSl: false,         // Disabled in env.example
    rebaseThresholdPercentage: 0.3
  },
  {
    accountId: 5,
    clientId: 'ACCOUNT_5',
    targetPricePercentage: 0.025, // 2.5% from env.example
    stopLossPercentage: 0.01,     // 1.0% from env.example
    rebaseTpAndSl: true,
    rebaseThresholdPercentage: 0.15
  }
];

// Test each scenario
testScenarios.forEach(scenario => {
  console.log(`\n🎯 ${scenario.name}`);
  console.log(`Alert: ₹${scenario.alertPrice} → Entry: ₹${scenario.entryPrice}`);
  const priceDiff = ((Math.abs(scenario.entryPrice - scenario.alertPrice) / scenario.alertPrice) * 100).toFixed(2);
  console.log(`Price Difference: ${priceDiff}%`);
  console.log('='.repeat(80));
  
  const results = [];
  
  accountConfigs.forEach(accountConfig => {
    const result = simulateRebaseLogic(scenario.alertPrice, scenario.entryPrice, accountConfig, scenario.name);
    results.push({ account: accountConfig.clientId, accountId: accountConfig.accountId, ...result });
  });
  
  // Summary for this scenario
  console.log(`\n📋 ${scenario.name} Summary:`);
  results.forEach(result => {
    const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
    const reason = result.reason ? ` (${result.reason})` : '';
    console.log(`  ${status} - Account ${result.accountId} (${result.account})${reason}`);
  });
});

// Overall summary
console.log('\n📊 OVERALL SUMMARY');
console.log('==================');
console.log('');

testScenarios.forEach(scenario => {
  const priceDiff = ((Math.abs(scenario.entryPrice - scenario.alertPrice) / scenario.alertPrice) * 100).toFixed(2);
  console.log(`${scenario.name}: ${priceDiff}% difference`);
});

console.log('\n🔧 Account Configuration Summary:');
console.log('=================================');
accountConfigs.forEach(account => {
  console.log(`Account ${account.accountId}: Rebase=${account.rebaseTpAndSl ? 'Enabled' : 'Disabled'}, Threshold=${account.rebaseThresholdPercentage}%, Target=${(account.targetPricePercentage * 100).toFixed(1)}%, SL=${(account.stopLossPercentage * 100).toFixed(2)}%`);
});

console.log('\n💡 Rebase Threshold Analysis:');
console.log('=============================');
console.log('• Account 1: 0.1% threshold - Will rebase on most movements');
console.log('• Account 2: Rebase disabled - No rebase ever');
console.log('• Account 3: 0.05% threshold - Most sensitive, rebases on smallest movements');
console.log('• Account 4: Rebase disabled - No rebase ever');
console.log('• Account 5: 0.15% threshold - Least sensitive among enabled accounts');

console.log('\n📈 Price Difference Analysis:');
console.log('=============================');
testScenarios.forEach(scenario => {
  const priceDiff = ((Math.abs(scenario.entryPrice - scenario.alertPrice) / scenario.alertPrice) * 100).toFixed(2);
  const direction = scenario.entryPrice > scenario.alertPrice ? 'UP' : 'DOWN';
  console.log(`${scenario.name}: ${priceDiff}% ${direction}`);
});
