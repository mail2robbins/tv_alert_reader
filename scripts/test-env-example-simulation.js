/**
 * Test script to simulate rebase logic for all accounts in env.example
 * Alert Price: ₹250.50, Entry Price: ₹250.15
 * This simulates what would happen if the env.example values were actual configurations
 */

// Simulate the rebase logic based on env.example configuration
function simulateRebaseLogic(alertPrice, entryPrice, accountConfig) {
  console.log(`\n🧮 Account ${accountConfig.accountId} - ${accountConfig.clientId}`);
  console.log('='.repeat(60));
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Rebase Enabled: ${accountConfig.rebaseTpAndSl ? 'YES' : 'NO'}`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  console.log(`Target %: ${(accountConfig.targetPricePercentage * 100).toFixed(1)}%`);
  console.log(`Stop Loss %: ${(accountConfig.stopLossPercentage * 100).toFixed(2)}%`);
  console.log('');
  
  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log('📊 Price Analysis:');
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log(`Direction: ${entryPrice > alertPrice ? 'UPWARD' : 'DOWNWARD'}`);
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

  console.log('\n🎯 Original TP/SL (based on alert price):');
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)}`);

  console.log('\n🎯 New TP/SL (based on entry price):');
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);

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

console.log('🚀 Rebase Logic Simulation - env.example Configuration');
console.log('=====================================================');
console.log('');

// Your specific test scenario
const alertPrice = 250.50;
const entryPrice = 250.15;
const priceDifferencePercentage = ((Math.abs(entryPrice - alertPrice) / alertPrice) * 100).toFixed(2);

console.log(`📊 Test Scenario:`);
console.log(`Alert Price: ₹${alertPrice}`);
console.log(`Entry Price: ₹${entryPrice}`);
console.log(`Price Difference: ₹${Math.abs(entryPrice - alertPrice).toFixed(2)} (${priceDifferencePercentage}%)`);
console.log(`Direction: ${entryPrice > alertPrice ? 'UPWARD' : 'DOWNWARD'}`);
console.log('');

// Simulate all accounts from env.example configuration
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

const results = [];

accountConfigs.forEach(accountConfig => {
  const result = simulateRebaseLogic(alertPrice, entryPrice, accountConfig);
  results.push({ account: accountConfig.clientId, accountId: accountConfig.accountId, ...result });
});

// Summary
console.log('\n📋 SUMMARY');
console.log('==========');
console.log(`Test Scenario: Alert ₹${alertPrice} → Entry ₹${entryPrice} (${priceDifferencePercentage}% difference)`);
console.log('');

results.forEach(result => {
  const status = result.shouldRebase ? '✅ REBASE' : '❌ NO REBASE';
  const reason = result.reason ? ` (${result.reason})` : '';
  console.log(`${status} - Account ${result.accountId} (${result.account})${reason}`);
});

console.log('\n💡 Key Insights:');
const rebaseResults = results.filter(r => r.shouldRebase);
if (rebaseResults.length > 0) {
  console.log(`- ${rebaseResults.length} account(s) will trigger rebase:`);
  rebaseResults.forEach(r => {
    console.log(`  • Account ${r.accountId}: TP ₹${r.originalTargetPrice.toFixed(2)} → ₹${r.newTargetPrice.toFixed(2)}, SL ₹${r.originalStopLossPrice.toFixed(2)} → ₹${r.newStopLossPrice.toFixed(2)}`);
  });
} else {
  console.log('- No accounts will trigger rebase with current configuration');
}

const noRebaseResults = results.filter(r => !r.shouldRebase);
if (noRebaseResults.length > 0) {
  console.log(`- ${noRebaseResults.length} account(s) will NOT trigger rebase:`);
  noRebaseResults.forEach(r => {
    console.log(`  • Account ${r.accountId}: ${r.reason}`);
  });
}

console.log('\n🔧 env.example Configuration Summary:');
console.log('=====================================');
console.log('Account 1: Rebase=Enabled, Threshold=0.1%, Target=1.5%, SL=1.0%');
console.log('Account 2: Rebase=Disabled, Threshold=0.2%, Target=1.8%, SL=1.2%');
console.log('Account 3: Rebase=Enabled, Threshold=0.05%, Target=2.0%, SL=0.8%');
console.log('Account 4: Rebase=Disabled, Threshold=0.3%, Target=1.2%, SL=1.5%');
console.log('Account 5: Rebase=Enabled, Threshold=0.15%, Target=2.5%, SL=1.0%');
console.log('');
console.log(`📊 Your scenario (${priceDifferencePercentage}% difference) will trigger rebase on:`);
results.filter(r => r.shouldRebase).forEach(r => {
  console.log(`  • Account ${r.accountId} (threshold: ${r.threshold}%)`);
});
console.log('');
console.log(`📊 Your scenario will NOT trigger rebase on:`);
results.filter(r => !r.shouldRebase).forEach(r => {
  console.log(`  • Account ${r.accountId}: ${r.reason}`);
});
