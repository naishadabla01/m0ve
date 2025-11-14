# Supabase Database Setup - Step by Step Guide

Follow these steps **in order** in your Supabase SQL Editor.

---

## STEP 1: Check Your Current Schema

Run this query first to see what columns you have in each table:

```sql
-- Check events table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Check scores table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scores'
ORDER BY ordinal_position;

-- Check profiles table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**COPY THE RESULTS** and send them to me. I'll create custom queries based on your exact schema.

---

## STEP 2: Clean Up Orphaned Data (Run after I create custom queries)

This will remove any scores/participants that reference deleted users or events.

```sql
-- Remove scores for users that don't exist
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
```

---

## STEP 3: Add Missing Columns (If needed)

```sql
-- Add cover_image_url to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add location to events table (if it doesn't exist)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS location TEXT;
```

---

## STEP 4: Remove Duplicate/Unused Columns (Custom - need your schema)

**I'll create this after you send me your events table schema.**

Example (don't run this yet):
```sql
-- Remove duplicate columns (example)
ALTER TABLE events DROP COLUMN IF EXISTS venue;
ALTER TABLE events DROP COLUMN IF EXISTS duplicate_column_name;
```

---

## STEP 5: Add Foreign Keys

```sql
-- Add foreign key from scores to profiles
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_user_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key from scores to events
ALTER TABLE scores
DROP CONSTRAINT IF EXISTS fk_scores_event_id;

ALTER TABLE scores
ADD CONSTRAINT fk_scores_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;

-- Add foreign key from event_participants to profiles
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_user_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_user_id
FOREIGN KEY (user_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key from event_participants to events
ALTER TABLE event_participants
DROP CONSTRAINT IF EXISTS fk_event_participants_event_id;

ALTER TABLE event_participants
ADD CONSTRAINT fk_event_participants_event_id
FOREIGN KEY (event_id)
REFERENCES events(event_id)
ON DELETE CASCADE;
```

---

## STEP 6: Add Performance Indexes

```sql
-- Indexes for scores table
CREATE INDEX IF NOT EXISTS idx_scores_event_id ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(event_id, score DESC);

-- Indexes for event_participants table
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at DESC);
```

---

## STEP 7: Verify Everything Works

```sql
-- Test the foreign key relationship
SELECT
    s.user_id,
    s.score,
    p.display_name,
    p.first_name,
    p.last_name
FROM scores s
INNER JOIN profiles p ON s.user_id = p.user_id
LIMIT 5;

-- Check if cover_image_url was added
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'cover_image_url';
```

---

## What to Send Me Next:

1. **Run STEP 1 queries** in Supabase SQL Editor
2. **Copy and paste** the results showing your events table columns
3. Tell me which columns are duplicates or unused
4. I'll create a custom cleanup script for your specific schema

**Example of what to send:**
```
events table columns:
- event_id (uuid)
- artist_id (uuid)
- name (text)
- title (text) <- duplicate of name?
- venue (text) <- we use location instead
- location (text)
- start_at (timestamp)
- end_at (timestamp)
...etc
```
