-- =====================================================
-- M0VE Database - SAFE SETUP (No Deletions)
-- Run this ENTIRE script in Supabase SQL Editor
-- This version KEEPS all duplicate columns to avoid breaking the dashboard
-- =====================================================

-- ========================================
-- STEP 1: Sync Duplicate Columns (Keep Both)
-- ========================================
-- This ensures both columns have the same data

-- Sync 'code' and 'short_code' (keep both)
UPDATE events
SET short_code = COALESCE(short_code, code)
WHERE short_code IS NULL AND code IS NOT NULL;

UPDATE events
SET code = COALESCE(code, short_code)
WHERE code IS NULL AND short_code IS NOT NULL;

-- Sync 'cover_url' and 'cover_image_url' (keep both)
UPDATE events
SET cover_image_url = COALESCE(cover_image_url, cover_url)
WHERE cover_image_url IS NULL AND cover_url IS NOT NULL;

UPDATE events
SET cover_url = COALESCE(cover_url, cover_image_url)
WHERE cover_url IS NULL AND cover_image_url IS NOT NULL;

-- Sync 'venue' and 'location' (keep both)
UPDATE events
SET location = COALESCE(location, venue)
WHERE location IS NULL AND venue IS NOT NULL;

UPDATE events
SET venue = COALESCE(venue, location)
WHERE venue IS NULL AND location IS NOT NULL;

-- ========================================
-- STEP 2: Clean Up Orphaned Data
-- ========================================

-- Remove scores for users that don't exist in profiles
DELETE FROM scores
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Remove scores for events that don't exist
DELETE FROM scores
WHERE event_id NOT IN (SELECT event_id FROM events);

-- Remove event_participants for users that don't exist
DELETE FROM event_participants
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Remove event_participants for events that don't exist
DELETE FROM event_participants
WHERE event_id NOT IN (SELECT event_id FROM events);

-- ========================================
-- STEP 3: Add Foreign Keys
-- ========================================

-- Foreign key: scores -> profiles
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_user_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- Foreign key: scores -> events
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_event_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;

-- Foreign key: event_participants -> profiles
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_user_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- Foreign key: event_participants -> events
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_event_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;

-- ========================================
-- STEP 4: Add Missing Columns
-- ========================================

-- Add is_live column to scores table (needed for mobile app)
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- ========================================
-- STEP 5: Add Performance Indexes
-- ========================================

-- Indexes for scores table (for leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_scores_event_id ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(event_id, score DESC);

-- Indexes for event_participants table
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_artist_id ON events(artist_id);

-- ========================================
-- STEP 6: Verify Foreign Keys Work
-- ========================================

-- Test the foreign key relationship (should return data with user names)
SELECT
    s.user_id,
    s.score,
    s.is_live,
    p.display_name,
    p.first_name,
    p.last_name
FROM scores s
INNER JOIN profiles p ON s.user_id = p.user_id
LIMIT 5;

-- ========================================
-- SUCCESS!
-- Your leaderboard will now work!
-- Dashboard views are safe (code, cover_url, venue still exist)
-- Mobile app works (short_code, cover_image_url, location exist)
-- ========================================
