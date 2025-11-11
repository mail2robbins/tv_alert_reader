-- Migration script to add limit_buffer_percentage column to account_settings table
-- Run this script if you have an existing database

-- Add the limit_buffer_percentage column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_settings' AND column_name = 'limit_buffer_percentage'
    ) THEN
        ALTER TABLE account_settings ADD COLUMN limit_buffer_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.0;
        
        -- Add comment for documentation
        COMMENT ON COLUMN account_settings.limit_buffer_percentage IS 'Buffer percentage added to LIMIT order price. For BUY: price + buffer%, For SELL: price - buffer%. Default: 0.0%';
        
        RAISE NOTICE 'Successfully added limit_buffer_percentage column to account_settings table';
    ELSE
        RAISE NOTICE 'limit_buffer_percentage column already exists in account_settings table';
    END IF;
END $$;
