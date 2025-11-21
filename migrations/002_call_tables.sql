-- Migration: Create call_sessions and call_participants tables
-- Purpose: Enable video calling feature with LiveKit
-- Date: 2025-11-16
-- Updated: 2025-11-16 to match dashboard schema

-- Create call_sessions table to track video calls
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  room_name text NOT NULL UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active', -- 'active', 'ended'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create call_participants table to track who joined calls
CREATE TABLE IF NOT EXISTS call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_invited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(call_session_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_event_id ON call_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_artist_id ON call_sessions(artist_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_room_name ON call_sessions(room_name);
CREATE INDEX IF NOT EXISTS idx_call_participants_call_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

-- Add RLS policies for call_sessions
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Artists can view and manage their own call sessions
CREATE POLICY "Users can view call sessions they host or participate in"
ON call_sessions FOR SELECT
USING (
  auth.uid() = artist_id
  OR
  EXISTS (
    SELECT 1 FROM call_participants
    WHERE call_participants.call_session_id = call_sessions.id
    AND call_participants.user_id = auth.uid()
  )
);

-- Artists can create call sessions for their events
CREATE POLICY "Artists can create call sessions for their events"
ON call_sessions FOR INSERT
WITH CHECK (
  auth.uid() = artist_id
  AND
  EXISTS (
    SELECT 1 FROM events
    WHERE events.event_id = call_sessions.event_id
    AND events.artist_id = auth.uid()
  )
);

-- Artists can update their own call sessions
CREATE POLICY "Artists can update their own call sessions"
ON call_sessions FOR UPDATE
USING (auth.uid() = artist_id);

-- Add RLS policies for call_participants
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants in calls they're part of
CREATE POLICY "Users can view participants in their calls"
ON call_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM call_sessions
    WHERE call_sessions.id = call_participants.call_session_id
    AND call_sessions.artist_id = auth.uid()
  )
);

-- Artists can add participants to their call sessions
CREATE POLICY "Artists can add participants to their calls"
ON call_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM call_sessions
    WHERE call_sessions.id = call_participants.call_session_id
    AND call_sessions.artist_id = auth.uid()
  )
);

-- Users can update their own participation records
CREATE POLICY "Users can update their own participation"
ON call_participants FOR UPDATE
USING (user_id = auth.uid());

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_call_sessions_updated_at ON call_sessions;
CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_call_participants_updated_at ON call_participants;
CREATE TRIGGER update_call_participants_updated_at
  BEFORE UPDATE ON call_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON call_sessions TO authenticated;
GRANT ALL ON call_participants TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE call_sessions IS 'Stores video call sessions linked to events';
COMMENT ON TABLE call_participants IS 'Tracks participants in video calls';
COMMENT ON COLUMN call_sessions.room_name IS 'Unique LiveKit room identifier';
COMMENT ON COLUMN call_sessions.artist_id IS 'The artist/user who started the call';
