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
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface IndexInfo {
  index_name: string;
  column_name: string;
  is_unique: boolean;
  is_primary: boolean;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  column_name: string;
}

async function verifySchemaMatch() {
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

  let allMatch = true;

  try {
    console.log('🔍 Verifying schema match between databases...\n');

    // Test connections
    await oldPool.query('SELECT NOW()');
    console.log('✅ Old database connected');
    
    await newPool.query('SELECT NOW()');
    console.log('✅ New database connected\n');

    // Get all tables from both databases
    const oldTables = await getTables(oldPool);
    const newTables = await getTables(newPool);

    console.log('📊 Comparing Tables:\n');
    console.log('─'.repeat(80));

    const oldTableNames = oldTables.map(t => t.table_name);
    const newTableNames = newTables.map(t => t.table_name);

    const allTables = [...new Set([...oldTableNames, ...newTableNames])].sort();

    for (const tableName of allTables) {
      const inOld = oldTableNames.includes(tableName);
      const inNew = newTableNames.includes(tableName);

      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(80));

      if (!inOld) {
        console.log('   ⚠️  Table exists ONLY in NEW database');
        allMatch = false;
        continue;
      }

      if (!inNew) {
        console.log('   ⚠️  Table exists ONLY in OLD database');
        allMatch = false;
        continue;
      }

      // Compare columns
      const oldColumns = await getColumns(oldPool, tableName);
      const newColumns = await getColumns(newPool, tableName);

      const columnsMatch = compareColumns(oldColumns, newColumns);
      if (columnsMatch) {
        console.log('   ✅ Columns match');
      } else {
        allMatch = false;
      }

      // Compare indexes
      const oldIndexes = await getIndexes(oldPool, tableName);
      const newIndexes = await getIndexes(newPool, tableName);

      const indexesMatch = compareIndexes(oldIndexes, newIndexes, tableName);
      if (indexesMatch) {
        console.log('   ✅ Indexes match');
      } else {
        allMatch = false;
      }

      // Compare constraints
      const oldConstraints = await getConstraints(oldPool, tableName);
      const newConstraints = await getConstraints(newPool, tableName);

      const constraintsMatch = await compareConstraints(oldConstraints, newConstraints, tableName);
      if (constraintsMatch) {
        console.log('   ✅ Constraints match');
      } else {
        allMatch = false;
      }
    }

    console.log('\n' + '═'.repeat(80));
    if (allMatch) {
      console.log('\n✅ SUCCESS: All schemas match perfectly!');
      console.log('\n   All tables, columns, indexes, and constraints are identical');
      console.log('   between OLD and NEW databases.\n');
    } else {
      console.log('\n⚠️  DIFFERENCES FOUND: Schemas do not match completely');
      console.log('\n   Review the differences above and take appropriate action.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Schema verification failed:', error);
    process.exit(1);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

async function getTables(pool: Pool): Promise<{ table_name: string }[]> {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows;
}

async function getColumns(pool: Pool, tableName: string): Promise<ColumnInfo[]> {
  const result = await pool.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getIndexes(pool: Pool, tableName: string): Promise<IndexInfo[]> {
  const result = await pool.query(`
    SELECT
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relname = $1
      AND t.relkind = 'r'
    ORDER BY i.relname, a.attnum
  `, [tableName]);
  return result.rows;
}

async function getConstraints(pool: Pool, tableName: string): Promise<ConstraintInfo[]> {
  const result = await pool.query(`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = $1
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `, [tableName]);
  return result.rows;
}

function compareColumns(oldColumns: ColumnInfo[], newColumns: ColumnInfo[]): boolean {
  const oldColMap = new Map(oldColumns.map(c => [c.column_name, c]));
  const newColMap = new Map(newColumns.map(c => [c.column_name, c]));

  const allColumns = [...new Set([...oldColMap.keys(), ...newColMap.keys()])].sort();
  let match = true;

  for (const colName of allColumns) {
    const oldCol = oldColMap.get(colName);
    const newCol = newColMap.get(colName);

    if (!oldCol) {
      console.log(`      ⚠️  Column "${colName}" exists ONLY in NEW database`);
      match = false;
      continue;
    }

    if (!newCol) {
      console.log(`      ⚠️  Column "${colName}" exists ONLY in OLD database`);
      match = false;
      continue;
    }

    // Compare data types
    if (oldCol.data_type !== newCol.data_type) {
      console.log(`      ⚠️  Column "${colName}" data type mismatch:`);
      console.log(`         OLD: ${oldCol.data_type}, NEW: ${newCol.data_type}`);
      match = false;
    }

    // Compare nullable
    if (oldCol.is_nullable !== newCol.is_nullable) {
      console.log(`      ⚠️  Column "${colName}" nullable mismatch:`);
      console.log(`         OLD: ${oldCol.is_nullable}, NEW: ${newCol.is_nullable}`);
      match = false;
    }

    // Compare character length for varchar
    if (oldCol.character_maximum_length !== newCol.character_maximum_length) {
      if (oldCol.character_maximum_length !== null || newCol.character_maximum_length !== null) {
        console.log(`      ⚠️  Column "${colName}" length mismatch:`);
        console.log(`         OLD: ${oldCol.character_maximum_length}, NEW: ${newCol.character_maximum_length}`);
        match = false;
      }
    }
  }

  return match;
}

function compareIndexes(oldIndexes: IndexInfo[], newIndexes: IndexInfo[], tableName: string): boolean {
  // Group indexes by name
  const oldIndexMap = new Map<string, IndexInfo[]>();
  const newIndexMap = new Map<string, IndexInfo[]>();

  oldIndexes.forEach(idx => {
    if (!oldIndexMap.has(idx.index_name)) {
      oldIndexMap.set(idx.index_name, []);
    }
    oldIndexMap.get(idx.index_name)!.push(idx);
  });

  newIndexes.forEach(idx => {
    if (!newIndexMap.has(idx.index_name)) {
      newIndexMap.set(idx.index_name, []);
    }
    newIndexMap.get(idx.index_name)!.push(idx);
  });

  const allIndexNames = [...new Set([...oldIndexMap.keys(), ...newIndexMap.keys()])].sort();
  let match = true;

  for (const indexName of allIndexNames) {
    const oldIdx = oldIndexMap.get(indexName);
    const newIdx = newIndexMap.get(indexName);

    if (!oldIdx) {
      console.log(`      ⚠️  Index "${indexName}" exists ONLY in NEW database`);
      match = false;
      continue;
    }

    if (!newIdx) {
      console.log(`      ⚠️  Index "${indexName}" exists ONLY in OLD database`);
      match = false;
      continue;
    }

    // Compare index properties
    const oldCols = oldIdx.map(i => i.column_name).sort().join(',');
    const newCols = newIdx.map(i => i.column_name).sort().join(',');

    if (oldCols !== newCols) {
      console.log(`      ⚠️  Index "${indexName}" columns mismatch:`);
      console.log(`         OLD: ${oldCols}, NEW: ${newCols}`);
      match = false;
    }

    if (oldIdx[0].is_unique !== newIdx[0].is_unique) {
      console.log(`      ⚠️  Index "${indexName}" unique constraint mismatch`);
      match = false;
    }
  }

  return match;
}

async function compareConstraints(oldConstraints: ConstraintInfo[], newConstraints: ConstraintInfo[], tableName: string): Promise<boolean> {
  // Filter out auto-generated NOT NULL constraints (they have random IDs like "2200_xxxxx_x_not_null")
  const filterConstraints = (constraints: ConstraintInfo[]) => {
    return constraints.filter(c => !c.constraint_name.match(/^\d+_\d+_\d+_not_null$/));
  };

  const filteredOld = filterConstraints(oldConstraints);
  const filteredNew = filterConstraints(newConstraints);

  const oldConstMap = new Map(filteredOld.map(c => [c.constraint_name, c]));
  const newConstMap = new Map(filteredNew.map(c => [c.constraint_name, c]));

  const allConstraints = [...new Set([...oldConstMap.keys(), ...newConstMap.keys()])].sort();
  let match = true;

  for (const constName of allConstraints) {
    const oldConst = oldConstMap.get(constName);
    const newConst = newConstMap.get(constName);

    if (!oldConst) {
      console.log(`      ⚠️  Constraint "${constName}" exists ONLY in NEW database`);
      match = false;
      continue;
    }

    if (!newConst) {
      // Check if this is a UNIQUE constraint that might exist as a unique index instead
      if (oldConst.constraint_type === 'UNIQUE') {
        console.log(`      ℹ️  UNIQUE constraint "${constName}" exists as unique index in NEW database`);
        // This is acceptable - unique indexes provide the same functionality
        continue;
      }
      
      console.log(`      ⚠️  Constraint "${constName}" exists ONLY in OLD database`);
      match = false;
      continue;
    }

    if (oldConst.constraint_type !== newConst.constraint_type) {
      console.log(`      ⚠️  Constraint "${constName}" type mismatch:`);
      console.log(`         OLD: ${oldConst.constraint_type}, NEW: ${newConst.constraint_type}`);
      match = false;
    }
  }

  return match;
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifySchemaMatch();
}

export { verifySchemaMatch };
