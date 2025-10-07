/**
 * Test script to verify the new configurable rebase threshold works correctly
 * This simulates the actual system behavior with different threshold configurations
 */

// Simulate the account configuration loading
function simulateAccountConfig(accountId, thresholdPercentage) {
  return {
    accountId: accountId,
    clientId: `DHAN_CLIENT_ID_${accountId}`,
    targetPricePercentage: 0.01, // 1% target
    stopLossPercentage: 0.0075,  // 0.75% stop loss
    rebaseTpAndSl: true,
    rebaseThresholdPercentage: thresholdPercentage
  };
}

// Simulate the rebase logic from dhanApi.ts
function simulateRebaseLogic(alertPrice, entryPrice, accountConfig) {
  console.log(`\n🧪 Testing Account ${accountConfig.accountId} (${accountConfig.clientId})`);
  console.log('='.repeat(60));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Configured Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)} (${priceDifferencePercentage.toFixed(2)}%)`);
  
  // Use account-specific rebase threshold
  const rebaseThreshold = accountConfig.rebaseThresholdPercentage || 0.1;
  
  // Check if rebase should be triggered
  const shouldRebase = priceDifferencePercentage >= rebaseThreshold;
  
  console.log(`Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'} (threshold: ${rebaseThreshold}%)`);
  
  if (!shouldRebase) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${rebaseThreshold}%), skipping rebase`);
    return { shouldRebase: false, priceDifferencePercentage, threshold: rebaseThreshold };
  }

  // Calculate rebase adjustments
  const originalTargetPrice = alertPrice * (1 + accountConfig.targetPricePercentage);
  const originalStopLossPrice = alertPrice * (1 - accountConfig.stopLossPercentage);
  const newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);

  console.log('\n🎯 Rebase Calculation:');
  console.log(`  Original TP: ₹${originalTargetPrice.toFixed(2)} → New TP: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Original SL: ₹${originalStopLossPrice.toFixed(2)} → New SL: ₹${newStopLossPrice.toFixed(2)}`);
  console.log(`  TP Change: ₹${(newTargetPrice - originalTargetPrice).toFixed(2)}`);
  console.log(`  SL Change: ₹${(newStopLossPrice - originalStopLossPrice).toFixed(2)}`);

  return {
    shouldRebase: true,
    priceDifferencePercentage,
    threshold: rebaseThreshold,
    originalTargetPrice,
    originalStopLossPrice,
    newTargetPrice,
    newStopLossPrice
  };
}

console.log('🚀 Testing New Configurable Rebase Threshold');
console.log('============================================');
console.log('');

// Test scenario: Your original case
const alertPrice = 250.50;
const entryPrice = 251.45;
const priceDifferencePercentage = ((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2);

console.log(`📊 Test Scenario: Alert ₹${alertPrice} → Entry ₹${entryPrice} (${priceDifferencePercentage}% difference)`);
console.log('');

// Test different account configurations
const accountConfigs = [
  { id: 1, threshold: 0.1, description: 'Account 1 - Default (0.1%)' },
  { id: 2, threshold: 0.2, description: 'Account 2 - Low Sensitivity (0.2%)' },
  { id: 3, threshold: 0.05, description: 'Account 3 - High Sensitivity (0.05%)' },
  { id: 4, threshold: 0.3, description: 'Account 4 - Very Low Sensitivity (0.3%)' },
  { id: 5, threshold: 0.15, description: 'Account 5 - Medium Sensitivity (0.15%)' }
];

const results = [];

accountConfigs.forEach(config => {
  const accountConfig = simulateAccountConfig(config.id, config.threshold);
  const result = simulateRebaseLogic(alertPrice, entryPrice, accountConfig);
  results.push({ 
    account: config.description, 
    threshold: config.threshold,
    ...result 
  });
});

// Summary
console.log('\n📋 SUMMARY');
console.log('==========');
console.log(`Test Scenario: ${priceDifferencePercentage}% price difference`);
console.log('');

results.forEach(result => {
  const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
  console.log(`${status} - ${result.account}`);
});

console.log('\n💡 Key Insights:');
console.log(`- Your scenario (${priceDifferencePercentage}% difference) will trigger rebase on:`);
results.filter(r => r.shouldRebase).forEach(r => {
  console.log(`  • ${r.account} (threshold: ${r.threshold}%)`);
});

console.log(`- Your scenario will NOT trigger rebase on:`);
results.filter(r => !r.shouldRebase).forEach(r => {
  console.log(`  • ${r.account} (threshold: ${r.threshold}%)`);
});

console.log('\n🔧 Environment Variable Configuration:');
console.log('# Example configuration for different sensitivity levels');
console.log('REBASE_THRESHOLD_PERCENTAGE_1=0.1   # Default - moderate sensitivity');
console.log('REBASE_THRESHOLD_PERCENTAGE_2=0.2   # Low sensitivity - only large differences');
console.log('REBASE_THRESHOLD_PERCENTAGE_3=0.05  # High sensitivity - small differences trigger');
console.log('REBASE_THRESHOLD_PERCENTAGE_4=0.3   # Very low sensitivity - only major differences');
console.log('REBASE_THRESHOLD_PERCENTAGE_5=0.15  # Medium sensitivity');

console.log('\n🎯 UI Display:');
console.log('- The new "Rebase Threshold" will be displayed in the Account Details section');
console.log('- Each account shows its configured threshold percentage');
console.log('- Example: "Rebase Threshold: 0.1%" for Account 1');
