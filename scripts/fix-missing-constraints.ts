import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function fixMissingConstraints() {
  const newDatabaseUrl = process.env.DATABASE_URL;
  
  if (!newDatabaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const newPool = new Pool({
    connectionString: newDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Adding missing constraints to NEW database...\n');

    await newPool.query('SELECT NOW()');
    console.log('✅ New database connected\n');

    // Add missing constraints for users table
    console.log('📋 Fixing users table constraints...');
    
    try {
      await newPool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_username_key UNIQUE (username)
      `);
      console.log('   ✅ Added unique constraint on username');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('   ℹ️  Constraint users_username_key already exists');
      } else {
        throw error;
      }
    }

    try {
      await newPool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_email_key UNIQUE (email)
      `);
      console.log('   ✅ Added unique constraint on email');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('   ℹ️  Constraint users_email_key already exists');
      } else {
        throw error;
      }
    }

    try {
      await newPool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_dhan_client_id_key UNIQUE (dhan_client_id)
      `);
      console.log('   ✅ Added unique constraint on dhan_client_id');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('   ℹ️  Constraint users_dhan_client_id_key already exists');
      } else {
        throw error;
      }
    }

    // Add missing foreign key for user_sessions
    console.log('\n📋 Fixing user_sessions table constraints...');
    
    try {
      await newPool.query(`
        ALTER TABLE user_sessions 
        ADD CONSTRAINT user_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('   ✅ Added foreign key constraint on user_id');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('   ℹ️  Constraint user_sessions_user_id_fkey already exists');
      } else {
        throw error;
      }
    }

    // Add missing foreign key for user_audit_log
    console.log('\n📋 Fixing user_audit_log table constraints...');
    
    try {
      await newPool.query(`
        ALTER TABLE user_audit_log 
        ADD CONSTRAINT user_audit_log_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('   ✅ Added foreign key constraint on user_id');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('   ℹ️  Constraint user_audit_log_user_id_fkey already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All missing constraints added successfully!\n');
    console.log('💡 Run `npm run db:verify-schema` to verify the schemas match now');

  } catch (error) {
    console.error('\n❌ Failed to add constraints:', error);
    process.exit(1);
  } finally {
    await newPool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  fixMissingConstraints();
}

export { fixMissingConstraints };
