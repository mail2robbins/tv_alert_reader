import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function verifyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Verifying database migration...\n');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Check tables exist
    console.log('📊 Checking tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('alerts', 'placed_orders', 'ticker_cache')
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 3) {
      console.log('✅ All required tables exist:');
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    } else {
      console.log('⚠️  Missing tables. Found:', tables.rows.map(r => r.table_name).join(', '));
    }

    // Check record counts
    console.log('\n📈 Record counts:');
    const alertsCount = await pool.query('SELECT COUNT(*) as count FROM alerts');
    const ordersCount = await pool.query('SELECT COUNT(*) as count FROM placed_orders');
    const cacheCount = await pool.query('SELECT COUNT(*) as count FROM ticker_cache');
    
    console.log(`   Alerts: ${alertsCount.rows[0].count}`);
    console.log(`   Orders: ${ordersCount.rows[0].count}`);
    console.log(`   Ticker Cache: ${cacheCount.rows[0].count}`);

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexes = await pool.query(`
      SELECT 
        tablename,
        indexname
      FROM pg_indexes 
      WHERE tablename IN ('alerts', 'placed_orders', 'ticker_cache')
      ORDER BY tablename, indexname
    `);
    
    console.log(`✅ Found ${indexes.rows.length} indexes:`);
    let currentTable = '';
    indexes.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n   ${row.tablename}:`);
      }
      console.log(`      - ${row.indexname}`);
    });

    // Sample recent data
    console.log('\n📋 Recent data samples:');
    
    const recentAlerts = await pool.query(`
      SELECT id, timestamp, ticker, signal, strategy 
      FROM alerts 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);
    
    if (recentAlerts.rows.length > 0) {
      console.log('\n   Latest Alerts:');
      recentAlerts.rows.forEach(alert => {
        console.log(`      ${alert.timestamp.toISOString().split('T')[0]} - ${alert.ticker} (${alert.signal}) - ${alert.strategy}`);
      });
    } else {
      console.log('   No alerts found');
    }

    const recentOrders = await pool.query(`
      SELECT id, timestamp, ticker, signal, status, quantity 
      FROM placed_orders 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);
    
    if (recentOrders.rows.length > 0) {
      console.log('\n   Latest Orders:');
      recentOrders.rows.forEach(order => {
        console.log(`      ${order.timestamp.toISOString().split('T')[0]} - ${order.ticker} (${order.signal}) - ${order.status} - Qty: ${order.quantity}`);
      });
    } else {
      console.log('   No orders found');
    }

    // Check data integrity
    console.log('\n🔐 Data integrity checks:');
    
    const orphanedOrders = await pool.query(`
      SELECT COUNT(*) as count 
      FROM placed_orders po 
      WHERE NOT EXISTS (
        SELECT 1 FROM alerts a WHERE a.id = po.alert_id
      )
    `);
    
    if (parseInt(orphanedOrders.rows[0].count) === 0) {
      console.log('   ✅ All orders have corresponding alerts');
    } else {
      console.log(`   ⚠️  ${orphanedOrders.rows[0].count} orders without corresponding alerts`);
    }

    // Check for duplicate IDs
    const duplicateAlerts = await pool.query(`
      SELECT id, COUNT(*) as count 
      FROM alerts 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateAlerts.rows.length === 0) {
      console.log('   ✅ No duplicate alert IDs');
    } else {
      console.log(`   ⚠️  ${duplicateAlerts.rows.length} duplicate alert IDs found`);
    }

    const duplicateOrders = await pool.query(`
      SELECT id, COUNT(*) as count 
      FROM placed_orders 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateOrders.rows.length === 0) {
      console.log('   ✅ No duplicate order IDs');
    } else {
      console.log(`   ⚠️  ${duplicateOrders.rows.length} duplicate order IDs found`);
    }

    // Date range
    console.log('\n📅 Data date range:');
    
    const alertDateRange = await pool.query(`
      SELECT 
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM alerts
    `);
    
    if (alertDateRange.rows[0].earliest) {
      console.log(`   Alerts: ${alertDateRange.rows[0].earliest.toISOString().split('T')[0]} to ${alertDateRange.rows[0].latest.toISOString().split('T')[0]}`);
    }

    const orderDateRange = await pool.query(`
      SELECT 
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM placed_orders
    `);
    
    if (orderDateRange.rows[0].earliest) {
      console.log(`   Orders: ${orderDateRange.rows[0].earliest.toISOString().split('T')[0]} to ${orderDateRange.rows[0].latest.toISOString().split('T')[0]}`);
    }

    console.log('\n✅ Migration verification completed!');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifyMigration();
}

export { verifyMigration };
