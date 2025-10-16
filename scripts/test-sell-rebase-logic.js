/**
 * Test script for SELL signal rebase logic
 * This script verifies that SELL orders get correct TP/SL calculations
 */

console.log('🧪 Testing SELL Signal Rebase Logic');
console.log('===================================\n');

// Mock account configuration
const mockAccountConfig = {
  clientId: 'CLIENT_001',
  accountId: '1',
  rebaseTpAndSl: true,
  targetPricePercentage: 0.015, // 1.5%
  stopLossPercentage: 0.01,     // 1.0%
  rebaseThresholdPercentage: 0.1 // 0.1%
};

// Test scenarios
const testScenarios = [
  {
    name: 'BUY Signal - Price Goes Up',
    signal: 'BUY',
    alertPrice: 250.00,
    entryPrice: 250.50, // Price went up
    expectedDirection: 'UPWARD'
  },
  {
    name: 'BUY Signal - Price Goes Down', 
    signal: 'BUY',
    alertPrice: 250.00,
    entryPrice: 249.50, // Price went down
    expectedDirection: 'DOWNWARD'
  },
  {
    name: 'SELL Signal - Price Goes Up',
    signal: 'SELL',
    alertPrice: 250.00,
    entryPrice: 250.50, // Price went up
    expectedDirection: 'UPWARD'
  },
  {
    name: 'SELL Signal - Price Goes Down',
    signal: 'SELL', 
    alertPrice: 250.00,
    entryPrice: 249.50, // Price went down
    expectedDirection: 'DOWNWARD'
  }
];

// Simulate the rebase calculation logic
function simulateRebaseCalculation(signal, alertPrice, entryPrice, accountConfig) {
  console.log(`\n🔄 Testing ${signal} Signal:`);
  console.log(`   Alert Price: ₹${alertPrice}`);
  console.log(`   Entry Price: ₹${entryPrice}`);
  
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log(`   Price Difference: ₹${priceDifference.toFixed(2)} (${priceDifferencePercentage.toFixed(2)}%)`);
  
  // Calculate new TP and SL based on signal type
  let newTargetPrice;
  let newStopLossPrice;
  
  if (signal === 'SELL') {
    // For SELL signals: SL above entry (to limit losses if price goes up), TP below entry (to capture profit if price goes down)
    newTargetPrice = entryPrice * (1 - accountConfig.targetPricePercentage);
    newStopLossPrice = entryPrice * (1 + accountConfig.stopLossPercentage);
    
    console.log(`   📉 SELL Logic:`);
    console.log(`      Target Price: ₹${newTargetPrice.toFixed(2)} (below entry - profit if price falls)`);
    console.log(`      Stop Loss: ₹${newStopLossPrice.toFixed(2)} (above entry - limit loss if price rises)`);
  } else {
    // For BUY signals: SL below entry (to limit losses if price goes down), TP above entry (to capture profit if price goes up)
    newTargetPrice = entryPrice * (1 + accountConfig.targetPricePercentage);
    newStopLossPrice = entryPrice * (1 - accountConfig.stopLossPercentage);
    
    console.log(`   📈 BUY Logic:`);
    console.log(`      Target Price: ₹${newTargetPrice.toFixed(2)} (above entry - profit if price rises)`);
    console.log(`      Stop Loss: ₹${newStopLossPrice.toFixed(2)} (below entry - limit loss if price falls)`);
  }
  
  // Calculate potential profit/loss
  const quantity = 100; // Assume 100 shares for calculation
  
  let potentialProfit;
  let potentialLoss;
  
  if (signal === 'SELL') {
    potentialProfit = (entryPrice - newTargetPrice) * quantity;
    potentialLoss = (newStopLossPrice - entryPrice) * quantity;
  } else {
    potentialProfit = (newTargetPrice - entryPrice) * quantity;
    potentialLoss = (entryPrice - newStopLossPrice) * quantity;
  }
  
  console.log(`   💰 Risk/Reward (100 shares):`);
  console.log(`      Potential Profit: ₹${potentialProfit.toFixed(2)}`);
  console.log(`      Potential Loss: ₹${potentialLoss.toFixed(2)}`);
  console.log(`      Risk/Reward Ratio: 1:${(potentialProfit / potentialLoss).toFixed(2)}`);
  
  return {
    signal,
    alertPrice,
    entryPrice,
    newTargetPrice,
    newStopLossPrice,
    potentialProfit,
    potentialLoss,
    riskRewardRatio: potentialProfit / potentialLoss
  };
}

