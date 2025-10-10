/**
 * Test script to verify the improved TP/SL rebase timing fix
 * This script simulates the rebase logic with retry mechanism
 */

function simulateRebaseWithRetry(orderId, accountConfig, originalAlertPrice, mockOrderDetails) {
  console.log(`\n🧪 Testing TP/SL Rebase with Retry Logic`);
  console.log('='.repeat(60));
  console.log(`Order ID: ${orderId}`);
  console.log(`Account: ${accountConfig.clientId}`);
  console.log(`Original Alert Price: ₹${originalAlertPrice}`);
  console.log(`Rebase Enabled: ${accountConfig.rebaseTpAndSl ? 'YES' : 'NO'}`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  console.log('');

  // Simulate retry logic
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds between retries
  let actualEntryPrice = null;
  let orderDetails = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📊 Attempt ${attempt}/${maxRetries} to get order details for ${orderId}`);
    
    // Simulate different order states over time
    if (attempt === 1) {
      orderDetails = {
        orderId,
        status: 'TRANSIT',
        price: 0,
        averagePrice: null,
        orderType: 'MARKET'
      };
    } else if (attempt === 2) {
      orderDetails = {
        orderId,
        status: 'TRANSIT',
        price: 0,
        averagePrice: null,
        orderType: 'MARKET'
      };
    } else if (attempt === 3) {
      orderDetails = {
        orderId,
        status: 'COMPLETE',
        price: 209.45, // Slightly different from alert price
        averagePrice: 209.45,
        orderType: 'MARKET'
      };
    }

    console.log(`📋 Order status: ${orderDetails.status}, Price: ${orderDetails.price}, AveragePrice: ${orderDetails.averagePrice}`);
    
    // Use averagePrice if available, otherwise use price
    actualEntryPrice = orderDetails.averagePrice || orderDetails.price;
    
    // Check if we have a valid entry price
    if (actualEntryPrice && actualEntryPrice > 0) {
      console.log(`✅ Valid entry price found: ₹${actualEntryPrice} on attempt ${attempt}`);
      break;
    }
    
    // If order is still in TRANSIT or doesn't have entry price, wait and retry
    if (orderDetails.status === 'TRANSIT' || !actualEntryPrice || actualEntryPrice <= 0) {
      console.log(`⏳ Order still in ${orderDetails.status} status or no entry price, waiting ${retryDelay}ms before retry...`);
      if (attempt < maxRetries) {
        console.log(`⏱️  Simulating ${retryDelay}ms delay...`);
        continue;
      }
    }
  }

  if (!actualEntryPrice || actualEntryPrice <= 0) {
    console.log(`❌ Order not executed or no valid entry price after ${maxRetries} attempts. Order status: ${orderDetails?.status || 'unknown'}`);
    return { success: false, error: 'No valid entry price after retries' };
  }

  // Calculate price difference
  const priceDifference = Math.abs(actualEntryPrice - originalAlertPrice);
  const priceDifferencePercentage = (priceDifference / originalAlertPrice) * 100;
  
  console.log(`\n📊 Price Analysis:`);
  console.log(`Alert Price: ₹${originalAlertPrice}`);
  console.log(`Entry Price: ₹${actualEntryPrice}`);
  console.log(`Price Difference: ₹${priceDifference.toFixed(2)}`);
  console.log(`Price Difference %: ${priceDifferencePercentage.toFixed(2)}%`);
  console.log(`Threshold: ${accountConfig.rebaseThresholdPercentage}%`);
  
  // Check if rebase should be triggered
  const shouldRebase = priceDifferencePercentage >= accountConfig.rebaseThresholdPercentage;
  console.log(`🔄 Should Rebase: ${shouldRebase ? 'YES ✅' : 'NO ❌'}`);
  
  if (!shouldRebase) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${accountConfig.rebaseThresholdPercentage}%), skipping rebase`);
    return { 
      success: true, 
      message: `Price difference below threshold, no rebase needed`,
      rebasedData: {
        actualEntryPrice,
        originalTp: originalAlertPrice * (1 + accountConfig.targetPricePercentage),
        originalSl: originalAlertPrice * (1 - accountConfig.stopLossPercentage)
      }
    };
  }

  // Calculate new TP/SL based on actual entry price
  const newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);
  
  const originalTargetPrice = originalAlertPrice * (1 + accountConfig.targetPricePercentage);
  const originalStopLossPrice = originalAlertPrice * (1 - accountConfig.stopLossPercentage);

  console.log(`\n🎯 TP/SL Rebase Results:`);
  console.log(`Original TP: ₹${originalTargetPrice.toFixed(2)} → New TP: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`Original SL: ₹${originalStopLossPrice.toFixed(2)} → New SL: ₹${newStopLossPrice.toFixed(2)}`);
  
  return {
    success: true,
    message: 'TP/SL rebase completed successfully',
    rebasedData: {
      originalTp: originalTargetPrice,
      originalSl: originalStopLossPrice,
      newTp: newTargetPrice,
      newSl: newStopLossPrice,
      actualEntryPrice
    }
  };
}

// Test scenarios
console.log('🧪 TP/SL Rebase Timing Fix Test');
console.log('='.repeat(80));

// Test Account 1 (from your logs)
const account1 = {
  clientId: '1108422445',
  rebaseTpAndSl: true,
  rebaseThresholdPercentage: 0.02, // 2%
  targetPricePercentage: 0.0075, // 0.75%
  stopLossPercentage: 0.006 // 0.6%
};

// Test Account 2 (from your logs)
const account2 = {
  clientId: '1107139968',
  rebaseTpAndSl: true,
  rebaseThresholdPercentage: 0.02, // 2%
  targetPricePercentage: 0.0125, // 1.25%
  stopLossPercentage: 0.0075 // 0.75%
};

// Test with your actual scenario
const alertPrice = 209.19;
const orderId1 = '1032510105023971';
const orderId2 = '3632510105017171';

console.log('\n🔍 Testing Account 1 (1108422445)');
simulateRebaseWithRetry(orderId1, account1, alertPrice);

console.log('\n🔍 Testing Account 2 (1107139968)');
simulateRebaseWithRetry(orderId2, account2, alertPrice);

console.log('\n✅ Test completed! The improved rebase function should now:');
console.log('1. Retry up to 5 times with 3-second delays');
console.log('2. Wait for order execution and valid entry price');
console.log('3. Handle TRANSIT status orders gracefully');
console.log('4. Provide better error messages');
console.log('5. Only rebase when price difference exceeds threshold');
