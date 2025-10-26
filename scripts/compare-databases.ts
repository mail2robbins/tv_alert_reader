import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function compareDatabases() {
  const newDatabaseUrl = process.env.DATABASE_URL;
  const oldDatabaseUrl = process.env.OLD_DATABASE_URL;
  
  if (!newDatabaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  if (!oldDatabaseUrl) {
    console.error('❌ OLD_DATABASE_URL not found in .env.local');
    console.log('\nPlease add OLD_DATABASE_URL to your .env.local file');
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

  try {
    console.log('🔍 Comparing databases...\n');

    // Test connections
    console.log('📡 Testing connections...');
    await oldPool.query('SELECT NOW()');
    console.log('✅ Old database connected');
    
    await newPool.query('SELECT NOW()');
    console.log('✅ New database connected\n');

    // Compare record counts
    console.log('📊 Record Counts:\n');
    
    const tables = ['alerts', 'placed_orders', 'ticker_cache'];
    
    for (const table of tables) {
      try {
        const oldCount = await oldPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const newCount = await newPool.query(`SELECT COUNT(*) as count FROM ${table}`);
        
        const oldNum = parseInt(oldCount.rows[0].count);
        const newNum = parseInt(newCount.rows[0].count);
        const diff = newNum - oldNum;
        
        console.log(`   ${table}:`);
        console.log(`      Old DB: ${oldNum}`);
        console.log(`      New DB: ${newNum}`);
        
        if (diff > 0) {
          console.log(`      📈 New DB has ${diff} more records`);
        } else if (diff < 0) {
          console.log(`      📉 New DB has ${Math.abs(diff)} fewer records`);
        } else {
          console.log(`      ✅ Same count`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ${table}: ⚠️  Table doesn't exist in one or both databases\n`);
      }
    }

    // Compare date ranges
    console.log('📅 Data Date Ranges:\n');
    
    for (const table of ['alerts', 'placed_orders']) {
      try {
        const oldRange = await oldPool.query(`
          SELECT 
            MIN(timestamp) as earliest,
            MAX(timestamp) as latest
          FROM ${table}
        `);
        
        const newRange = await newPool.query(`
          SELECT 
            MIN(timestamp) as earliest,
            MAX(timestamp) as latest
          FROM ${table}
        `);
        
        console.log(`   ${table}:`);
        
        if (oldRange.rows[0].earliest) {
          console.log(`      Old DB: ${oldRange.rows[0].earliest.toISOString().split('T')[0]} to ${oldRange.rows[0].latest.toISOString().split('T')[0]}`);
        } else {
          console.log(`      Old DB: No data`);
        }
        
        if (newRange.rows[0].earliest) {
          console.log(`      New DB: ${newRange.rows[0].earliest.toISOString().split('T')[0]} to ${newRange.rows[0].latest.toISOString().split('T')[0]}`);
        } else {
          console.log(`      New DB: No data`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ${table}: ⚠️  Cannot compare date ranges\n`);
      }
    }

    // Check for potential ID conflicts
    console.log('🔍 Checking for ID conflicts:\n');
    
    for (const table of ['alerts', 'placed_orders']) {
      try {
        const oldIds = await oldPool.query(`SELECT id FROM ${table}`);
        const newIds = await newPool.query(`SELECT id FROM ${table}`);
        
        const oldIdSet = new Set(oldIds.rows.map(r => r.id));
        const newIdSet = new Set(newIds.rows.map(r => r.id));
        
        const conflicts = [...oldIdSet].filter(id => newIdSet.has(id));
        
        console.log(`   ${table}:`);
        console.log(`      Old DB IDs: ${oldIdSet.size}`);
        console.log(`      New DB IDs: ${newIdSet.size}`);
        console.log(`      Conflicts: ${conflicts.length}`);
        
        if (conflicts.length > 0) {
          console.log(`      ⚠️  ${conflicts.length} records will be skipped during migration (already exist in new DB)`);
        } else {
          console.log(`      ✅ No conflicts - all records will be migrated`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ${table}: ⚠️  Cannot check for conflicts\n`);
      }
    }

    // Estimate migration impact
    console.log('📈 Migration Estimate:\n');
    
    try {
      const oldAlertsCount = await oldPool.query('SELECT COUNT(*) as count FROM alerts');
      const newAlertsCount = await newPool.query('SELECT COUNT(*) as count FROM alerts');
      const oldOrdersCount = await oldPool.query('SELECT COUNT(*) as count FROM placed_orders');
      const newOrdersCount = await newPool.query('SELECT COUNT(*) as count FROM placed_orders');
      
      const oldAlerts = parseInt(oldAlertsCount.rows[0].count);
      const newAlerts = parseInt(newAlertsCount.rows[0].count);
      const oldOrders = parseInt(oldOrdersCount.rows[0].count);
      const newOrders = parseInt(newOrdersCount.rows[0].count);
      
      // Get conflicts
      const oldAlertIds = await oldPool.query('SELECT id FROM alerts');
      const newAlertIds = await newPool.query('SELECT id FROM alerts');
      const alertConflicts = [...new Set(oldAlertIds.rows.map(r => r.id))].filter(
        id => new Set(newAlertIds.rows.map(r => r.id)).has(id)
      ).length;
      
      const oldOrderIds = await oldPool.query('SELECT id FROM placed_orders');
      const newOrderIds = await newPool.query('SELECT id FROM placed_orders');
      const orderConflicts = [...new Set(oldOrderIds.rows.map(r => r.id))].filter(
        id => new Set(newOrderIds.rows.map(r => r.id)).has(id)
      ).length;
      
      console.log(`   Expected to migrate:`);
      console.log(`      Alerts: ${oldAlerts - alertConflicts} new records (${alertConflicts} will be skipped)`);
      console.log(`      Orders: ${oldOrders - orderConflicts} new records (${orderConflicts} will be skipped)`);
      console.log('');
      console.log(`   After migration, new DB will have:`);
      console.log(`      Alerts: ~${newAlerts + (oldAlerts - alertConflicts)} total`);
      console.log(`      Orders: ~${newOrders + (oldOrders - orderConflicts)} total`);
    } catch (error) {
      console.log('   ⚠️  Cannot estimate migration impact');
    }

    console.log('\n✅ Comparison completed!');
    console.log('\n💡 Next step: Run `npm run db:migrate` to start the migration');

  } catch (error) {
    console.error('\n❌ Comparison failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

// Run comparison if this script is executed directly
if (require.main === module) {
  compareDatabases();
}

export { compareDatabases };
