# Database Migration - Quick Start

## TL;DR - 4 Simple Steps

### 1. Add Old Database URL to `.env.local`

```env
# Your new database (already there)
DATABASE_URL=postgresql://new_user:new_pass@new_host:5432/new_db

# Add this temporarily
OLD_DATABASE_URL=postgresql://old_user:old_pass@old_host:5432/old_db
```

### 2. Compare Databases (Optional but Recommended)

```bash
npm run db:compare
```

This shows you what will be migrated and identifies any conflicts.

### 3. Run Migration

```bash
npm run db:migrate
```

### 4. Verify Migration

```bash
npm run db:verify
```

---

## What Happens During Migration?

✅ **Schema Creation**: Creates tables and indexes in new database (if not exists)  
✅ **Data Export**: Exports all data from old database  
✅ **Backup**: Saves JSON backups to `data/migration-backup/`  
✅ **Smart Import**: Imports data, skipping duplicates  
✅ **Verification**: Checks everything migrated correctly

---

## Handling Existing Data

The migration is **non-destructive**:

- **Alerts & Orders**: Skips records with duplicate IDs
- **Ticker Cache**: Merges data (combines counts, keeps latest timestamp)
- **Existing data in new DB**: Preserved and untouched

---

## Alternative: Without Modifying .env.local

**PowerShell:**
```powershell
$env:OLD_DATABASE_URL="postgresql://old_user:old_pass@old_host:5432/old_db"
npm run db:migrate
```

**Bash:**
```bash
OLD_DATABASE_URL="postgresql://old_user:old_pass@old_host:5432/old_db" npm run db:migrate
```

---

## After Migration

1. ✅ Check the summary output
2. ✅ Run `npm run db:verify` to verify
3. ✅ Test your app: `npm run test:db`
4. ✅ Remove `OLD_DATABASE_URL` from `.env.local`
5. ✅ Keep backups in `data/migration-backup/` for safety

---

## Troubleshooting

**Connection failed?**
- Check your database URLs are correct
- Ensure databases are accessible
- Verify credentials

**Some records skipped?**
- Normal! These are duplicates already in the new database
- Check the summary to see how many were imported vs skipped

**Need more details?**
- See full guide: `DATABASE_MIGRATION_GUIDE.md`

---

## Available Commands

```bash
npm run db:compare    # Compare old and new databases (before migration)
npm run db:migrate    # Run the migration
npm run db:verify     # Verify migration results (after migration)
npm run db:init       # Initialize schema only
npm run db:test       # Test database integration
npm run test:db       # Test database connection
```

---

## Safety Features

🔒 **Non-destructive**: Never deletes existing data  
💾 **Auto-backup**: All data backed up before import  
🔍 **Verification**: Post-migration checks  
📊 **Detailed logs**: Complete audit trail  
⚡ **Conflict handling**: Smart duplicate resolution
