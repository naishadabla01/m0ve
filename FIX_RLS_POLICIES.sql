-- ============================================
-- FIX RLS POLICIES FOR CALL NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop all existing policies on call_participants
DROP POLICY IF EXISTS "Users can view their own call invitations" ON call_participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON call_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON call_participants;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON call_participants;

-- 2. Re-enable RLS
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- 3. Create new permissive policies

-- Allow users to SELECT their own call participant records
-- This is CRITICAL for Realtime to work!
CREATE POLICY "Users can view their own call participations"
ON call_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to INSERT (for backend API)
-- This allows the start call API to add participants
CREATE POLICY "Service role can insert call participants"
ON call_participants
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow users to UPDATE their own records (for joining/leaving)
CREATE POLICY "Users can update their own participation"
ON call_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own records (for leaving calls)
CREATE POLICY "Users can delete their own participation"
ON call_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Verify policies were created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'call_participants'
ORDER BY policyname;

-- Done! Now test by placing a call from the dashboard.
-- You should receive the notification with RLS enabled.
