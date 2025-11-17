-- ============================================
-- DIAGNOSE RLS FOR REALTIME
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check all RLS policies on call_participants
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'call_participants';

-- 2. Check if RLS is enabled
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'call_participants';

-- 3. Test if the authenticated user can SELECT their own row
-- Replace with your actual user_id and call_session_id
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO '8ae59bec-9027-4558-bc13-929d3e4ec09d';

SELECT * FROM call_participants
WHERE user_id = '8ae59bec-9027-4558-bc13-929d3e4ec09d'
LIMIT 5;

-- Reset role
RESET ROLE;

-- 4. TEMPORARY FIX: Disable RLS to test if that's the issue
-- WARNING: This makes the table publicly readable! Only for testing!
ALTER TABLE call_participants DISABLE ROW LEVEL SECURITY;

-- After testing, RE-ENABLE RLS:
-- ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
