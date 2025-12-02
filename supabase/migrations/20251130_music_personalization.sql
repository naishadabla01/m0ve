-- Music Personalization & Energy Goals Migration
-- Created: 2025-11-30

-- Add genre to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS genre TEXT;

-- Add comment to explain genre values
COMMENT ON COLUMN events.genre IS 'Event music genre: Pop, EDM, Rock, Hip-Hop, Jazz, or Other';

-- Create user music preferences table
CREATE TABLE IF NOT EXISTS user_music_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  genres TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies for user_music_preferences
ALTER TABLE user_music_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own music preferences"
  ON user_music_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own music preferences"
  ON user_music_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own music preferences"
  ON user_music_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add energy goal fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS energy_goal_level TEXT DEFAULT 'chill',
ADD COLUMN IF NOT EXISTS energy_goal_points INTEGER DEFAULT 1000;

-- Add comment to explain energy goal levels
COMMENT ON COLUMN profiles.energy_goal_level IS 'Energy goal level: chill (1000pts), hyped (5000pts), storm (15000pts)';
COMMENT ON COLUMN profiles.energy_goal_points IS 'Target points for current energy goal level';

-- Create index for faster genre filtering
CREATE INDEX IF NOT EXISTS idx_events_genre ON events(genre) WHERE genre IS NOT NULL;

-- Create index for user preferences
CREATE INDEX IF NOT EXISTS idx_user_music_preferences_user_id ON user_music_preferences(user_id);

-- Update timestamp trigger for user_music_preferences
CREATE OR REPLACE FUNCTION update_user_music_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_music_preferences_updated_at
  BEFORE UPDATE ON user_music_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_music_preferences_updated_at();
