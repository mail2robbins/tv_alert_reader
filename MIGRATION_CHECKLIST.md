# Database Migration Checklist

## Pre-Migration

- [ ] **Backup current .env.local file**
  ```bash
  cp .env.local .env.local.backup
  ```

- [ ] **Verify new DATABASE_URL is in .env.local**
  - Open `.env.local`
  - Confirm `DATABASE_URL` points to new database

- [ ] **Add OLD_DATABASE_URL to .env.local**
  ```env
  OLD_DATABASE_URL=postgresql://old_user:old_pass@old_host:5432/old_db
  ```

- [ ] **Test both database connections**
  - New DB should be accessible
  - Old DB should be accessible
  - Check firewall/network settings if needed

- [ ] **Review what will be migrated (Optional)**
  ```bash
  npm run db:compare
  ```
  - Note record counts
  - Note expected conflicts
  - Understand what will be skipped

## Migration

- [ ] **Run the migration**
  ```bash
  npm run db:migrate
  ```

- [ ] **Monitor the output**
  - Watch for connection success messages
  - Note exported counts
  - Note imported vs skipped counts
  - Check for any errors

- [ ] **Verify backups were created**
  - Check `data/migration-backup/` folder exists
  - Verify JSON files are present:
    - `alerts-[timestamp].json`
    - `placed_orders-[timestamp].json`
    - `ticker_cache-[timestamp].json`

- [ ] **Review migration summary**
  - Alerts: ___ exported, ___ imported, ___ skipped
  - Orders: ___ exported, ___ imported, ___ skipped
  - Cache: ___ exported, ___ imported, ___ skipped

## Post-Migration Verification

- [ ] **Run verification script**
  ```bash
  npm run db:verify
  ```

- [ ] **Check verification results**
  - [ ] All tables exist
  - [ ] Record counts match expectations
  - [ ] All indexes created (should be 9)
  - [ ] No duplicate IDs
  - [ ] Data integrity checks pass

- [ ] **Test database connection**
  ```bash
  npm run test:db
  ```

- [ ] **Test database integration**
  ```bash
  npm run db:test
  ```

## Application Testing

- [ ] **Start the application**
  ```bash
  npm run dev
  ```

- [ ] **Test critical features**
  - [ ] Application starts without errors
  - [ ] Dashboard loads
  - [ ] Alerts are visible
  - [ ] Orders are visible
  - [ ] Filtering works
  - [ ] Date ranges work
  - [ ] Statistics are correct

- [ ] **Verify data accuracy**
  - [ ] Check a few specific alerts exist
  - [ ] Check recent orders are present
  - [ ] Verify date ranges are correct
  - [ ] Confirm no data is missing

## Cleanup

- [ ] **Remove OLD_DATABASE_URL from .env.local**
  - Open `.env.local`
  - Delete or comment out `OLD_DATABASE_URL` line
  - Save file

- [ ] **Keep backups safe**
  - [ ] Don't delete `data/migration-backup/` folder
  - [ ] Keep backups for at least 1 week
  - [ ] Consider archiving backups elsewhere

- [ ] **Document migration**
  - [ ] Note migration date: _______________
  - [ ] Note records migrated: _______________
  - [ ] Note any issues encountered: _______________

## Rollback Plan (If Needed)

If something goes wrong:

- [ ] **Change DATABASE_URL back to old database**
  ```env
  DATABASE_URL=postgresql://old_user:old_pass@old_host:5432/old_db
  ```

- [ ] **Restart application**
  ```bash
  npm run dev
  ```

- [ ] **Verify application works with old database**

- [ ] **Review migration logs and errors**

- [ ] **Fix issues and retry migration**

## Success Criteria

Migration is successful when ALL of these are true:

- [x] Migration completed without critical errors
- [x] Verification script passes all checks
- [x] Application connects to new database
- [x] All features work correctly
- [x] No data loss occurred
- [x] Backups are safely stored
- [x] OLD_DATABASE_URL removed from .env.local

## Notes

**Migration Date:** _______________

**Old Database Records:**
- Alerts: _______________
- Orders: _______________
- Cache: _______________

**New Database Records (After Migration):**
- Alerts: _______________
- Orders: _______________
- Cache: _______________

**Records Migrated:**
- Alerts: _______________
- Orders: _______________
- Cache: _______________

**Issues Encountered:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Resolution:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

## Quick Reference

**Compare databases:**
```bash
npm run db:compare
```

**Run migration:**
```bash
npm run db:migrate
```

**Verify migration:**
```bash
npm run db:verify
```

**Test connection:**
```bash
npm run test:db
```

**Backup location:**
```
data/migration-backup/
```

## Support

If you need help:
1. Check `DATABASE_MIGRATION_GUIDE.md` for troubleshooting
2. Review backup files in `data/migration-backup/`
3. Check console output for specific errors
4. Migration is safe to re-run if needed

---

**Remember:** The migration is non-destructive. Your old database remains unchanged, and you can always rollback if needed.
