import { config } from 'dotenv';
import { initializeDatabaseSchema, testDatabaseConnection } from '../src/lib/database';

// Load environment variables from .env.local (only in development)
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

async function initializeDatabase() {
  try {
    console.log('Testing database connection...');
    const isConnected = await testDatabaseConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    console.log('Initializing database schema...');
    await initializeDatabaseSchema();
    
    console.log('✅ Database initialization completed successfully!');
    console.log('📊 Created tables: alerts, placed_orders, ticker_cache');
    console.log('🔍 Created indexes for optimal performance');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
