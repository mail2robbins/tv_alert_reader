import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function listAllTables() {
  const newDatabaseUrl = process.env.DATABASE_URL;
  const oldDatabaseUrl = process.env.OLD_DATABASE_URL;
  
  if (!newDatabaseUrl || !oldDatabaseUrl) {
    console.error('❌ DATABASE_URL or OLD_DATABASE_URL not found in .env.local');
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
    console.log('🔍 Listing all tables in both databases...\n');

    // Get tables from old database
    const oldTables = await oldPool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get tables from new database
    const newTables = await newPool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📊 OLD DATABASE Tables:');
    console.log('─'.repeat(60));
    if (oldTables.rows.length === 0) {
      console.log('   No tables found');
    } else {
      for (const row of oldTables.rows) {
        // Get row count
        const countResult = await oldPool.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        const rowCount = countResult.rows[0].count;
        console.log(`   ${row.table_name.padEnd(30)} (${row.column_count} columns, ${rowCount} rows)`);
      }
    }

    console.log('\n📊 NEW DATABASE Tables:');
    console.log('─'.repeat(60));
    if (newTables.rows.length === 0) {
      console.log('   No tables found');
    } else {
      for (const row of newTables.rows) {
        // Get row count
        const countResult = await newPool.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        const rowCount = countResult.rows[0].count;
        console.log(`   ${row.table_name.padEnd(30)} (${row.column_count} columns, ${rowCount} rows)`);
      }
    }

    // Compare tables
    console.log('\n🔍 Comparison:');
    console.log('─'.repeat(60));

    const oldTableNames = oldTables.rows.map(r => r.table_name);
    const newTableNames = newTables.rows.map(r => r.table_name);

    const onlyInOld = oldTableNames.filter(t => !newTableNames.includes(t));
    const onlyInNew = newTableNames.filter(t => !oldTableNames.includes(t));
    const inBoth = oldTableNames.filter(t => newTableNames.includes(t));

    if (inBoth.length > 0) {
      console.log(`\n✅ Tables in BOTH databases (${inBoth.length}):`);
      inBoth.forEach(t => console.log(`   - ${t}`));
    }

    if (onlyInOld.length > 0) {
      console.log(`\n⚠️  Tables ONLY in OLD database (${onlyInOld.length}):`);
      onlyInOld.forEach(t => console.log(`   - ${t}`));
    }

    if (onlyInNew.length > 0) {
      console.log(`\n⚠️  Tables ONLY in NEW database (${onlyInNew.length}):`);
      onlyInNew.forEach(t => console.log(`   - ${t}`));
    }

    if (onlyInOld.length === 0 && onlyInNew.length === 0) {
      console.log('\n✅ Both databases have the same tables!');
    }

  } catch (error) {
    console.error('\n❌ Failed to list tables:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  listAllTables();
}

export { listAllTables };
