-- =====================================================
-- M0VE Database - FINAL CLEANUP & SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- ========================================
-- STEP 1: Merge Duplicate Data Before Deletion
-- ========================================

-- Merge 'code' into 'short_code' (keep short_code)
UPDATE events
SET short_code = COALESCE(short_code, code)
WHERE short_code IS NULL AND code IS NOT NULL;

-- Merge 'cover_url' into 'cover_image_url' (keep cover_image_url)
UPDATE events
SET cover_image_url = COALESCE(cover_image_url, cover_url)
WHERE cover_image_url IS NULL AND cover_url IS NOT NULL;

-- Merge 'venue' into 'location' (keep location)
UPDATE events
SET location = COALESCE(location, venue)
WHERE location IS NULL AND venue IS NOT NULL;

-- ========================================
-- STEP 2: Remove Duplicate Columns
-- ========================================

ALTER TABLE events DROP COLUMN IF EXISTS code;
ALTER TABLE events DROP COLUMN IF EXISTS cover_url;
ALTER TABLE events DROP COLUMN IF EXISTS venue;

-- ========================================
-- STEP 3: Clean Up Orphaned Data
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
-- STEP 4: Add Foreign Keys
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
-- STEP 6: Verify Everything Works
-- ========================================

-- Test foreign key relationship (should return data with user names)
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

-- Verify duplicate columns are removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('code', 'cover_url', 'venue');
-- Should return 0 rows

-- Verify we kept the right columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('short_code', 'cover_image_url', 'location')
ORDER BY column_name;
-- Should return exactly 3 rows

-- ========================================
-- SUCCESS! Your database is now optimized
-- ========================================
