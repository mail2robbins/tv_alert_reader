# Database Migration - Visual Guide

## 🎯 Migration Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BEFORE YOU START                              │
├─────────────────────────────────────────────────────────────────┤
│  1. You have: NEW database URL in .env.local                    │
│  2. You need: OLD database URL                                  │
│  3. Goal: Migrate all data from OLD → NEW                       │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: CONFIGURE                             │
├─────────────────────────────────────────────────────────────────┤
│  Add to .env.local:                                             │
│                                                                  │
│  DATABASE_URL=postgresql://new_user:pass@new_host:5432/new_db   │
│  OLD_DATABASE_URL=postgresql://old_user:pass@old_host:5432/old  │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: COMPARE (Optional)                          │
├─────────────────────────────────────────────────────────────────┤
│  Command: npm run db:compare                                    │
│                                                                  │
│  Shows:                                                          │
│  ✓ Record counts in both databases                              │
│  ✓ Date ranges of data                                          │
│  ✓ Potential ID conflicts                                       │
│  ✓ Estimated migration impact                                   │
│                                                                  │
│  Example Output:                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │ alerts:                                           │          │
│  │   Old DB: 150 records                            │          │
│  │   New DB: 50 records                             │          │
│  │   Conflicts: 45 (will be skipped)                │          │
│  │   Will migrate: 105 new records                  │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                  STEP 3: MIGRATE                                 │
├─────────────────────────────────────────────────────────────────┤
│  Command: npm run db:migrate                                    │
│                                                                  │
│  Process:                                                        │
│                                                                  │
│  OLD DATABASE              MIGRATION              NEW DATABASE   │
│  ┌──────────┐            ┌─────────┐            ┌──────────┐   │
│  │          │            │         │            │          │   │
│  │ alerts   │───Export──→│ Backup  │───Import──→│ alerts   │   │
│  │   150    │            │  JSON   │  (skip 45) │   155    │   │
│  │          │            │         │            │ (50+105) │   │
│  └──────────┘            └─────────┘            └──────────┘   │
│                               ↓                                  │
│                    data/migration-backup/                        │
│                    alerts-[timestamp].json                       │
│                                                                  │
│  Progress Output:                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │ 📊 Migrating alerts table...                     │          │
│  │ 💾 Backup saved: alerts-2024-10-26.json          │          │
│  │ ✅ Alerts: 150 exported, 105 imported, 45 skipped│          │
│  │                                                   │          │
│  │ 📦 Migrating placed_orders table...              │          │
│  │ 💾 Backup saved: placed_orders-2024-10-26.json   │          │
│  │ ✅ Orders: 200 exported, 180 imported, 20 skipped│          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                  STEP 4: VERIFY                                  │
├─────────────────────────────────────────────────────────────────┤
│  Command: npm run db:verify                                     │
│                                                                  │
│  Checks:                                                         │
│  ✓ All tables exist                                             │
│  ✓ Record counts correct                                        │
│  ✓ Indexes created                                              │
│  ✓ Data integrity                                               │
│  ✓ No duplicates                                                │
│                                                                  │
│  Example Output:                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │ ✅ All required tables exist                     │          │
│  │ 📈 Record counts:                                │          │
│  │    Alerts: 155                                   │          │
│  │    Orders: 200                                   │          │
│  │    Cache: 50                                     │          │
│  │ 🔍 Found 9 indexes                               │          │
│  │ 🔐 Data integrity checks:                        │          │
│  │    ✅ All orders have corresponding alerts       │          │
│  │    ✅ No duplicate IDs                           │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                      SUCCESS!                                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Migration completed                                          │
│  ✅ All data safely migrated                                     │
│  ✅ Backups created                                              │
│  ✅ Application ready to use new database                        │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
OLD DATABASE                    NEW DATABASE
┌─────────────┐                ┌─────────────┐
│             │                │             │
│  alerts     │                │  alerts     │
│  (150)      │                │  (50)       │
│             │                │             │
└─────────────┘                └─────────────┘
      │                              ↑
      │ Export                       │ Import
      │ (150 records)                │ (105 new)
      ↓                              │
┌─────────────────────────────────────────────┐
│         MIGRATION PROCESS                   │
├─────────────────────────────────────────────┤
│  1. Export: 150 records                     │
│  2. Backup: Save to JSON                    │
│  3. Check: 45 already exist in new DB       │
│  4. Import: 105 new records                 │
│  5. Skip: 45 duplicates                     │
└─────────────────────────────────────────────┘
      │
      ↓
┌─────────────────────────────────────────────┐
│     data/migration-backup/                  │
│     alerts-2024-10-26.json                  │
│     (All 150 records backed up)             │
└─────────────────────────────────────────────┘

