import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function checkUsersConstraints() {
  const newDatabaseUrl = process.env.DATABASE_URL;
  const oldDatabaseUrl = process.env.OLD_DATABASE_URL;
  
  if (!newDatabaseUrl || !oldDatabaseUrl) {
    console.error('❌ DATABASE_URL or OLD_DATABASE_URL not found');
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
    console.log('🔍 Checking users table constraints in detail...\n');

    console.log('OLD DATABASE:');
    console.log('─'.repeat(80));
    const oldConstraints = await oldPool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'users'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);
    
    console.log('Constraints:');
    oldConstraints.rows.forEach(row => {
      console.log(`  ${row.constraint_name.padEnd(40)} ${row.constraint_type.padEnd(15)} ${row.column_name || ''}`);
    });

    console.log('\n\nNEW DATABASE:');
    console.log('─'.repeat(80));
    const newConstraints = await newPool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'users'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);
    
    console.log('Constraints:');
    newConstraints.rows.forEach(row => {
      console.log(`  ${row.constraint_name.padEnd(40)} ${row.constraint_type.padEnd(15)} ${row.column_name || ''}`);
    });

    console.log('\n\nINDEXES (NEW DATABASE):');
    console.log('─'.repeat(80));
    const newIndexes = await newPool.query(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'users'
        AND t.relkind = 'r'
      ORDER BY i.relname, a.attnum
    `);
    
    console.log('Indexes:');
    newIndexes.rows.forEach(row => {
      console.log(`  ${row.index_name.padEnd(40)} ${row.column_name.padEnd(20)} unique: ${row.is_unique}`);
    });

  } catch (error) {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  checkUsersConstraints();
}

export { checkUsersConstraints };
