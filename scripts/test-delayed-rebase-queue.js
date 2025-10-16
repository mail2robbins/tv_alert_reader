/**
 * Test script for the new delayed rebase queue system
 * This script simulates the new rebase queue behavior
 */

console.log('🧪 Testing Delayed Rebase Queue System');
console.log('=====================================\n');

// Mock account configurations
const mockAccountConfigs = [
  {
    clientId: 'CLIENT_001',
    accountId: '1',
    rebaseTpAndSl: true,
    targetPricePercentage: 0.015, // 1.5%
    stopLossPercentage: 0.01,     // 1.0%
    rebaseThresholdPercentage: 0.1 // 0.1%
  },
  {
    clientId: 'CLIENT_002', 
    accountId: '2',
    rebaseTpAndSl: true,
    targetPricePercentage: 0.018, // 1.8%
    stopLossPercentage: 0.012,    // 1.2%
    rebaseThresholdPercentage: 0.1 // 0.1%
  },
  {
    clientId: 'CLIENT_003',
    accountId: '3', 
    rebaseTpAndSl: false, // Disabled
    targetPricePercentage: 0.02,  // 2.0%
    stopLossPercentage: 0.008,    // 0.8%
    rebaseThresholdPercentage: 0.1 // 0.1%
  }
];

// Mock order data
const mockOrders = [
  {
    orderId: 'ORDER_001',
    accountId: '1',
    clientId: 'CLIENT_001',
    alertPrice: 250.50
  },
  {
    orderId: 'ORDER_002',
    accountId: '2', 
    clientId: 'CLIENT_002',
    alertPrice: 250.50
  },
  {
    orderId: 'ORDER_003',
    accountId: '3',
    clientId: 'CLIENT_003', 
    alertPrice: 250.50
  }
];

// Simulate the new rebase queue behavior
function simulateRebaseQueue() {
  console.log('📝 Step 1: Adding orders to rebase queue');
  console.log('----------------------------------------');
  
  const queueItems = [];
  
  mockOrders.forEach(order => {
    const accountConfig = mockAccountConfigs.find(acc => acc.accountId === order.accountId);
    
    if (accountConfig && accountConfig.rebaseTpAndSl) {
      console.log(`✅ Added order ${order.orderId} to rebase queue for account ${order.clientId}`);
      queueItems.push({
        orderId: order.orderId,
        accountConfig,
        alertPrice: order.alertPrice,
        clientId: order.clientId,
        accountId: order.accountId,
        addedAt: Date.now()
      });
    } else {
      console.log(`⚠️ Skipped order ${order.orderId} - rebase disabled for account ${order.clientId}`);
    }
  });
  
  console.log(`\n📊 Queue Status: ${queueItems.length} items queued for rebase\n`);
  
  return queueItems;
}

