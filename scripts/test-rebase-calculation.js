/**
 * Test script to validate TP/SL rebase calculations
 * Tests the rebase logic with specific alert price and entry price
 */

// Mock the rebase calculation logic
function testRebaseCalculation(alertPrice, entryPrice, accountConfig) {
  console.log('🧮 Testing TP/SL Rebase Calculation');
  console.log('=====================================');
  console.log(`Alert Price: ₹${alertPrice}`);
  console.log(`Entry Price: ₹${entryPrice}`);
  console.log(`Account Config:`, accountConfig);
  console.log('');

  // Calculate price difference
  const priceDifference = Math.abs(entryPrice - alertPrice);
  const priceDifferencePercentage = (priceDifference / alertPrice) * 100;
  
  console.log('📊 Price Analysis:');
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log('');

  // Check if rebase should be triggered (threshold: 0.5%)
  const shouldRebase = priceDifferencePercentage >= 0.5;
  console.log(`🔄 Should Rebase: ${shouldRebase ? 'YES' : 'NO'} (threshold: 0.5%)`);
  console.log('');

  if (!shouldRebase) {
    console.log('✅ Price difference is minimal, no rebase needed');
    return {
      shouldRebase: false,
      reason: 'Price difference minimal',
      priceDifferencePercentage
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

  console.log('🎯 Original TP/SL (based on alert price):');
  console.log(`  Target Price: ₹${originalTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${originalStopLossPrice.toFixed(2)}`);
  console.log('');

  console.log('🎯 New TP/SL (based on entry price):');
  console.log(`  Target Price: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);
  console.log('');

  console.log('📈 Rebase Adjustments:');
  console.log(`  Target Price Change: ₹${targetPriceDifference.toFixed(2)} (${((targetPriceDifference/originalTargetPrice)*100).toFixed(2)}%)`);
  console.log(`  Stop Loss Change: ₹${stopLossDifference.toFixed(2)} (${((stopLossDifference/originalStopLossPrice)*100).toFixed(2)}%)`);
  console.log('');

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

// Test with your specific scenario
const alertPrice = 250.50;
const entryPrice = 251.45;

// Mock account configuration for DHAN_CLIENT_ID_1
const accountConfig = {
  clientId: 'DHAN_CLIENT_ID_1',
  targetPricePercentage: 0.01, // 1% target
  stopLossPercentage: 0.0075,  // 0.75% stop loss
  rebaseTpAndSl: true
};

console.log('🚀 TP/SL Rebase Calculation Test');
console.log('================================');
console.log('');

const result = testRebaseCalculation(alertPrice, entryPrice, accountConfig);

console.log('📋 Final Result:');
console.log(JSON.stringify(result, null, 2));

// Additional analysis
if (result.shouldRebase) {
  console.log('');
  console.log('💡 Analysis:');
  console.log(`- Entry price is ${((entryPrice/alertPrice - 1) * 100).toFixed(2)}% higher than alert price`);
  console.log(`- This triggers rebase as it exceeds 0.5% threshold`);
  console.log(`- Target price will be adjusted by ₹${result.targetPriceDifference.toFixed(2)}`);
  console.log(`- Stop loss will be adjusted by ₹${result.stopLossDifference.toFixed(2)}`);
  console.log(`- Both adjustments maintain the same percentage margins`);
}
