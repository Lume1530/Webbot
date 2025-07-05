-- Migration to add post date feature to campaigns and reels tables
-- Run this SQL in your database to enable the new feature

-- Add min_post_date column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_post_date DATE;

-- Add post_date column to reels table
ALTER TABLE reels ADD COLUMN IF NOT EXISTS post_date TIMESTAMP;

-- Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_reels_post_date ON reels(post_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_min_post_date ON campaigns(min_post_date);

-- Update existing campaigns to have no date restriction (optional)
-- UPDATE campaigns SET min_post_date = NULL WHERE min_post_date IS NULL; 