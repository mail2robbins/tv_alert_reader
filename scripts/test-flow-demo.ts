import { TradingViewAlert, ChartInkAlert, ChartInkProcessedAlert } from '../src/types/alert';
import { PlacedOrder } from '../src/lib/orderTracker';
import { PositionCalculation } from '../src/lib/fundManager';

async function testFlowDemo() {
  try {
    console.log('🧪 Testing Complete Flow Demo: ChartInk Alert → Order Placement → Data Structure\n');
    
    // Step 1: Simulate ChartInk Alert
    console.log('1️⃣ Simulating ChartInk Alert...');
    const chartInkAlert: ChartInkAlert = {
      stocks: 'RELIANCE',
      trigger_prices: '2500.50',
      triggered_at: new Date().toISOString(),
      scan_name: 'Momentum Breakout',
      scan_url: 'https://chartink.com/screener/momentum-breakout',
      alert_name: 'High Volume Breakout',
      webhook_url: 'https://your-app.com/api/tradingview-alert'
    };
    
    console.log('📡 ChartInk Webhook Payload:', chartInkAlert);
    
    // Step 2: Process ChartInk Alert
    console.log('\n2️⃣ Processing ChartInk Alert...');
    const processedAlert: ChartInkProcessedAlert = {
      ticker: chartInkAlert.stocks,
      price: parseFloat(chartInkAlert.trigger_prices),
      signal: 'BUY',
      strategy: chartInkAlert.scan_name,
      timestamp: chartInkAlert.triggered_at,
      custom_note: `ChartInk Alert: ${chartInkAlert.alert_name}`,
      originalAlert: chartInkAlert
    };
    
    console.log('📊 Processed Alert:', {
      ticker: processedAlert.ticker,
      price: processedAlert.price,
      signal: processedAlert.signal,
      strategy: processedAlert.strategy,
      customNote: processedAlert.custom_note
    });
    
    // Step 3: Simulate Position Calculation
    console.log('\n3️⃣ Simulating Position Calculation...');
    const availableFunds = 50000;
    const leverage = 2;
    const maxPositionSize = 0.1; // 10%
    const riskOnCapital = 0.02; // 2% risk
    
    const orderValue = availableFunds * maxPositionSize;
    const leveragedValue = orderValue / leverage;
    const quantity = Math.floor(leveragedValue / processedAlert.price);
    const finalOrderValue = quantity * processedAlert.price;
    
    const positionCalculation: PositionCalculation = {
      stockPrice: processedAlert.price,
      availableFunds,
      leverage,
      maxPositionSize,
      calculatedQuantity: quantity,
      riskOnCapital,
      finalQuantity: quantity,
      orderValue: finalOrderValue,
      leveragedValue,
      positionSizePercentage: maxPositionSize,
      canPlaceOrder: true,
      stopLossPrice: processedAlert.price * 0.95, // 5% stop loss
      targetPrice: processedAlert.price * 1.15, // 15% target
      accountId: 1,
      clientId: 'TEST_CLIENT_001'
    };
    
    console.log('💰 Position Calculation:', {
      availableFunds: `₹${availableFunds.toLocaleString()}`,
      maxPositionSize: `${(maxPositionSize * 100)}%`,
      orderValue: `₹${orderValue.toFixed(2)}`,
      leveragedValue: `₹${leveragedValue.toFixed(2)}`,
      quantity,
      finalOrderValue: `₹${finalOrderValue.toFixed(2)}`,
      stopLossPrice: `₹${positionCalculation.stopLossPrice?.toFixed(2)}`,
      targetPrice: `₹${positionCalculation.targetPrice?.toFixed(2)}`
    });
    
    // Step 4: Simulate Dhan API Response
    console.log('\n4️⃣ Simulating Dhan API Response...');
    const mockDhanResponse = {
      success: true,
      orderId: `DHAN_${Date.now()}`,
      correlationId: `CORR_${Date.now()}`,
      message: 'Order placed successfully',
      accountId: 1,
      clientId: 'TEST_CLIENT_001'
    };
    
    console.log('📋 Dhan API Response:', mockDhanResponse);
    
    // Step 5: Create Order Object
    console.log('\n5️⃣ Creating Order Object...');
    const placedOrder: PlacedOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertId: `alert_${Date.now()}`,
      ticker: processedAlert.ticker,
      signal: processedAlert.signal,
      price: processedAlert.price,
      quantity: quantity,
      timestamp: new Date().toISOString(),
      correlationId: mockDhanResponse.correlationId,
      orderId: mockDhanResponse.orderId,
      status: mockDhanResponse.success ? 'placed' : 'failed',
      orderValue: finalOrderValue,
      leveragedValue: leveragedValue,
      positionSizePercentage: maxPositionSize,
      stopLossPrice: positionCalculation.stopLossPrice,
      targetPrice: positionCalculation.targetPrice,
      accountId: mockDhanResponse.accountId,
      clientId: mockDhanResponse.clientId,
      dhanResponse: mockDhanResponse,
      positionCalculation: positionCalculation
    };
    
    console.log('📦 Order Object:', {
      id: placedOrder.id,
      ticker: placedOrder.ticker,
      signal: placedOrder.signal,
      price: `₹${placedOrder.price}`,
      quantity: placedOrder.quantity,
      orderValue: `₹${placedOrder.orderValue.toFixed(2)}`,
      status: placedOrder.status,
      orderId: placedOrder.orderId,
      stopLossPrice: `₹${placedOrder.stopLossPrice?.toFixed(2)}`,
      targetPrice: `₹${placedOrder.targetPrice?.toFixed(2)}`
    });
    
    // Step 6: Simulate Database Storage
    console.log('\n6️⃣ Simulating Database Storage...');
    console.log('🗄️ Alert would be stored in "alerts" table with:', {
      id: `alert_${Date.now()}`,
      timestamp: processedAlert.timestamp,
      alert_type: 'ChartInk',
      ticker: processedAlert.ticker,
      price: processedAlert.price,
      signal: processedAlert.signal,
      strategy: processedAlert.strategy,
      custom_note: processedAlert.custom_note,
      original_data: JSON.stringify(processedAlert)
    });
    
    console.log('🗄️ Order would be stored in "placed_orders" table with:', {
      id: placedOrder.id,
      alert_id: placedOrder.alertId,
      ticker: placedOrder.ticker,
      signal: placedOrder.signal,
      price: placedOrder.price,
      quantity: placedOrder.quantity,
      status: placedOrder.status,
      order_value: placedOrder.orderValue,
      leveraged_value: placedOrder.leveragedValue,
      position_size_percentage: placedOrder.positionSizePercentage,
      stop_loss_price: placedOrder.stopLossPrice,
      target_price: placedOrder.targetPrice,
      account_id: placedOrder.accountId,
      client_id: placedOrder.clientId,
      dhan_response: JSON.stringify(placedOrder.dhanResponse),
      position_calculation: JSON.stringify(placedOrder.positionCalculation)
    });
    
    console.log('🗄️ Ticker cache would be updated with:', {
      ticker: processedAlert.ticker,
      date: new Date().toISOString().split('T')[0],
      order_count: 1,
      last_order_time: new Date().toISOString()
    });
    
    // Step 7: Summary
    console.log('\n7️⃣ Flow Summary:');
    console.log('✅ ChartInk webhook received');
    console.log('✅ Alert processed and validated');
    console.log('✅ Position size calculated');
    console.log('✅ Order placed via Dhan API');
    console.log('✅ Order stored in database');
    console.log('✅ Ticker cache updated');
    console.log('✅ Data persisted for future reference');
    
    console.log('\n🎉 Complete flow demo successful!');
    console.log('📊 This demonstrates the complete data flow from ChartInk alert to database storage');
    console.log('💡 To test with actual database, set DATABASE_URL and run: npm run test:flow');
    
  } catch (error) {
    console.error('❌ Flow demo failed:', error);
    process.exit(1);
  }
}

// Run demo if this script is executed directly
if (require.main === module) {
  testFlowDemo();
}

export { testFlowDemo };
