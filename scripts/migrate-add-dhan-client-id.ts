import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getDatabaseConnection, closeDatabaseConnection } from '../src/lib/database';

// Load environment variables from .env.local in non-production
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

async function runMigration() {
  console.log('Starting DHAN_CLIENT_ID migration...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please add it to your .env.local');
    process.exit(1);
  }

  const sqlFilePath = path.resolve(__dirname, 'add-dhan-client-id-migration.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ Migration file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf-8');

  const client = await getDatabaseConnection();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ DHAN_CLIENT_ID migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await closeDatabaseConnection();
  }
}

if (require.main === module) {
  runMigration();
}

export { runMigration };

