import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function syncUserTables() {
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
    console.log('🔄 Syncing user tables schema...\n');

    // Test connections
    await oldPool.query('SELECT NOW()');
    console.log('✅ Old database connected');
    
    await newPool.query('SELECT NOW()');
    console.log('✅ New database connected\n');

    const userTables = ['users', 'user_sessions', 'user_audit_log'];

    for (const tableName of userTables) {
      console.log(`📊 Processing table: ${tableName}`);
      console.log('─'.repeat(60));

      // Get the CREATE TABLE statement from old database
      const schemaQuery = await oldPool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (schemaQuery.rows.length === 0) {
        console.log(`   ⚠️  Table ${tableName} not found in old database\n`);
        continue;
      }

      // Build CREATE TABLE statement
      let createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      const columns: string[] = [];

      for (const col of schemaQuery.rows) {
        let columnDef = `  ${col.column_name} `;
        
        // Map data types
        if (col.data_type === 'character varying') {
          columnDef += `VARCHAR(${col.character_maximum_length || 255})`;
        } else if (col.data_type === 'timestamp with time zone') {
          columnDef += 'TIMESTAMP WITH TIME ZONE';
        } else if (col.data_type === 'timestamp without time zone') {
          columnDef += 'TIMESTAMP';
        } else if (col.data_type === 'USER-DEFINED' && col.udt_name === 'jsonb') {
          columnDef += 'JSONB';
        } else if (col.data_type === 'integer') {
          columnDef += 'INTEGER';
        } else if (col.data_type === 'bigint') {
          columnDef += 'BIGINT';
        } else if (col.data_type === 'boolean') {
          columnDef += 'BOOLEAN';
        } else if (col.data_type === 'text') {
          columnDef += 'TEXT';
        } else if (col.data_type === 'ARRAY') {
          columnDef += 'TEXT[]';
        } else {
          columnDef += col.data_type.toUpperCase();
        }

        // Add constraints
        if (col.column_default) {
          if (col.column_default.includes('nextval')) {
            // Handle SERIAL types
            if (col.data_type === 'integer') {
              columnDef = `  ${col.column_name} SERIAL`;
            } else if (col.data_type === 'bigint') {
              columnDef = `  ${col.column_name} BIGSERIAL`;
            }
          } else {
            columnDef += ` DEFAULT ${col.column_default}`;
          }
        }

        if (col.is_nullable === 'NO') {
          columnDef += ' NOT NULL';
        }

        columns.push(columnDef);
      }

      createTableSQL += columns.join(',\n');
      createTableSQL += '\n)';

      // Get primary key constraint
      const pkQuery = await oldPool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = $1::regclass AND i.indisprimary
      `, [tableName]);

      if (pkQuery.rows.length > 0) {
        const pkColumns = pkQuery.rows.map(r => r.attname).join(', ');
        createTableSQL = createTableSQL.replace('\n)', `,\n  PRIMARY KEY (${pkColumns})\n)`);
      }

      console.log(`   Creating table in new database...`);
      await newPool.query(createTableSQL);
      console.log(`   ✅ Table ${tableName} created\n`);

      // Get and create indexes
      const indexQuery = await oldPool.query(`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = $1
          AND t.relkind = 'r'
          AND i.relname NOT LIKE '%_pkey'
        ORDER BY i.relname, a.attnum
      `, [tableName]);

      if (indexQuery.rows.length > 0) {
        const indexMap = new Map<string, { columns: string[], unique: boolean }>();
        
        for (const row of indexQuery.rows) {
          if (!indexMap.has(row.index_name)) {
            indexMap.set(row.index_name, { columns: [], unique: row.is_unique });
          }
          indexMap.get(row.index_name)!.columns.push(row.column_name);
        }

        for (const [indexName, indexInfo] of indexMap) {
          const uniqueStr = indexInfo.unique ? 'UNIQUE ' : '';
          const indexSQL = `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${indexInfo.columns.join(', ')})`;
          await newPool.query(indexSQL);
          console.log(`   ✅ Index ${indexName} created`);
        }
        console.log('');
      }
    }

    console.log('✅ User tables schema synced successfully!\n');
    console.log('💡 Next step: Run `npm run db:migrate` to migrate all data');

  } catch (error) {
    console.error('\n❌ Schema sync failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  syncUserTables();
}

export { syncUserTables };
