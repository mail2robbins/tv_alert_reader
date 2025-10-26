# PostgreSQL Database Migration - Complete Solution

## 📋 Overview

This solution provides a complete, safe, and automated way to migrate your PostgreSQL database from one instance to another, with special handling for cases where the target database may already contain data.

## 🎯 What You Get

### 1. **Migration Scripts**
- **`scripts/migrate-database.ts`**: Main migration script
- **`scripts/compare-databases.ts`**: Pre-migration comparison tool
- **`scripts/verify-migration.ts`**: Post-migration verification

### 2. **NPM Commands**
```bash
npm run db:compare    # Compare databases before migration
npm run db:migrate    # Execute the migration
npm run db:verify     # Verify migration success
```

### 3. **Documentation**
- **`MIGRATION_QUICK_START.md`**: Quick reference (4 simple steps)
- **`DATABASE_MIGRATION_GUIDE.md`**: Comprehensive guide with troubleshooting

## 🚀 Quick Start

### Step 1: Configure Environment

Add to your `.env.local`:
```env
DATABASE_URL=postgresql://new_user:new_pass@new_host:5432/new_db
OLD_DATABASE_URL=postgresql://old_user:old_pass@old_host:5432/old_db
```

### Step 2: Compare (Recommended)

```bash
npm run db:compare
```

This shows:
- Record counts in both databases
- Date ranges of data
- Potential ID conflicts
- Estimated migration impact

### Step 3: Migrate

```bash
npm run db:migrate
```

This will:
- ✅ Test both database connections
- ✅ Initialize schema in new database
- ✅ Export all data from old database
- ✅ Create JSON backups in `data/migration-backup/`
- ✅ Import data with conflict resolution
- ✅ Verify the migration

### Step 4: Verify

```bash
npm run db:verify
```

This checks:
- All tables exist
- Record counts
- Indexes are created
- Data integrity
- Sample recent data

## 🔒 Safety Features

### Non-Destructive Migration
- **Never deletes** existing data in the new database
- **Skips duplicates** instead of overwriting
- **Preserves** all existing records

### Automatic Backups
All exported data is saved to JSON files:
```
data/migration-backup/
├── alerts-[timestamp].json
├── placed_orders-[timestamp].json
└── ticker_cache-[timestamp].json
```

### Smart Conflict Resolution

| Table | Conflict Strategy |
|-------|------------------|
| **alerts** | Skip duplicates (by ID) |
| **placed_orders** | Skip duplicates (by ID) |
| **ticker_cache** | Merge data (combine counts, keep latest timestamp) |

### Transaction Safety
- Each record is handled individually
- Errors don't stop the entire migration
- Detailed logging of all operations

## 📊 What Gets Migrated

### Tables
1. **alerts**: Trading alerts from TradingView/ChartInk
2. **placed_orders**: Orders placed through Dhan API
3. **ticker_cache**: Cache to prevent duplicate orders

### Indexes
All performance indexes are recreated:
- Alert indexes (timestamp, ticker, signal, strategy)
- Order indexes (timestamp, ticker, status, alert_id)
- Cache indexes (ticker, date)

## 📈 Migration Process Flow

```
1. Test Connections
   ↓
2. Initialize Schema (new DB)
   ↓
3. Export Alerts (old DB)
   ↓
4. Backup Alerts (JSON)
   ↓
5. Import Alerts (new DB)
   ↓
6. Export Orders (old DB)
   ↓
7. Backup Orders (JSON)
   ↓
8. Import Orders (new DB)
   ↓
9. Export Cache (old DB)
   ↓
10. Backup Cache (JSON)
    ↓
11. Import Cache (new DB)
    ↓
12. Verify Migration
    ↓
13. Show Summary
```

## 🎯 Expected Output

### Compare Output
```
🔍 Comparing databases...

📊 Record Counts:
   alerts:
      Old DB: 150
      New DB: 50
      📈 New DB has 50 fewer records

📅 Data Date Ranges:
   alerts:
      Old DB: 2024-01-01 to 2024-10-26
      New DB: 2024-10-01 to 2024-10-26

🔍 Checking for ID conflicts:
   alerts:
      Conflicts: 45
      ⚠️  45 records will be skipped during migration

📈 Migration Estimate:
   Expected to migrate:
      Alerts: 105 new records (45 will be skipped)
```

