# Database Migration Guide

This guide will help you migrate your PostgreSQL database from one instance to another, handling cases where the new database may already have some data.

## Overview

The migration script will:
- ✅ Export all data from your old database
- ✅ Create schema in the new database (if not exists)
- ✅ Import data with conflict resolution (skip duplicates)
- ✅ Create JSON backups of all exported data
- ✅ Verify the migration was successful

## Prerequisites

1. **New Database URL**: Already configured in `.env.local` as `DATABASE_URL`
2. **Old Database URL**: You'll need the connection string for your old database
3. **Database Access**: Ensure both databases are accessible from your machine

## Migration Steps

### Step 1: Prepare Environment Variables

Your `.env.local` should already have the new `DATABASE_URL`. Now add the old database URL temporarily:

```env
# New database (already configured)
DATABASE_URL=postgresql://new_user:new_password@new_host:5432/new_database

# Old database (add this temporarily for migration)
OLD_DATABASE_URL=postgresql://old_user:old_password@old_host:5432/old_database
```

### Step 2: Run the Migration

Execute the migration script:

```bash
npm run db:migrate
```

**Alternative**: If you prefer not to add `OLD_DATABASE_URL` to `.env.local`, you can set it as an environment variable:

**PowerShell (Windows):**
```powershell
$env:OLD_DATABASE_URL="postgresql://old_user:old_password@old_host:5432/old_database"
npm run db:migrate
```

**Bash (Linux/Mac):**
```bash
OLD_DATABASE_URL="postgresql://old_user:old_password@old_host:5432/old_database" npm run db:migrate
```

### Step 3: Monitor the Migration

The script will show progress for each step:

```
🔄 Starting database migration...

📡 Testing database connections...
✅ Old database connection successful
✅ New database connection successful

🏗️  Initializing schema in new database...
✅ Schema initialized

📊 Migrating alerts table...
💾 Backup saved: data/migration-backup/alerts-2024-01-15T10-30-00-000Z.json
✅ Alerts: 150 exported, 145 imported, 5 skipped

📦 Migrating placed_orders table...
💾 Backup saved: data/migration-backup/placed_orders-2024-01-15T10-30-00-000Z.json
✅ Orders: 200 exported, 195 imported, 5 skipped

🎯 Migrating ticker_cache table...
💾 Backup saved: data/migration-backup/ticker_cache-2024-01-15T10-30-00-000Z.json
✅ Cache: 50 exported, 45 imported, 5 skipped

🔍 Verifying migration...
   Alerts in new DB: 145
   Orders in new DB: 195
   Cache entries in new DB: 45
   Indexes created: 9

✅ Migration completed successfully!

📊 Summary:
   Alerts: 145/150 migrated
   Orders: 195/200 migrated
   Cache: 45/50 migrated

💾 Backups saved in: data/migration-backup
```

## How the Migration Handles Existing Data

### Conflict Resolution Strategy

1. **Alerts & Orders**: Uses `ON CONFLICT (id) DO NOTHING`
   - If a record with the same ID exists, it will be skipped
   - Existing records in the new database are preserved
   - Only new records are imported

2. **Ticker Cache**: Uses `ON CONFLICT (ticker, date) DO UPDATE`
   - If a ticker+date combination exists, it merges the data:
     - Adds order counts together
     - Keeps the latest `last_order_time`
   - This ensures cache data is properly combined

### What Gets Skipped?

Records are skipped when:
- An alert/order with the same ID already exists in the new database
- A ticker cache entry for the same ticker+date exists (but gets merged)

## Data Backup

All exported data is automatically backed up to JSON files in:
```
data/migration-backup/
├── alerts-[timestamp].json
├── placed_orders-[timestamp].json
└── ticker_cache-[timestamp].json
```

These backups can be used for:
- Manual verification
- Recovery if needed
- Audit trail

## Post-Migration Steps

### 1. Verify the Migration

Check the summary output to ensure all expected records were migrated.

### 2. Test the Application

```bash
# Test database connection
npm run test:db

# Test database integration
npm run db:test
```

### 3. Update Application

Your application should now automatically use the new database since `DATABASE_URL` in `.env.local` points to it.

### 4. Clean Up

Once you've verified everything works:

1. **Remove OLD_DATABASE_URL** from `.env.local` (if you added it)
2. **Keep the backups** in `data/migration-backup/` for a while
3. **Optional**: Archive or decommission the old database

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to old/new database

**Solutions**:
- Verify the connection strings are correct
- Check if databases are accessible from your network
- Ensure SSL settings are correct
- Check firewall rules

### Schema Mismatch

**Problem**: Tables already exist with different structure

**Solutions**:
- The script uses `CREATE TABLE IF NOT EXISTS`, so it won't overwrite existing tables
- If schema differs, you may need to manually adjust the new database schema
- Check the `src/lib/database.ts` file for the expected schema

### Partial Migration

**Problem**: Some records failed to import

**Solutions**:
- Check the console output for specific errors
- Review the backup JSON files to see what data was exported
- You can manually import failed records using the backup files
- Common causes:
  - Data type mismatches
  - Constraint violations
  - Missing referenced records

### Performance Issues

**Problem**: Migration is taking too long

**Solutions**:
- The script processes records one by one for safety
- For very large datasets (>10,000 records), consider:
  - Using PostgreSQL's native `pg_dump` and `pg_restore`
  - Running the migration during off-peak hours
  - Temporarily disabling indexes and recreating them after

## Advanced: Manual Migration

If you prefer to use PostgreSQL's native tools:

### Export from Old Database

```bash
pg_dump -h old_host -U old_user -d old_database -t alerts -t placed_orders -t ticker_cache --data-only --column-inserts > migration.sql
```

### Import to New Database

```bash
psql -h new_host -U new_user -d new_database < migration.sql
```

**Note**: This method doesn't handle conflicts automatically. You may need to manually resolve duplicates.

## Schema Reference

### Tables Migrated

1. **alerts**: Trading alerts from TradingView/ChartInk
2. **placed_orders**: Orders placed through Dhan API
3. **ticker_cache**: Cache to prevent duplicate orders

### Indexes Created

- `idx_alerts_timestamp`, `idx_alerts_ticker`, `idx_alerts_signal`, `idx_alerts_strategy`
- `idx_orders_timestamp`, `idx_orders_ticker`, `idx_orders_status`, `idx_orders_alert_id`
- `idx_ticker_cache_ticker_date`

## Safety Features

1. **Non-destructive**: Never deletes or modifies existing data in new database
2. **Automatic Backups**: All data is backed up before import
3. **Transaction Safety**: Each record is handled individually
4. **Verification**: Post-migration verification checks
5. **Detailed Logging**: Complete audit trail of the migration

## Support

If you encounter issues:

1. Check the backup files in `data/migration-backup/`
2. Review the console output for specific errors
3. Verify both database connection strings
4. Ensure you have proper permissions on both databases

## Rollback

If you need to rollback:

1. The new database retains all its original data
2. Use the backup JSON files to restore specific records if needed
3. The old database remains unchanged throughout the process
