import { config } from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface MigrationStats {
  alerts: { exported: number; imported: number; skipped: number };
  placed_orders: { exported: number; imported: number; skipped: number };
  ticker_cache: { exported: number; imported: number; skipped: number };
  users: { exported: number; imported: number; skipped: number };
  user_sessions: { exported: number; imported: number; skipped: number };
  user_audit_log: { exported: number; imported: number; skipped: number };
}

async function migrateDatabase() {
  const newDatabaseUrl = process.env.DATABASE_URL;
  
  if (!newDatabaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('🔄 Starting database migration...\n');
  
  // Ask for old database URL
  console.log('Please provide the OLD database URL (the one you want to migrate FROM):');
  console.log('Example: postgresql://username:password@hostname:port/database_name\n');
  
  // In a real scenario, you'd use readline or pass as argument
  // For now, we'll check for OLD_DATABASE_URL env variable
  const oldDatabaseUrl = process.env.OLD_DATABASE_URL;
  
  if (!oldDatabaseUrl) {
    console.error('❌ Please set OLD_DATABASE_URL environment variable with your old database connection string');
    console.log('\nYou can either:');
    console.log('1. Add OLD_DATABASE_URL to your .env.local file temporarily');
    console.log('2. Run: $env:OLD_DATABASE_URL="your_old_db_url"; npm run db:migrate');
    process.exit(1);
  }

  const oldPool = new Pool({
    connectionString: oldDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const newPool = new Pool({
    connectionString: newDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const stats: MigrationStats = {
    alerts: { exported: 0, imported: 0, skipped: 0 },
    placed_orders: { exported: 0, imported: 0, skipped: 0 },
    ticker_cache: { exported: 0, imported: 0, skipped: 0 },
    users: { exported: 0, imported: 0, skipped: 0 },
    user_sessions: { exported: 0, imported: 0, skipped: 0 },
    user_audit_log: { exported: 0, imported: 0, skipped: 0 }
  };

  try {
    // Test connections
    console.log('📡 Testing database connections...');
    await oldPool.query('SELECT NOW()');
    console.log('✅ Old database connection successful');
    
    await newPool.query('SELECT NOW()');
    console.log('✅ New database connection successful\n');

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'data', 'migration-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Step 1: Initialize schema in new database
    console.log('🏗️  Initializing schema in new database...');
    await initializeSchema(newPool);
    console.log('✅ Schema initialized\n');

    // Step 2: Export and migrate alerts
    console.log('📊 Migrating alerts table...');
    const alerts = await exportAlerts(oldPool);
    stats.alerts.exported = alerts.length;
    
    if (alerts.length > 0) {
      const backupFile = path.join(backupDir, `alerts-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(alerts, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importAlerts(newPool, alerts);
      stats.alerts.imported = imported.imported;
      stats.alerts.skipped = imported.skipped;
    }
    console.log(`✅ Alerts: ${stats.alerts.exported} exported, ${stats.alerts.imported} imported, ${stats.alerts.skipped} skipped\n`);

    // Step 3: Export and migrate placed_orders
    console.log('📦 Migrating placed_orders table...');
    const orders = await exportOrders(oldPool);
    stats.placed_orders.exported = orders.length;
    
    if (orders.length > 0) {
      const backupFile = path.join(backupDir, `placed_orders-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(orders, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importOrders(newPool, orders);
      stats.placed_orders.imported = imported.imported;
      stats.placed_orders.skipped = imported.skipped;
    }
    console.log(`✅ Orders: ${stats.placed_orders.exported} exported, ${stats.placed_orders.imported} imported, ${stats.placed_orders.skipped} skipped\n`);

    // Step 4: Export and migrate ticker_cache
    console.log('🎯 Migrating ticker_cache table...');
    const cache = await exportTickerCache(oldPool);
    stats.ticker_cache.exported = cache.length;
    
    if (cache.length > 0) {
      const backupFile = path.join(backupDir, `ticker_cache-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(cache, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importTickerCache(newPool, cache);
      stats.ticker_cache.imported = imported.imported;
      stats.ticker_cache.skipped = imported.skipped;
    }
    console.log(`✅ Cache: ${stats.ticker_cache.exported} exported, ${stats.ticker_cache.imported} imported, ${stats.ticker_cache.skipped} skipped\n`);

    // Step 5: Export and migrate users
    console.log('👥 Migrating users table...');
    const users = await exportGenericTable(oldPool, 'users');
    stats.users.exported = users.length;
    
    if (users.length > 0) {
      const backupFile = path.join(backupDir, `users-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importUsers(newPool, users);
      stats.users.imported = imported.imported;
      stats.users.skipped = imported.skipped;
    }
    console.log(`✅ Users: ${stats.users.exported} exported, ${stats.users.imported} imported, ${stats.users.skipped} skipped\n`);

    // Step 6: Export and migrate user_sessions
    console.log('🔐 Migrating user_sessions table...');
    const sessions = await exportGenericTable(oldPool, 'user_sessions');
    stats.user_sessions.exported = sessions.length;
    
    if (sessions.length > 0) {
      const backupFile = path.join(backupDir, `user_sessions-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(sessions, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importUserSessions(newPool, sessions);
      stats.user_sessions.imported = imported.imported;
      stats.user_sessions.skipped = imported.skipped;
    }
    console.log(`✅ Sessions: ${stats.user_sessions.exported} exported, ${stats.user_sessions.imported} imported, ${stats.user_sessions.skipped} skipped\n`);

    // Step 7: Export and migrate user_audit_log
    console.log('📋 Migrating user_audit_log table...');
    const auditLog = await exportGenericTable(oldPool, 'user_audit_log');
    stats.user_audit_log.exported = auditLog.length;
    
    if (auditLog.length > 0) {
      const backupFile = path.join(backupDir, `user_audit_log-${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(auditLog, null, 2));
      console.log(`💾 Backup saved: ${backupFile}`);
      
      const imported = await importUserAuditLog(newPool, auditLog);
      stats.user_audit_log.imported = imported.imported;
      stats.user_audit_log.skipped = imported.skipped;
    }
    console.log(`✅ Audit Log: ${stats.user_audit_log.exported} exported, ${stats.user_audit_log.imported} imported, ${stats.user_audit_log.skipped} skipped\n`);

    // Step 8: Verify migration
    console.log('🔍 Verifying migration...');
    await verifyMigration(newPool, stats);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Alerts: ${stats.alerts.imported}/${stats.alerts.exported} migrated`);
    console.log(`   Orders: ${stats.placed_orders.imported}/${stats.placed_orders.exported} migrated`);
    console.log(`   Cache: ${stats.ticker_cache.imported}/${stats.ticker_cache.exported} migrated`);
    console.log(`   Users: ${stats.users.imported}/${stats.users.exported} migrated`);
    console.log(`   Sessions: ${stats.user_sessions.imported}/${stats.user_sessions.exported} migrated`);
    console.log(`   Audit Log: ${stats.user_audit_log.imported}/${stats.user_audit_log.exported} migrated`);
    console.log(`\n💾 Backups saved in: ${backupDir}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

async function initializeSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        ticker VARCHAR(50) NOT NULL,
        price DECIMAL(15,4) NOT NULL,
        signal VARCHAR(10) NOT NULL,
        strategy VARCHAR(255) NOT NULL,
        custom_note TEXT,
        webhook_secret VARCHAR(255),
        original_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create placed_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS placed_orders (
        id VARCHAR(255) PRIMARY KEY,
        alert_id VARCHAR(255) NOT NULL,
        ticker VARCHAR(50) NOT NULL,
        signal VARCHAR(10) NOT NULL,
        price DECIMAL(15,4) NOT NULL,
        quantity INTEGER NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        correlation_id VARCHAR(255),
        order_id VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        error TEXT,
        order_value DECIMAL(15,4) NOT NULL,
        leveraged_value DECIMAL(15,4) NOT NULL,
        position_size_percentage DECIMAL(6,2) NOT NULL,
        stop_loss_price DECIMAL(15,4),
        target_price DECIMAL(15,4),
        account_id INTEGER,
        client_id VARCHAR(255),
        dhan_response JSONB,
        position_calculation JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create ticker_cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticker_cache (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        order_count INTEGER DEFAULT 1,
        last_order_time TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(ticker, date)
      )
    `);

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_ticker ON alerts(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_signal ON alerts(signal)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_strategy ON alerts(strategy)',
      'CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON placed_orders(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_orders_ticker ON placed_orders(ticker)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON placed_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_alert_id ON placed_orders(alert_id)',
      'CREATE INDEX IF NOT EXISTS idx_ticker_cache_ticker_date ON ticker_cache(ticker, date)'
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
  } finally {
    client.release();
  }
}

async function exportAlerts(pool: Pool): Promise<any[]> {
  const result = await pool.query('SELECT * FROM alerts ORDER BY timestamp');
  return result.rows;
}

async function exportOrders(pool: Pool): Promise<any[]> {
  const result = await pool.query('SELECT * FROM placed_orders ORDER BY timestamp');
  return result.rows;
}

async function exportTickerCache(pool: Pool): Promise<any[]> {
  const result = await pool.query('SELECT * FROM ticker_cache ORDER BY date, ticker');
  return result.rows;
}

async function exportGenericTable(pool: Pool, tableName: string): Promise<any[]> {
  const result = await pool.query(`SELECT * FROM ${tableName}`);
  return result.rows;
}

async function importAlerts(pool: Pool, alerts: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const alert of alerts) {
    try {
      await pool.query(`
        INSERT INTO alerts (
          id, timestamp, alert_type, ticker, price, signal, strategy,
          custom_note, webhook_secret, original_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        alert.id, alert.timestamp, alert.alert_type, alert.ticker,
        alert.price, alert.signal, alert.strategy, alert.custom_note,
        alert.webhook_secret, alert.original_data, alert.created_at
      ]);
      
      // Check if row was actually inserted
      const check = await pool.query('SELECT id FROM alerts WHERE id = $1', [alert.id]);
      if (check.rows.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error importing alert ${alert.id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importOrders(pool: Pool, orders: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const order of orders) {
    try {
      await pool.query(`
        INSERT INTO placed_orders (
          id, alert_id, ticker, signal, price, quantity, timestamp,
          correlation_id, order_id, status, error, order_value,
          leveraged_value, position_size_percentage, stop_loss_price,
          target_price, account_id, client_id, dhan_response,
          position_calculation, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO NOTHING
      `, [
        order.id, order.alert_id, order.ticker, order.signal, order.price,
        order.quantity, order.timestamp, order.correlation_id, order.order_id,
        order.status, order.error, order.order_value, order.leveraged_value,
        order.position_size_percentage, order.stop_loss_price, order.target_price,
        order.account_id, order.client_id, order.dhan_response,
        order.position_calculation, order.created_at
      ]);
      
      const check = await pool.query('SELECT id FROM placed_orders WHERE id = $1', [order.id]);
      if (check.rows.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error importing order ${order.id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importTickerCache(pool: Pool, cache: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const item of cache) {
    try {
      await pool.query(`
        INSERT INTO ticker_cache (
          ticker, date, order_count, last_order_time, created_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ticker, date) DO UPDATE SET
          order_count = ticker_cache.order_count + EXCLUDED.order_count,
          last_order_time = CASE 
            WHEN EXCLUDED.last_order_time > ticker_cache.last_order_time 
            THEN EXCLUDED.last_order_time 
            ELSE ticker_cache.last_order_time 
          END
      `, [
        item.ticker, item.date, item.order_count,
        item.last_order_time, item.created_at
      ]);
      imported++;
    } catch (error) {
      console.error(`Error importing ticker cache ${item.ticker}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importUsers(pool: Pool, users: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const columns = Object.keys(user);
      const values = Object.values(user);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      await pool.query(`
        INSERT INTO users (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `, values);
      
      const check = await pool.query('SELECT id FROM users WHERE id = $1', [user.id]);
      if (check.rows.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error importing user ${user.id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importUserSessions(pool: Pool, sessions: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const session of sessions) {
    try {
      const columns = Object.keys(session);
      const values = Object.values(session);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      await pool.query(`
        INSERT INTO user_sessions (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `, values);
      
      const check = await pool.query('SELECT id FROM user_sessions WHERE id = $1', [session.id]);
      if (check.rows.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error importing session ${session.id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function importUserAuditLog(pool: Pool, logs: any[]): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const log of logs) {
    try {
      const columns = Object.keys(log);
      const values = Object.values(log);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      await pool.query(`
        INSERT INTO user_audit_log (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `, values);
      
      const check = await pool.query('SELECT id FROM user_audit_log WHERE id = $1', [log.id]);
      if (check.rows.length > 0) {
        imported++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error importing audit log ${log.id}:`, error);
      skipped++;
    }
  }

  return { imported, skipped };
}

async function verifyMigration(pool: Pool, stats: MigrationStats): Promise<void> {
  const alertsCount = await pool.query('SELECT COUNT(*) FROM alerts');
  const ordersCount = await pool.query('SELECT COUNT(*) FROM placed_orders');
  const cacheCount = await pool.query('SELECT COUNT(*) FROM ticker_cache');
  const usersCount = await pool.query('SELECT COUNT(*) FROM users');
  const sessionsCount = await pool.query('SELECT COUNT(*) FROM user_sessions');
  const auditCount = await pool.query('SELECT COUNT(*) FROM user_audit_log');

  console.log(`   Alerts in new DB: ${alertsCount.rows[0].count}`);
  console.log(`   Orders in new DB: ${ordersCount.rows[0].count}`);
  console.log(`   Cache entries in new DB: ${cacheCount.rows[0].count}`);
  console.log(`   Users in new DB: ${usersCount.rows[0].count}`);
  console.log(`   Sessions in new DB: ${sessionsCount.rows[0].count}`);
  console.log(`   Audit logs in new DB: ${auditCount.rows[0].count}`);

  // Verify indexes exist
  const indexes = await pool.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename IN ('alerts', 'placed_orders', 'ticker_cache', 'users', 'user_sessions', 'user_audit_log')
    ORDER BY indexname
  `);
  console.log(`   Indexes created: ${indexes.rows.length}`);
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateDatabase();
}

export { migrateDatabase };