### Migration Output
```
🔄 Starting database migration...

✅ Old database connection successful
✅ New database connection successful
✅ Schema initialized

📊 Migrating alerts table...
💾 Backup saved: data/migration-backup/alerts-2024-10-26.json
✅ Alerts: 150 exported, 105 imported, 45 skipped

📦 Migrating placed_orders table...
💾 Backup saved: data/migration-backup/placed_orders-2024-10-26.json
✅ Orders: 200 exported, 180 imported, 20 skipped

✅ Migration completed successfully!

📊 Summary:
   Alerts: 105/150 migrated
   Orders: 180/200 migrated
```

### Verify Output
```
🔍 Verifying database migration...

✅ Database connection successful

📊 Checking tables...
✅ All required tables exist:
   - alerts
   - placed_orders
   - ticker_cache

📈 Record counts:
   Alerts: 155
   Orders: 200
   Ticker Cache: 50

🔍 Checking indexes...
✅ Found 9 indexes

🔐 Data integrity checks:
   ✅ All orders have corresponding alerts
   ✅ No duplicate alert IDs
   ✅ No duplicate order IDs

✅ Migration verification completed!
```

## 🛠️ Troubleshooting

### Connection Issues
**Problem**: Cannot connect to database

**Solutions**:
- Verify connection strings in `.env.local`
- Check network accessibility
- Ensure SSL settings are correct
- Verify credentials

### Records Skipped
**Problem**: Many records were skipped

**Explanation**: This is normal! Records are skipped when:
- They already exist in the new database (duplicate IDs)
- This prevents data loss and maintains integrity

**Action**: Check the backup JSON files to see what was exported

### Partial Migration
**Problem**: Migration stopped midway

**Solutions**:
- Check console output for specific errors
- Review backup files to see what was exported
- Re-run the migration (it's safe - won't duplicate data)
- Check database logs for detailed errors

## 📝 Post-Migration Checklist

- [ ] Review migration summary output
- [ ] Run `npm run db:verify`
- [ ] Test application: `npm run test:db`
- [ ] Verify critical data in new database
- [ ] Test application functionality
- [ ] Remove `OLD_DATABASE_URL` from `.env.local`
- [ ] Keep backups in `data/migration-backup/`
- [ ] Update application to use new database
- [ ] Monitor application for any issues

## 🔄 Rollback Plan

If you need to rollback:

1. **New database** retains all its original data
2. **Old database** remains completely unchanged
3. **Backup files** can be used to restore specific records
4. Simply change `DATABASE_URL` back to old database in `.env.local`

## 💡 Tips

### Before Migration
- Run `npm run db:compare` to understand what will happen
- Ensure both databases are accessible
- Have enough disk space for backups
- Consider doing a test run first

### During Migration
- Don't interrupt the process
- Monitor the console output
- Note any errors or warnings

### After Migration
- Keep backups for at least a week
- Monitor application logs
- Verify critical functionality
- Test with real user workflows

## 📚 Additional Resources

- **Quick Start**: See `MIGRATION_QUICK_START.md`
- **Full Guide**: See `DATABASE_MIGRATION_GUIDE.md`
- **Database Setup**: See `DATABASE_SETUP.md`

## 🆘 Support

If you encounter issues:

1. Check the backup files in `data/migration-backup/`
2. Review console output for specific errors
3. Run `npm run db:verify` to check current state
4. Consult `DATABASE_MIGRATION_GUIDE.md` for detailed troubleshooting

## ✅ Success Criteria

Migration is successful when:
- ✅ All expected records are in the new database
- ✅ `npm run db:verify` passes all checks
- ✅ Application connects to new database
- ✅ Application functionality works correctly
- ✅ No data loss occurred

---

**Remember**: This migration is designed to be safe and non-destructive. You can run it multiple times if needed, and your data is always backed up.
