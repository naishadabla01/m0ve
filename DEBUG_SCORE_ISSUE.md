# Debug Score Discrepancy Issue

## Problem
- Mobile app shows: **75 points** for a user
- Dashboard shows: **7 points** for the same user in same event

## Investigation

### Step 1: Check what's in the database
Run this in Supabase SQL Editor:

```sql
-- Check raw scores in scores table
SELECT
  event_id,
  user_id,
  score,
  score / 100 as normalized_score
FROM scores
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with actual user ID
ORDER BY updated_at DESC
LIMIT 5;

-- Check materialized view
SELECT
  event_id,
  user_id,
  score,
  score / 100 as normalized_score,
  rank
FROM leaderboard_cache
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with actual user ID
LIMIT 5;
```

### Expected Results:
- **scores table**: Should have raw scores (e.g., 7500)
- **leaderboard_cache**: Should ALSO have raw scores (e.g., 7500)
- **Mobile app**: Should display 7500 ÷ 100 = 75 ✅
- **Dashboard**: Should display 7500 ÷ 100 = 75 ✅

### Step 2: Check if problem is in mobile or dashboard

**If database shows 7500:**
- Mobile showing 75 = correct normalization ✅
- Dashboard showing 7 = wrong (maybe normalizing twice? 7500 ÷ 100 = 75, then 75 ÷ 10 = 7.5 ≈ 7)

**If database shows 750:**
- Mobile showing 75 = correct (750 ÷ 10, but should be ÷100)
- Dashboard showing 7 = wrong (750 ÷ 100 = 7.5 ≈ 7)
- **Issue**: Something is only saving 1/10th of the score

**If database shows 75:**
- This means scores are being saved ALREADY NORMALIZED
- Mobile showing 75 = reading raw value (wrong - should normalize)
- Dashboard showing 7 = normalizing again (75 ÷ 10 = 7.5 ≈ 7)
- **Issue**: Backend is saving normalized scores instead of raw

## Most Likely Issue

The dashboard uses `Math.floor()` or rounds down somewhere, so:
- Raw score: 7500
- Mobile: 7500 ÷ 100 = 75 ✅
- Dashboard query gets: 7500
- Dashboard normalizes: 7500 ÷ 100 = 75
- But displays: 7 (somehow losing a digit)

**OR** the dashboard is reading from a different event/user.

## Fix Verification

Run this in Supabase:
```sql
-- Get the exact score for debugging
SELECT
  e.title as event_name,
  p.display_name as user_name,
  s.score as raw_score,
  s.score / 100.0 as normalized_score,
  lc.score as cache_score,
  lc.score / 100.0 as cache_normalized
FROM scores s
LEFT JOIN events e ON s.event_id = e.event_id
LEFT JOIN profiles p ON s.user_id = p.user_id
LEFT JOIN leaderboard_cache lc ON s.event_id = lc.event_id AND s.user_id = lc.user_id
WHERE s.score > 0
ORDER BY s.updated_at DESC
LIMIT 10;
```

This will show:
1. What's actually stored in scores table
2. What's in the materialized view
3. What the normalized values should be

## Possible Fixes

### If scores are saved already normalized (e.g., 75 instead of 7500):
**Problem**: Backend is dividing by 100 before saving
**Fix**: Remove normalization from backend, save raw scores

### If dashboard is normalizing twice:
**Problem**: Dashboard code has two divisions
**Fix**: Check dashboard code for double normalization

### If there's a type coercion issue:
**Problem**: Score "75" being read as "7.5" then rounded to "7"
**Fix**: Ensure score is always treated as integer

## Mobile App Score Calculation

Mobile app in `app/move.tsx`:
- Collects accelerometer samples at 25 Hz
- Sends batches every 3 seconds to backend
- Backend accumulates raw magnitude values
- Stores in `scores` table
- Mobile reads from `scores` table
- Normalizes for display: `normalizeScoreForDisplay(totalEnergy)` which divides by 100

## Dashboard Score Calculation

Dashboard in `src/app/leaderboard/LeaderboardClient.tsx`:
- Queries leaderboard (either cache or scores table)
- Gets raw score values
- Normalizes for display: `normalizeScoreForDisplay(effectiveScore(r))` which divides by 100

## Action Items

1. ✅ Run SQL queries above to check actual data
2. ✅ Verify mobile app is showing correct score from correct event
3. ✅ Verify dashboard is querying correct event/user
4. ✅ Check if there's a data type issue (integer vs float)
5. ✅ Ensure backend is saving RAW scores, not normalized ones
