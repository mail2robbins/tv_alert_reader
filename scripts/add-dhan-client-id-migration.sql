-- Migration script to add DHAN_CLIENT_ID column to existing users table
-- Run this script if you have an existing database

-- Add the dhan_client_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'dhan_client_id'
    ) THEN
        ALTER TABLE users ADD COLUMN dhan_client_id VARCHAR(50) UNIQUE;
        
        -- Add index for the new column
        CREATE INDEX IF NOT EXISTS idx_users_dhan_client_id ON users(dhan_client_id);
        
        -- Add comment for documentation
        COMMENT ON COLUMN users.dhan_client_id IS 'DHAN client ID assigned by administrator during approval';
        
        RAISE NOTICE 'Successfully added dhan_client_id column to users table';
    ELSE
        RAISE NOTICE 'dhan_client_id column already exists in users table';
    END IF;
END $$;
