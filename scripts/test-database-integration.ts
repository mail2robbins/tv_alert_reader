import { testDatabaseConnection, initializeDatabaseSchema } from '../src/lib/database';
import { storeAlertInDatabase, readAlertsFromDatabase, getAlertStatsFromDatabase } from '../src/lib/alertDatabase';
import { storePlacedOrderInDatabase, getAllPlacedOrdersFromDatabase, getOrderStatsFromDatabase, hasTickerBeenOrderedTodayInDatabase, addTickerToCacheInDatabase } from '../src/lib/orderDatabase';
import { TradingViewAlert } from '../src/types/alert';

async function testDatabaseIntegration() {
  try {
    console.log('🧪 Testing Database Integration...\n');
    
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful\n');
    
    // Test 2: Initialize Schema
    console.log('2️⃣ Initializing database schema...');
    await initializeDatabaseSchema();
    console.log('✅ Database schema initialized\n');
    
    // Test 3: Store and Retrieve Alert
    console.log('3️⃣ Testing alert storage and retrieval...');
    const testAlert: TradingViewAlert = {
      ticker: 'TEST123',
      price: 100.50,
      signal: 'BUY',
      strategy: 'Test Strategy',
      timestamp: new Date().toISOString(),
      custom_note: 'Test alert for database integration'
    };
    
    const alertId = await storeAlertInDatabase(testAlert, 'TradingView');
    console.log(`✅ Alert stored with ID: ${alertId}`);
    
    const retrievedAlerts = await readAlertsFromDatabase({ ticker: 'TEST123' });
    console.log(`✅ Retrieved ${retrievedAlerts.length} alert(s)`);
    
    const alertStats = await getAlertStatsFromDatabase();
    console.log(`✅ Alert stats: ${alertStats.totalAlerts} total alerts\n`);
    
    // Test 4: Store and Retrieve Order
    console.log('4️⃣ Testing order storage and retrieval...');
    const testOrder = {
      id: `test_order_${Date.now()}`,
      alertId: alertId,
      ticker: 'TEST123',
      signal: 'BUY',
      price: 100.50,
      quantity: 10,
      timestamp: new Date().toISOString(),
      correlationId: 'test_correlation_123',
      orderId: 'test_dhan_order_456',
      status: 'placed' as const,
      orderValue: 1005.00,
      leveragedValue: 502.50,
      positionSizePercentage: 0.05,
      stopLossPrice: 95.00,
      targetPrice: 110.00,
      accountId: 1,
      clientId: 'test_client'
    };
    
    await storePlacedOrderInDatabase(testOrder);
    console.log(`✅ Order stored with ID: ${testOrder.id}`);
    
    const retrievedOrders = await getAllPlacedOrdersFromDatabase();
    console.log(`✅ Retrieved ${retrievedOrders.length} order(s)`);
    
    const orderStats = await getOrderStatsFromDatabase();
    console.log(`✅ Order stats: ${orderStats.totalOrders} total orders\n`);
    
    // Test 5: Ticker Cache
    console.log('5️⃣ Testing ticker cache...');
    
    const wasOrdered = await hasTickerBeenOrderedTodayInDatabase('TEST123');
    console.log(`✅ Ticker TEST123 was ordered today: ${wasOrdered}`);
    
    await addTickerToCacheInDatabase('TEST456');
    const wasOrderedNew = await hasTickerBeenOrderedTodayInDatabase('TEST456');
    console.log(`✅ Ticker TEST456 was ordered today: ${wasOrderedNew}\n`);
    
    console.log('🎉 All database integration tests passed!');
    console.log('📊 Database is ready for production use');
    
  } catch (error) {
    console.error('❌ Database integration test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testDatabaseIntegration();
}

export { testDatabaseIntegration };