RESULT:
New Database now has: 50 (original) + 105 (migrated) = 155 total
```

## 🔄 Conflict Resolution

```
┌────────────────────────────────────────────────────────────┐
│                  HOW DUPLICATES ARE HANDLED                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ALERTS & ORDERS:                                          │
│  ┌──────────────────────────────────────────────┐         │
│  │ Old DB Record:  ID = "abc123"                │         │
│  │                 ↓                             │         │
│  │ Check New DB:   ID "abc123" exists?          │         │
│  │                 ↓                             │         │
│  │ YES → SKIP (preserve existing)               │         │
│  │ NO  → IMPORT (add new record)                │         │
│  └──────────────────────────────────────────────┘         │
│                                                             │
│  TICKER CACHE:                                             │
│  ┌──────────────────────────────────────────────┐         │
│  │ Old DB: AAPL, 2024-10-26, count=3            │         │
│  │         ↓                                     │         │
│  │ New DB: AAPL, 2024-10-26, count=2            │         │
│  │         ↓                                     │         │
│  │ MERGE:  AAPL, 2024-10-26, count=5 (2+3)      │         │
│  │         Keep latest timestamp                 │         │
│  └──────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────┘
```

## 🛡️ Safety Features

```
┌─────────────────────────────────────────────────────────────┐
│                    SAFETY GUARANTEES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ NON-DESTRUCTIVE                                          │
│    ┌────────────────────────────────────────────┐          │
│    │ Old Database: UNCHANGED                    │          │
│    │ New Database: ONLY ADDITIONS, NO DELETIONS │          │
│    └────────────────────────────────────────────┘          │
│                                                              │
│  ✓ AUTOMATIC BACKUPS                                        │
│    ┌────────────────────────────────────────────┐          │
│    │ All exported data → JSON files             │          │
│    │ Saved before any import                    │          │
│    │ Can be used for recovery                   │          │
│    └────────────────────────────────────────────┘          │
│                                                              │
│  ✓ TRANSACTION SAFETY                                       │
│    ┌────────────────────────────────────────────┐          │
│    │ Each record processed individually         │          │
│    │ One failure doesn't stop migration         │          │
│    │ Detailed error logging                     │          │
│    └────────────────────────────────────────────┘          │
│                                                              │
│  ✓ RE-RUNNABLE                                              │
│    ┌────────────────────────────────────────────┐          │
│    │ Safe to run multiple times                 │          │
│    │ Won't create duplicates                    │          │
│    │ Only imports new records                   │          │
│    └────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure After Migration

```
tv_alert_reader/
├── .env.local                          (Your config)
│   ├── DATABASE_URL=...                (New DB - used by app)
│   └── OLD_DATABASE_URL=...            (Old DB - for migration)
│
├── data/
│   └── migration-backup/               (Created during migration)
│       ├── alerts-2024-10-26.json      (Backup of alerts)
│       ├── placed_orders-2024-10-26.json
│       └── ticker_cache-2024-10-26.json
│
├── scripts/
│   ├── migrate-database.ts             (Main migration script)
│   ├── compare-databases.ts            (Compare tool)
│   └── verify-migration.ts             (Verification tool)
│
└── Documentation/
    ├── MIGRATION_QUICK_START.md        (Quick reference)
    ├── DATABASE_MIGRATION_GUIDE.md     (Full guide)
    ├── README_MIGRATION.md             (Overview)
    ├── MIGRATION_SUMMARY.txt           (Text summary)
    └── MIGRATION_VISUAL_GUIDE.md       (This file)
```

## 🎯 Quick Command Reference

```
┌──────────────────────────────────────────────────────────────┐
│  COMMAND                 │  WHEN TO USE                      │
├──────────────────────────────────────────────────────────────┤
│  npm run db:compare      │  Before migration (optional)      │
│                          │  Shows what will be migrated      │
├──────────────────────────────────────────────────────────────┤
│  npm run db:migrate      │  To perform the migration         │
│                          │  Main migration command           │
├──────────────────────────────────────────────────────────────┤
│  npm run db:verify       │  After migration                  │
│                          │  Verify everything worked         │
├──────────────────────────────────────────────────────────────┤
│  npm run db:init         │  Initialize schema only           │
│                          │  (without migrating data)         │
├──────────────────────────────────────────────────────────────┤
│  npm run db:test         │  Test database integration        │
│                          │  Verify app can use database      │
└──────────────────────────────────────────────────────────────┘
```

## ✅ Success Checklist

```
Before Migration:
□ New DATABASE_URL configured in .env.local
□ OLD_DATABASE_URL added to .env.local
□ Both databases accessible
□ Ran npm run db:compare (optional)

During Migration:
□ Ran npm run db:migrate
□ Monitored console output
□ Noted any warnings or errors
□ Checked summary output

After Migration:
□ Ran npm run db:verify
□ All checks passed
□ Tested application (npm run test:db)
□ Verified critical data
□ Removed OLD_DATABASE_URL from .env.local
□ Kept backups in data/migration-backup/

Application Ready:
□ App connects to new database
□ All features work correctly
□ No data loss
□ Performance is good
```

---

**Need Help?** See the full documentation:
- Quick Start: `MIGRATION_QUICK_START.md`
- Full Guide: `DATABASE_MIGRATION_GUIDE.md`
- Overview: `README_MIGRATION.md`
