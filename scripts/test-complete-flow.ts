import { config } from 'dotenv';
import { testDatabaseConnection, initializeDatabaseSchema } from '../src/lib/database';
import { storeAlertInDatabase, readAlertsFromDatabase, getAlertStatsFromDatabase } from '../src/lib/alertDatabase';
import { storePlacedOrderInDatabase, getAllPlacedOrdersFromDatabase, getOrderStatsFromDatabase, hasTickerBeenOrderedTodayInDatabase, addTickerToCacheInDatabase } from '../src/lib/orderDatabase';
import { TradingViewAlert, ChartInkAlert, ChartInkProcessedAlert } from '../src/types/alert';
import { PlacedOrder } from '../src/lib/orderTracker';
import { PositionCalculation } from '../src/lib/fundManager';

// Load environment variables from .env.local (only in development)
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing Complete Flow: ChartInk Alert → Order Placement → Database Storage\n');
    
    // Step 1: Initialize Database
    console.log('1️⃣ Initializing database...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    await initializeDatabaseSchema();
    console.log('✅ Database initialized\n');
    
    // Step 2: Simulate ChartInk Alert
    console.log('2️⃣ Simulating ChartInk Alert...');
    const chartInkAlert: ChartInkAlert = {
      stocks: 'RELIANCE',
      trigger_prices: '2500.50',
      triggered_at: new Date().toISOString(),
      scan_name: 'Momentum Breakout',
      scan_url: 'https://chartink.com/screener/momentum-breakout',
      alert_name: 'High Volume Breakout',
      webhook_url: 'https://your-app.com/api/tradingview-alert'
    };
    
    // Process ChartInk alert (simulate the processing logic)
    const processedAlert: ChartInkProcessedAlert = {
      ticker: chartInkAlert.stocks,
      price: parseFloat(chartInkAlert.trigger_prices),
      signal: 'BUY', // ChartInk alerts are typically BUY signals
      strategy: chartInkAlert.scan_name,
      timestamp: chartInkAlert.triggered_at,
      custom_note: `ChartInk Alert: ${chartInkAlert.alert_name}`,
      originalAlert: chartInkAlert
    };
    
    console.log('📊 ChartInk Alert Data:', {
      ticker: processedAlert.ticker,
      price: processedAlert.price,
      signal: processedAlert.signal,
      strategy: processedAlert.strategy,
      alertName: chartInkAlert.alert_name
    });
    console.log('✅ ChartInk alert processed\n');
    
    // Step 3: Store Alert in Database
    console.log('3️⃣ Storing alert in database...');
    const alertId = await storeAlertInDatabase(processedAlert, 'ChartInk');
    console.log(`✅ Alert stored with ID: ${alertId}\n`);
    
    // Step 4: Simulate Order Placement Logic
    console.log('4️⃣ Simulating order placement logic...');
    
    // Check if ticker has been ordered today
    const wasOrderedToday = await hasTickerBeenOrderedTodayInDatabase(processedAlert.ticker);
    console.log(`🔍 Ticker ${processedAlert.ticker} already ordered today: ${wasOrderedToday}`);
    
    if (wasOrderedToday) {
      console.log('⚠️ Order would be blocked - ticker already ordered today');
    } else {
      console.log('✅ Ticker is available for ordering');
      
      // Simulate position calculation
      const availableFunds = 50000; // Simulate available funds
      const leverage = 2;
      const maxPositionSize = 0.1; // 10% of capital
      const riskOnCapital = 0.02; // 2% risk
      
      const orderValue = availableFunds * maxPositionSize;
      const leveragedValue = orderValue / leverage;
      const quantity = Math.floor(leveragedValue / processedAlert.price);
      const finalOrderValue = quantity * processedAlert.price;
      
      console.log('💰 Position Calculation:', {
        availableFunds,
        maxPositionSize: `${(maxPositionSize * 100)}%`,
        orderValue: `₹${orderValue.toFixed(2)}`,
        leveragedValue: `₹${leveragedValue.toFixed(2)}`,
        quantity,
        finalOrderValue: `₹${finalOrderValue.toFixed(2)}`
      });
      
      // Simulate Dhan API response
      const mockDhanResponse = {
        success: true,
        orderId: `DHAN_${Date.now()}`,
        correlationId: `CORR_${Date.now()}`,
        message: 'Order placed successfully',
        accountId: 1,
        clientId: 'TEST_CLIENT_001'
      };
      
      console.log('📋 Dhan API Response:', mockDhanResponse);
      
      // Step 5: Create and Store Order
      console.log('5️⃣ Creating and storing order...');
      const placedOrder: PlacedOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId: alertId,
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
        stopLossPrice: processedAlert.price * 0.95, // 5% stop loss
        targetPrice: processedAlert.price * 1.15, // 15% target
        accountId: mockDhanResponse.accountId,
        clientId: mockDhanResponse.clientId,
        dhanResponse: mockDhanResponse,
        positionCalculation: {
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
          stopLossPrice: processedAlert.price * 0.95,
          targetPrice: processedAlert.price * 1.15,
          accountId: mockDhanResponse.accountId,
          clientId: mockDhanResponse.clientId
        }
      };
      
      // Store order in database
      await storePlacedOrderInDatabase(placedOrder);
      console.log(`✅ Order stored with ID: ${placedOrder.id}`);
      
      // Add ticker to cache
      await addTickerToCacheInDatabase(processedAlert.ticker);
      console.log(`✅ Ticker ${processedAlert.ticker} added to cache\n`);
    }
    
    // Step 6: Verify Data in Database
    console.log('6️⃣ Verifying data in database...');
    
    // Check alerts
    const storedAlerts = await readAlertsFromDatabase({ ticker: processedAlert.ticker });
    console.log(`📊 Stored alerts for ${processedAlert.ticker}: ${storedAlerts.length}`);
    
    // Check orders
    const storedOrders = await getAllPlacedOrdersFromDatabase();
    const tickerOrders = storedOrders.filter(order => order.ticker === processedAlert.ticker);
    console.log(`📋 Stored orders for ${processedAlert.ticker}: ${tickerOrders.length}`);
    
    // Check ticker cache
    const tickerInCache = await hasTickerBeenOrderedTodayInDatabase(processedAlert.ticker);
    console.log(`🗂️ Ticker ${processedAlert.ticker} in cache: ${tickerInCache}`);
    
    // Get statistics
    const alertStats = await getAlertStatsFromDatabase();
    const orderStats = await getOrderStatsFromDatabase();
    
    console.log('\n📈 Final Statistics:');
    console.log('Alerts:', {
      total: alertStats.totalAlerts,
      buySignals: alertStats.buySignals,
      sellSignals: alertStats.sellSignals,
      uniqueTickers: alertStats.uniqueTickers
    });
    console.log('Orders:', {
      total: orderStats.totalOrders,
      placed: orderStats.placedOrders,
      failed: orderStats.failedOrders,
      totalValue: `₹${orderStats.totalValue.toFixed(2)}`
    });
    
    console.log('\n🎉 Complete flow test successful!');
    console.log('✅ ChartInk alert → Processing → Database storage → Order placement → Order storage');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error);
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testCompleteFlow();
}

export { testCompleteFlow };
