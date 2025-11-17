-- ============================================
-- FINAL COMPLETE FIX FOR REALTIME CALL NOTIFICATIONS
-- This script will configure everything from scratch
-- ============================================

-- STEP 1: Clean up all existing policies on call_participants
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'call_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON call_participants', pol.policyname);
    END LOOP;
END $$;

-- STEP 2: Enable RLS
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create simple, permissive policies
-- Allow ALL authenticated users to SELECT (required for Realtime to work)
CREATE POLICY "realtime_select_policy"
ON call_participants
FOR SELECT
TO authenticated, anon
USING (true);

-- Allow service role to INSERT (for backend API)
CREATE POLICY "service_insert_policy"
ON call_participants
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to INSERT their own records
CREATE POLICY "user_insert_policy"
ON call_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own records
CREATE POLICY "user_update_policy"
ON call_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to DELETE their own records
CREATE POLICY "user_delete_policy"
ON call_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 4: Verify call_participants is in the Realtime publication
DO $$
BEGIN
    -- Remove if exists
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE call_participants';
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;

    -- Add fresh
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE call_participants';
END $$;

-- STEP 5: Verify setup
SELECT
    'RLS Enabled' as check_type,
    tablename,
    rowsecurity as enabled
FROM pg_tables
WHERE tablename = 'call_participants'

UNION ALL

SELECT
    'Realtime Publication' as check_type,
    tablename,
    'true' as enabled
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'call_participants'

UNION ALL

SELECT
    'RLS Policies' as check_type,
    policyname as tablename,
    cmd as enabled
FROM pg_policies
WHERE tablename = 'call_participants'
ORDER BY check_type, tablename;

-- Done! Realtime should now work.