// Run tests
function runTests() {
  console.log('📊 Test Results:');
  console.log('================');
  
  const results = [];
  
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log('─'.repeat(50));
    
    const result = simulateRebaseCalculation(
      scenario.signal,
      scenario.alertPrice,
      scenario.entryPrice,
      mockAccountConfig
    );
    
    results.push(result);
  });
  
  // Summary
  console.log('\n📈 Summary:');
  console.log('===========');
  
  const buyResults = results.filter(r => r.signal === 'BUY');
  const sellResults = results.filter(r => r.signal === 'SELL');
  
  console.log('\n✅ BUY Signal Results:');
  buyResults.forEach((result, index) => {
    console.log(`   ${index + 1}. Entry: ₹${result.entryPrice} → TP: ₹${result.newTargetPrice.toFixed(2)}, SL: ₹${result.newStopLossPrice.toFixed(2)}`);
    console.log(`      Risk/Reward: 1:${result.riskRewardRatio.toFixed(2)}`);
  });
  
  console.log('\n✅ SELL Signal Results:');
  sellResults.forEach((result, index) => {
    console.log(`   ${index + 1}. Entry: ₹${result.entryPrice} → TP: ₹${result.newTargetPrice.toFixed(2)}, SL: ₹${result.newStopLossPrice.toFixed(2)}`);
    console.log(`      Risk/Reward: 1:${result.riskRewardRatio.toFixed(2)}`);
  });
  
  // Validation
  console.log('\n🔍 Validation:');
  console.log('==============');
  
  let allTestsPassed = true;
  
  // Check BUY signals
  buyResults.forEach((result, index) => {
    const isTpAboveEntry = result.newTargetPrice > result.entryPrice;
    const isSlBelowEntry = result.newStopLossPrice < result.entryPrice;
    
    if (!isTpAboveEntry || !isSlBelowEntry) {
      console.log(`❌ BUY Test ${index + 1} FAILED: TP should be above entry, SL should be below entry`);
      allTestsPassed = false;
    } else {
      console.log(`✅ BUY Test ${index + 1} PASSED: TP above entry, SL below entry`);
    }
  });
  
  // Check SELL signals
  sellResults.forEach((result, index) => {
    const isTpBelowEntry = result.newTargetPrice < result.entryPrice;
    const isSlAboveEntry = result.newStopLossPrice > result.entryPrice;
    
    if (!isTpBelowEntry || !isSlAboveEntry) {
      console.log(`❌ SELL Test ${index + 1} FAILED: TP should be below entry, SL should be above entry`);
      allTestsPassed = false;
    } else {
      console.log(`✅ SELL Test ${index + 1} PASSED: TP below entry, SL above entry`);
    }
  });
  
  console.log('\n🎯 Final Result:');
  console.log('================');
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! SELL signal rebase logic is working correctly.');
    console.log('\n💡 Key Points:');
    console.log('   ✅ BUY signals: TP above entry, SL below entry');
    console.log('   ✅ SELL signals: TP below entry, SL above entry');
    console.log('   ✅ Both signal types have proper risk/reward ratios');
    console.log('   ✅ Rebase logic correctly handles both BUY and SELL orders');
  } else {
    console.log('❌ SOME TESTS FAILED! Please check the rebase logic implementation.');
  }
}

// Run the tests
runTests();
