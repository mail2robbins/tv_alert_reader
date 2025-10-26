import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface TableSchema {
  [columnName: string]: ColumnInfo;
}

async function compareSchemas() {
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
    console.log('🔍 Comparing database schemas...\n');

    // Test connections
    await oldPool.query('SELECT NOW()');
    console.log('✅ Old database connected');
    
    await newPool.query('SELECT NOW()');
    console.log('✅ New database connected\n');

    const tables = ['alerts', 'placed_orders', 'ticker_cache'];
    let hasDifferences = false;
    const missingColumns: { [table: string]: ColumnInfo[] } = {};

    for (const table of tables) {
      console.log(`📊 Checking table: ${table}`);
      console.log('─'.repeat(60));

      // Get schema from old database
      const oldSchema = await getTableSchema(oldPool, table);
      const newSchema = await getTableSchema(newPool, table);

      if (Object.keys(oldSchema).length === 0) {
        console.log(`   ⚠️  Table doesn't exist in old database\n`);
        continue;
      }

      if (Object.keys(newSchema).length === 0) {
        console.log(`   ⚠️  Table doesn't exist in new database\n`);
        continue;
      }

      // Compare columns
      const oldColumns = Object.keys(oldSchema);
      const newColumns = Object.keys(newSchema);

      const missingInNew = oldColumns.filter(col => !newColumns.includes(col));
      const missingInOld = newColumns.filter(col => !oldColumns.includes(col));
      const commonColumns = oldColumns.filter(col => newColumns.includes(col));

      if (missingInNew.length > 0) {
        hasDifferences = true;
        missingColumns[table] = missingInNew.map(col => oldSchema[col]);
        console.log(`   ⚠️  Columns in OLD DB but missing in NEW DB:`);
        missingInNew.forEach(col => {
          const info = oldSchema[col];
          console.log(`      - ${col} (${info.data_type}${info.character_maximum_length ? `(${info.character_maximum_length})` : ''}) ${info.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }

      if (missingInOld.length > 0) {
        console.log(`   ℹ️  Columns in NEW DB but not in OLD DB:`);
        missingInOld.forEach(col => {
          const info = newSchema[col];
          console.log(`      - ${col} (${info.data_type}${info.character_maximum_length ? `(${info.character_maximum_length})` : ''}) ${info.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }

      // Check data type differences for common columns
      const typeDifferences: string[] = [];
      commonColumns.forEach(col => {
        const oldCol = oldSchema[col];
        const newCol = newSchema[col];
        
        if (oldCol.data_type !== newCol.data_type) {
          typeDifferences.push(`${col}: ${oldCol.data_type} → ${newCol.data_type}`);
        }
      });

      if (typeDifferences.length > 0) {
        hasDifferences = true;
        console.log(`   ⚠️  Data type differences:`);
        typeDifferences.forEach(diff => console.log(`      - ${diff}`));
      }

      if (missingInNew.length === 0 && missingInOld.length === 0 && typeDifferences.length === 0) {
        console.log(`   ✅ Schemas match perfectly`);
      }

      console.log('');
    }

    if (hasDifferences) {
      console.log('\n⚠️  Schema differences detected!\n');
      console.log('Would you like to:');
      console.log('1. Add missing columns to NEW database');
      console.log('2. Generate SQL script to review first\n');
      
      // Generate SQL to add missing columns
      if (Object.keys(missingColumns).length > 0) {
        console.log('📝 SQL to add missing columns to NEW database:\n');
        console.log('─'.repeat(60));
        
        for (const [table, columns] of Object.entries(missingColumns)) {
          console.log(`\n-- Table: ${table}`);
          columns.forEach(col => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
            let dataType = col.data_type;
            
            // Handle specific data types
            if (col.data_type === 'character varying' && col.character_maximum_length) {
              dataType = `VARCHAR(${col.character_maximum_length})`;
            } else if (col.data_type === 'numeric') {
              dataType = 'DECIMAL(15,4)'; // Default precision
            } else if (col.data_type === 'timestamp with time zone') {
              dataType = 'TIMESTAMP WITH TIME ZONE';
            } else if (col.data_type === 'jsonb') {
              dataType = 'JSONB';
            } else if (col.data_type === 'text') {
              dataType = 'TEXT';
            }
            
            console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col.column_name} ${dataType}${defaultVal};`);
          });
        }
        console.log('\n' + '─'.repeat(60));
      }
    } else {
      console.log('✅ All schemas match! No differences found.\n');
      console.log('💡 You can proceed with migration: npm run db:migrate');
    }

  } catch (error) {
    console.error('\n❌ Schema comparison failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

async function getTableSchema(pool: Pool, tableName: string): Promise<TableSchema> {
  try {
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const schema: TableSchema = {};
    result.rows.forEach((row: ColumnInfo) => {
      schema[row.column_name] = row;
    });

    return schema;
  } catch (error) {
    return {};
  }
}

// Run comparison if this script is executed directly
if (require.main === module) {
  compareSchemas();
}

export { compareSchemas };
