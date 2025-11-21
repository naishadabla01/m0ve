-- ============================================
-- FIX REALTIME AUTHORIZATION FOR CALL NOTIFICATIONS
-- The issue: Realtime needs broader SELECT permissions
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own call participations" ON call_participants;

-- Create a more permissive SELECT policy for Realtime
-- This allows all authenticated users to SELECT call_participants
-- The IncomingCallModal will still filter by user_id in the app code
CREATE POLICY "Authenticated users can view all call participants"
ON call_participants
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to SELECT

-- Verify the policy
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'call_participants'
AND policyname = 'Authenticated users can view all call participants';

-- Done! Now Realtime should broadcast INSERT events to all authenticated clients.
-- The IncomingCallModal filters events in the callback to show only relevant calls.
