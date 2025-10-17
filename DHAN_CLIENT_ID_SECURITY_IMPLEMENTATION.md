# DHAN_CLIENT_ID Security Implementation

## Overview

This implementation adds an additional layer of security to the Manual Order Placement feature by associating each user with a specific DHAN_CLIENT_ID. This prevents users from placing orders on accounts that don't belong to them.

## Key Features

### 1. Database Schema Changes

- Added `dhan_client_id` column to the `users` table
- Column is `VARCHAR(50) UNIQUE` to ensure each DHAN client ID is assigned to only one user
- Added index for faster lookups: `idx_users_dhan_client_id`

### 2. User Registration and Approval Flow

- New users are created with `dhan_client_id = NULL`
- Administrator must manually assign a DHAN_CLIENT_ID during the approval process
- Users cannot access Manual Order Placement without a valid DHAN_CLIENT_ID

### 3. Manual Order Placement Security

- Only accounts matching the logged-in user's DHAN_CLIENT_ID are displayed
- Users cannot see or select accounts belonging to other users
- Clear error messages when no matching accounts are found

### 4. Manual Database Management

- DHAN_CLIENT_ID assignment is handled manually via direct database updates
- Administrators update the `users.dhan_client_id` column directly in the database
- User approval process remains the same (manual database updates)

## Database Migration

### For New Installations
Run the main schema creation script:
```bash
psql -d your_database -f scripts/create-users-table.sql
```

### For Existing Installations
Run the migration script to add the new column:
```bash
psql -d your_database -f scripts/add-dhan-client-id-migration.sql
```

## Database Management

### Manual DHAN_CLIENT_ID Assignment
Administrators can directly update the database to assign DHAN_CLIENT_ID values:

```sql
-- Assign DHAN_CLIENT_ID to a user
UPDATE users SET dhan_client_id = 'CLIENT_001' WHERE username = 'user1';

-- Approve a user
UPDATE users SET is_approved = true WHERE username = 'user1';

-- View pending approvals
SELECT id, username, email, full_name, dhan_client_id, is_approved, created_at 
FROM users 
WHERE is_approved = false AND is_active = true;
```

## User Interface Changes

### Main Dashboard
- Regular users see their DHAN_CLIENT_ID status in the welcome message
- No admin panel interface (manual database management)

### Manual Order Placement
- Only shows accounts matching the user's DHAN_CLIENT_ID
- Clear error messages for users without assigned DHAN_CLIENT_ID
- Updated description explaining the security feature

## Security Benefits

1. **Account Isolation**: Users can only access their own trading accounts
2. **Prevents Cross-Account Trading**: Eliminates risk of placing orders on wrong accounts
3. **Administrative Control**: Only admins can assign DHAN_CLIENT_ID values
4. **Audit Trail**: All DHAN_CLIENT_ID changes are logged in the audit system

## User Workflow

### For New Users:
1. Register with username, email, password, and full name
2. Account created with `is_approved = false` and `dhan_client_id = NULL`
3. Admin assigns DHAN_CLIENT_ID and approves the account
4. User can now access Manual Order Placement with their assigned accounts

### For Administrators:
1. Check database for pending user approvals
2. Assign appropriate DHAN_CLIENT_ID to each user via SQL
3. Approve users by setting `is_approved = true`

## Testing

Run the test script to verify the implementation:
```bash
node scripts/test-dhan-client-id-security.js
```

The test covers:
- User creation with null DHAN_CLIENT_ID
- DHAN_CLIENT_ID assignment and updates
- User lookup by DHAN_CLIENT_ID
- Uniqueness constraint validation
- User approval process

## Configuration

Ensure your environment variables include the DHAN_CLIENT_ID values for each account:
```env
DHAN_CLIENT_ID_1=CLIENT_001
DHAN_CLIENT_ID_2=CLIENT_002
# ... etc
```

The Manual Order Placement will filter accounts based on these values matching the user's assigned DHAN_CLIENT_ID.

## Error Handling

- Users without DHAN_CLIENT_ID see clear error messages
- Users with DHAN_CLIENT_ID but no matching accounts get specific error messages
- Database constraint violations are handled gracefully
- All errors are logged for debugging

## Future Enhancements

Potential improvements for the future:
- DHAN_CLIENT_ID validation against actual DHAN accounts
- User role-based access control
- Account transfer functionality between users
- Automated user approval workflow



#use the npm command to push the DB schema changes
```bash
npm run db:migrate:dhan
```
