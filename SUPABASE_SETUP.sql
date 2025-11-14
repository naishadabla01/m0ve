-- =====================================================
-- M0VE Database Setup - Foreign Keys & Optimal Schema
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- STEP 1: Clean up orphaned data before adding foreign keys
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

-- STEP 2: Add foreign keys (now that data is clean)

-- 1. Add foreign key from scores to profiles
-- This allows proper joins and ensures data integrity
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_user_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- 2. Add foreign key from scores to events
-- Ensures scores are linked to valid events
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_event_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;

-- 3. Add foreign key from event_participants to profiles
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_user_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- 4. Add foreign key from event_participants to events
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_event_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;

-- 5. Add cover_image_url column to events (if not exists)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scores_event_id ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(event_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at DESC);

-- 7. Verify the schema
-- Run this to see your scores table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scores'
ORDER BY ordinal_position;

-- Expected columns in scores table:
-- - event_id (uuid, foreign key to events)
-- - user_id (uuid, foreign key to profiles)
-- - score (integer or numeric)
-- - is_live (boolean)
-- - last_seen (timestamp)
-- - created_at (timestamp)
-- - updated_at (timestamp)
