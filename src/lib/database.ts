import { Pool, PoolClient } from 'pg';

// Database connection pool
let pool: Pool | null = null;

// Initialize database connection
export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10, // Reduced from 20
    min: 1, // Minimum connections
    idleTimeoutMillis: 10000, // Reduced from 30000
    connectionTimeoutMillis: 5000, // Increased from 2000
  });

  return pool;
}

// Get database connection with retry logic
export async function getDatabaseConnection(retries: number = 3): Promise<PoolClient> {
  const db = initializeDatabase();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await db.connect();
      return client;
    } catch (error) {
      console.warn(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        throw new Error(`Failed to connect to database after ${retries} attempts: ${error}`);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Database connection failed');
}

// Close database connection
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Initialize database schema
export async function initializeDatabaseSchema(): Promise<void> {
  const client = await getDatabaseConnection();
  
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
        position_size_percentage DECIMAL(5,4) NOT NULL,
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

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_ticker ON alerts(ticker);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_signal ON alerts(signal);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_strategy ON alerts(strategy);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON placed_orders(timestamp DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_ticker ON placed_orders(ticker);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON placed_orders(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_alert_id ON placed_orders(alert_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ticker_cache_ticker_date ON ticker_cache(ticker, date);
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await getDatabaseConnection();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Check if database is available (without throwing errors)
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    
    const client = await getDatabaseConnection(1); // Single retry for health check
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.warn('Database not available:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