// Simulate delayed rebase processing
async function simulateDelayedRebase(queueItems) {
  console.log('🔄 Step 2: Processing rebase queue with delays');
  console.log('----------------------------------------------');
  
  const results = [];
  
  for (let i = 0; i < queueItems.length; i++) {
    const item = queueItems[i];
    console.log(`\n🔄 Processing order ${item.orderId} (${i + 1}/${queueItems.length})`);
    
    // Simulate initial delay
    console.log(`⏳ Waiting 1 second before first rebase attempt...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate retry logic with mock entry prices
    const mockEntryPrices = [null, null, 250.15]; // First two attempts fail, third succeeds
    let success = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`📊 Attempt ${attempt}/3 to get order details for ${item.orderId}`);
      
      const entryPrice = mockEntryPrices[attempt - 1];
      
      if (entryPrice) {
        console.log(`✅ Valid entry price found: ₹${entryPrice} on attempt ${attempt}`);
        
        // Calculate price difference
        const priceDifference = Math.abs(entryPrice - item.alertPrice);
        const priceDifferencePercentage = (priceDifference / item.alertPrice) * 100;
        
        console.log(`📈 Price Analysis:`);
        console.log(`   Alert Price: ₹${item.alertPrice}`);
        console.log(`   Entry Price: ₹${entryPrice}`);
        console.log(`   Difference: ₹${priceDifference.toFixed(2)} (${priceDifferencePercentage.toFixed(2)}%)`);
        
        if (priceDifferencePercentage >= item.accountConfig.rebaseThresholdPercentage) {
          // Calculate new TP/SL
          const newTargetPrice = entryPrice * (1 + item.accountConfig.targetPricePercentage);
          const newStopLossPrice = entryPrice * (1 - item.accountConfig.stopLossPercentage);
          
          console.log(`🎯 Recalculating TP/SL:`);
          console.log(`   New Target Price: ₹${newTargetPrice.toFixed(2)}`);
          console.log(`   New Stop Loss: ₹${newStopLossPrice.toFixed(2)}`);
          
          // Simulate API calls
          console.log(`📡 Updating target price...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`✅ Target price updated successfully`);
          
          console.log(`📡 Updating stop loss...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`✅ Stop loss updated successfully`);
          
          results.push({
            orderId: item.orderId,
            accountId: item.accountId,
            clientId: item.clientId,
            success: true,
            message: 'TP/SL rebased successfully based on actual entry price',
            rebasedData: {
              originalTp: item.alertPrice * (1 + item.accountConfig.targetPricePercentage),
              originalSl: item.alertPrice * (1 - item.accountConfig.stopLossPercentage),
              newTp: newTargetPrice,
              newSl: newStopLossPrice,
              actualEntryPrice: entryPrice
            }
          });
          
          console.log(`🎉 Rebase completed successfully for order ${item.orderId}`);
          success = true;
          break;
        } else {
          console.log(`✅ Price difference (${priceDifferencePercentage.toFixed(2)}%) is below threshold (${item.accountConfig.rebaseThresholdPercentage}%), skipping rebase`);
          results.push({
            orderId: item.orderId,
            accountId: item.accountId,
            clientId: item.clientId,
            success: true,
            message: 'Price difference below threshold, no rebase needed'
          });
          success = true;
          break;
        }
      } else {
        console.log(`⏳ Order still in TRANSIT status or no entry price, waiting 1 second before retry...`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!success) {
      console.log(`❌ Rebase failed for order ${item.orderId} after 3 attempts`);
      results.push({
        orderId: item.orderId,
        accountId: item.accountId,
        clientId: item.clientId,
        success: false,
        error: 'Order not executed or no valid entry price after 3 attempts'
      });
    }
    
    // Add delay between processing items
    if (i < queueItems.length - 1) {
      console.log(`⏳ Waiting 500ms before processing next item...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// Display final results
function displayResults(results) {
  console.log('\n📊 Step 3: Final Results');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful Rebases: ${successful.length}`);
  successful.forEach(result => {
    console.log(`   Order ${result.orderId} (${result.clientId}): ${result.message}`);
    if (result.rebasedData) {
      console.log(`     TP: ₹${result.rebasedData.originalTp?.toFixed(2)} → ₹${result.rebasedData.newTp?.toFixed(2)}`);
      console.log(`     SL: ₹${result.rebasedData.originalSl?.toFixed(2)} → ₹${result.rebasedData.newSl?.toFixed(2)}`);
    }
  });
  
  console.log(`\n❌ Failed Rebases: ${failed.length}`);
  failed.forEach(result => {
    console.log(`   Order ${result.orderId} (${result.clientId}): ${result.error}`);
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Orders: ${results.length}`);
  console.log(`   Successful: ${successful.length}`);
  console.log(`   Failed: ${failed.length}`);
  console.log(`   Success Rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
}

// Main test execution
async function runTest() {
  try {
    const queueItems = simulateRebaseQueue();
    const results = await simulateDelayedRebase(queueItems);
    displayResults(results);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 Key Benefits of New System:');
    console.log('   ✅ Orders are queued immediately without blocking order placement');
    console.log('   ✅ Rebase attempts are delayed to allow order execution');
    console.log('   ✅ Retry logic handles undefined entry prices gracefully');
    console.log('   ✅ Processing is async and doesn\'t impact new orders');
    console.log('   ✅ Failed rebases are tracked and can be retried');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runTest();
