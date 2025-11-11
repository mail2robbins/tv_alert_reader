import { config } from 'dotenv';
import { initializeAccountSettingsTable, createAccountSettings } from '../src/lib/accountSettingsDatabase';
import { testDatabaseConnection } from '../src/lib/database';

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}

async function migrateAccountSettings() {
  try {
    console.log('Testing database connection...');
    const isConnected = await testDatabaseConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    console.log('\n📊 Creating account_settings table...');
    await initializeAccountSettingsTable();
    console.log('✅ Account settings table created successfully');
    
    // Migrate existing .env configurations to database
    console.log('\n🔄 Migrating existing .env configurations to database...');
    
    const migratedAccounts: string[] = [];
    
    // Check for numbered account configurations (1-5)
    for (let i = 1; i <= 5; i++) {
      const accessToken = process.env[`DHAN_ACCESS_TOKEN_${i}`];
      const clientId = process.env[`DHAN_CLIENT_ID_${i}`];
      
      if (accessToken && clientId && accessToken.trim() !== '' && clientId.trim() !== '') {
        try {
          await createAccountSettings({
            dhanClientId: clientId,
            dhanAccessToken: accessToken,
            availableFunds: parseFloat(process.env[`AVAILABLE_FUNDS_${i}`] || '20000'),
            leverage: parseFloat(process.env[`LEVERAGE_${i}`] || '2'),
            maxPositionSize: parseFloat(process.env[`MAX_POSITION_SIZE_${i}`] || '0.1'),
            minOrderValue: parseFloat(process.env[`MIN_ORDER_VALUE_${i}`] || '1000'),
            maxOrderValue: parseFloat(process.env[`MAX_ORDER_VALUE_${i}`] || '50000'),
            stopLossPercentage: parseFloat(process.env[`STOP_LOSS_PERCENTAGE_${i}`] || '0.01'),
            targetPricePercentage: parseFloat(process.env[`TARGET_PRICE_PERCENTAGE_${i}`] || '0.015'),
            riskOnCapital: parseFloat(process.env[`RISK_ON_CAPITAL_${i}`] || '2.0'),
            enableTrailingStopLoss: process.env[`ENABLE_TRAILING_STOP_LOSS_${i}`] === 'true',
            minTrailJump: parseFloat(process.env[`MIN_TRAIL_JUMP_${i}`] || '0.05'),
            rebaseTpAndSl: process.env[`REBASE_TP_AND_SL_${i}`] === 'true',
            rebaseThresholdPercentage: parseFloat(process.env[`REBASE_THRESHOLD_PERCENTAGE_${i}`] || '0.02'),
            allowDuplicateTickers: process.env[`ALLOW_DUPLICATE_TICKERS_${i}`] === 'true',
            orderType: process.env[`DHAN_ORDER_TYPE_${i}`] || process.env.DHAN_ORDER_TYPE || 'LIMIT',
            limitBufferPercentage: parseFloat(process.env[`LIMIT_BUFFER_PERCENTAGE_${i}`] || '0.0'),
            isActive: true
          });
          
          migratedAccounts.push(`Account ${i} (Client ID: ${clientId})`);
          console.log(`  ✅ Migrated Account ${i} (Client ID: ${clientId})`);
        } catch (error: any) {
          if (error.message && error.message.includes('duplicate key')) {
            console.log(`  ⚠️  Account ${i} (Client ID: ${clientId}) already exists in database, skipping...`);
          } else {
            console.error(`  ❌ Failed to migrate Account ${i}:`, error);
          }
        }
      }
    }
    
    // Check for legacy configuration if no numbered accounts were found
    if (migratedAccounts.length === 0) {
      const legacyAccessToken = process.env.DHAN_ACCESS_TOKEN;
      const legacyClientId = process.env.DHAN_CLIENT_ID;
      
      if (legacyAccessToken && legacyClientId && legacyAccessToken.trim() !== '' && legacyClientId.trim() !== '') {
        try {
          await createAccountSettings({
            dhanClientId: legacyClientId,
            dhanAccessToken: legacyAccessToken,
            availableFunds: parseFloat(process.env.AVAILABLE_FUNDS || '20000'),
            leverage: parseFloat(process.env.LEVERAGE || '2'),
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
            minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE || '1000'),
            maxOrderValue: parseFloat(process.env.MAX_ORDER_VALUE || '50000'),
            stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.01'),
            targetPricePercentage: parseFloat(process.env.TARGET_PRICE_PERCENTAGE || '0.015'),
            riskOnCapital: parseFloat(process.env.RISK_ON_CAPITAL || '2.0'),
            enableTrailingStopLoss: process.env.ENABLE_TRAILING_STOP_LOSS === 'true',
            minTrailJump: parseFloat(process.env.MIN_TRAIL_JUMP || '0.05'),
            rebaseTpAndSl: process.env.REBASE_TP_AND_SL === 'true',
            rebaseThresholdPercentage: parseFloat(process.env.REBASE_THRESHOLD_PERCENTAGE || '0.02'),
            allowDuplicateTickers: process.env.ALLOW_DUPLICATE_TICKERS === 'true',
            orderType: process.env.DHAN_ORDER_TYPE || 'LIMIT',
            limitBufferPercentage: parseFloat(process.env.LIMIT_BUFFER_PERCENTAGE || '0.0'),
            isActive: true
          });
          
          migratedAccounts.push(`Legacy Account (Client ID: ${legacyClientId})`);
          console.log(`  ✅ Migrated Legacy Account (Client ID: ${legacyClientId})`);
        } catch (error: any) {
          if (error.message && error.message.includes('duplicate key')) {
            console.log(`  ⚠️  Legacy Account (Client ID: ${legacyClientId}) already exists in database, skipping...`);
          } else {
            console.error(`  ❌ Failed to migrate Legacy Account:`, error);
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    if (migratedAccounts.length > 0) {
      console.log('\n📋 Migrated Accounts:');
      migratedAccounts.forEach(account => console.log(`  - ${account}`));
    } else {
      console.log('\n⚠️  No accounts were migrated. Either no accounts are configured in .env or they already exist in the database.');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Access the Account Settings UI at /account-settings');
    console.log('  2. Verify all account configurations are correct');
    console.log('  3. You can now manage account settings through the UI instead of .env file');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateAccountSettings();
}

export { migrateAccountSettings };
