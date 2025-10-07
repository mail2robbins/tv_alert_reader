/**
 * Test the actual rebase function from the codebase
 * This simulates the real rebaseOrderTpAndSl function behavior
 */

// Simulate the actual rebase function logic from dhanApi.ts
async function simulateRebaseOrderTpAndSl(orderId, accountConfig, originalAlertPrice, mockEntryPrice) {
  console.log(`🔄 Starting TP/SL rebase for order ${orderId} on account ${accountConfig.clientId}`);
  
  // Simulate order details (normally fetched from Dhan API)
  const orderDetails = {
    orderId: orderId,
    averagePrice: mockEntryPrice, // This would come from Dhan API
    price: mockEntryPrice,
    targetPrice: originalAlertPrice * (1 + accountConfig.targetPricePercentage),
    stopLossPrice: originalAlertPrice * (1 - accountConfig.stopLossPercentage),
    status: 'COMPLETE'
  };
  
  console.log(`📊 Order details:`, {
    orderId,
    originalAlertPrice,
    actualEntryPrice: orderDetails.averagePrice,
    orderType: 'MARKET',
    status: orderDetails.status
  });

  // Use averagePrice if available, otherwise use price
  const actualEntryPrice = orderDetails.averagePrice || orderDetails.price;
  
  if (!actualEntryPrice || actualEntryPrice <= 0) {
    return { success: false, error: 'Invalid entry price from order details' };
  }

  // Only rebase if the entry price is significantly different from alert price
  const priceDifference = Math.abs(actualEntryPrice - originalAlertPrice);
  const priceDifferencePercentage = (priceDifference / originalAlertPrice) * 100;
  
  // Only rebase if price difference is more than 0.5%
  if (priceDifferencePercentage < 0.5) {
    console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is minimal, skipping rebase`);
    return { 
      success: true, 
      message: 'Price difference minimal, no rebase needed',
      rebasedData: {
        actualEntryPrice,
        originalTp: orderDetails.targetPrice,
        originalSl: orderDetails.stopLossPrice
      }
    };
  }

  // Calculate new TP and SL based on actual entry price
  const newTargetPrice = actualEntryPrice * (1 + accountConfig.targetPricePercentage);
  const newStopLossPrice = actualEntryPrice * (1 - accountConfig.stopLossPercentage);

  console.log(`🎯 Recalculating TP/SL based on actual entry price:`);
  console.log(`  Original TP: ₹${orderDetails.targetPrice.toFixed(2)} → New TP: ₹${newTargetPrice.toFixed(2)}`);
  console.log(`  Original SL: ₹${orderDetails.stopLossPrice.toFixed(2)} → New SL: ₹${newStopLossPrice.toFixed(2)}`);

  // Simulate API calls to update TP/SL (normally would call Dhan API)
  console.log(`📡 Simulating API calls to update TP/SL...`);
  
  // Simulate target price update
  const targetUpdateResult = await simulateUpdateTargetPrice(orderId, accountConfig.clientId, newTargetPrice, accountConfig.accessToken);
  
  // Simulate stop loss update  
  const stopLossUpdateResult = await simulateUpdateStopLoss(orderId, accountConfig.clientId, newStopLossPrice, accountConfig.accessToken);

  if (targetUpdateResult.success && stopLossUpdateResult.success) {
    console.log(`🎉 TP/SL rebase completed successfully for order ${orderId}`);
    return {
      success: true,
      message: 'TP/SL rebase completed successfully',
      rebasedData: {
        originalTp: orderDetails.targetPrice,
        originalSl: orderDetails.stopLossPrice,
        newTp: newTargetPrice,
        newSl: newStopLossPrice,
        actualEntryPrice
      }
    };
  } else {
    return {
      success: false,
      error: 'Failed to update TP/SL via API',
      rebasedData: {
        originalTp: orderDetails.targetPrice,
        originalSl: orderDetails.stopLossPrice,
        newTp: newTargetPrice,
        newSl: newStopLossPrice,
        actualEntryPrice
      }
    };
  }
}

// Simulate API update functions
async function simulateUpdateTargetPrice(orderId, clientId, targetPrice, accessToken) {
  console.log(`  📈 Updating target price to ₹${targetPrice.toFixed(2)}...`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true, message: 'Target price updated successfully' };
}

async function simulateUpdateStopLoss(orderId, clientId, stopLossPrice, accessToken) {
  console.log(`  📉 Updating stop loss to ₹${stopLossPrice.toFixed(2)}...`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true, message: 'Stop loss updated successfully' };
}

// Test scenarios
async function runTests() {
  console.log('🚀 Testing Actual Rebase Function Logic');
  console.log('=======================================\n');

  const accountConfig = {
    clientId: 'DHAN_CLIENT_ID_1',
    accessToken: 'mock_token',
    targetPricePercentage: 0.01, // 1% target
    stopLossPercentage: 0.0075,  // 0.75% stop loss
    rebaseTpAndSl: true
  };

  const testCases = [
    {
      name: 'Your Scenario (Below Threshold)',
      alertPrice: 250.50,
      entryPrice: 251.45,
      orderId: 'ORDER_001'
    },
    {
      name: 'Above Threshold Scenario',
      alertPrice: 250.50,
      entryPrice: 252.00,
      orderId: 'ORDER_002'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 ${testCase.name}`);
    console.log('='.repeat(50));
    
    const result = await simulateRebaseOrderTpAndSl(
      testCase.orderId,
      accountConfig,
      testCase.alertPrice,
      testCase.entryPrice
    );
    
    console.log('\n📋 Result:', JSON.stringify(result, null, 2));
  }
}

// Run the tests
runTests().catch(console.error);
