-- Run this script to set up the database for the Campaign Management System
-- Make sure you're connected to your PostgreSQL database

\i migrations.sql

-- Verify tables were created
\dt

-- Check if campaigns table has data
SELECT COUNT(*) as campaign_count FROM campaigns;

-- Check if reels table has campaign_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reels' AND column_name = 'campaign_id';

-- Check if notifications table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'notifications'
) as notifications_table_exists;

-- Check if instagram_accounts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'instagram_accounts'
) as instagram_accounts_table_exists;

-- Add is_dummy column to reels table
ALTER TABLE reels ADD COLUMN IF NOT EXISTS is_dummy BOOLEAN DEFAULT FALSE; 