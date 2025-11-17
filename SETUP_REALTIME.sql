-- ============================================
-- REALTIME SETUP FOR CALL NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if call_participants is in the realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'call_participants';

-- Expected: Should return 1 row with call_participants
-- If empty, the table is NOT published for realtime

-- 2. Add call_participants to realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- 3. Verify it was added
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'call_participants';

-- 4. Check RLS policies on call_participants
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'call_participants';

-- 5. Enable RLS on call_participants (if not already enabled)
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- 6. Create a policy to allow users to SELECT their own call_participants records
-- (This allows Realtime to work for authenticated users)
DROP POLICY IF EXISTS "Users can view their own call invitations" ON call_participants;
CREATE POLICY "Users can view their own call invitations"
ON call_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 7. Verify the policy was created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'call_participants'
AND policyname = 'Users can view their own call invitations';

-- 8. Check call_sessions table is also in realtime (optional but recommended)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'call_sessions';

-- 9. Add call_sessions to realtime if needed
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- Done! Now test with this query:
-- INSERT INTO call_participants (call_session_id, user_id, is_invited)
-- VALUES ('9108387b-0d1e-4ebf-a119-d9966f8f4600', '8ae59bec-9027-4558-bc13-929d3e4ec09d', true);
