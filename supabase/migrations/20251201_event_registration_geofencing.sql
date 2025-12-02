-- Migration: Event Registration & Geofencing System
-- Created: 2025-12-01
-- Purpose: Add event sign-up system and venue geofencing for fraud prevention

-- ============================================================================
-- 1. Add geofencing and registration fields to events table
-- ============================================================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS venue_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS venue_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS venue_radius_meters INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS venue_wifi_ssid TEXT,
ADD COLUMN IF NOT EXISTS entry_window_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_registration BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN events.venue_latitude IS 'Venue latitude for geofencing verification';
COMMENT ON COLUMN events.venue_longitude IS 'Venue longitude for geofencing verification';
COMMENT ON COLUMN events.venue_radius_meters IS 'Allowed radius in meters from venue center (default 150m)';
COMMENT ON COLUMN events.entry_window_minutes IS 'Minutes before/after event start that users can join (default 120)';
COMMENT ON COLUMN events.max_participants IS 'Maximum number of participants (NULL = unlimited)';
COMMENT ON COLUMN events.requires_registration IS 'Whether users must register before joining';

-- ============================================================================
-- 2. Create event_registrations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registration_status TEXT DEFAULT 'registered', -- 'registered', 'waitlist', 'cancelled'
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  last_location_check TIMESTAMPTZ,
  location_check_failures INTEGER DEFAULT 0,
  notes TEXT,

  -- Ensure one registration per user per event
  UNIQUE(event_id, user_id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_checked_in ON event_registrations(checked_in);

-- Add comments
COMMENT ON TABLE event_registrations IS 'User registrations for events with geofencing verification';
COMMENT ON COLUMN event_registrations.registration_status IS 'Status: registered, waitlist, cancelled';
COMMENT ON COLUMN event_registrations.checked_in IS 'Whether user successfully checked in at venue';
COMMENT ON COLUMN event_registrations.location_check_failures IS 'Number of times user was detected outside geofence';

-- ============================================================================
-- 3. Create suspicious_activity table for fraud detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS suspicious_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'excessive_speed', 'stationary', 'outside_geofence', 'gps_spoofing'
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Store details like speed, location, etc.
  auto_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(user_id),
  notes TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_event ON suspicious_activity(event_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_type ON suspicious_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_detected ON suspicious_activity(detected_at);

-- Add comments
COMMENT ON TABLE suspicious_activity IS 'Logs of detected suspicious activity for fraud prevention';
COMMENT ON COLUMN suspicious_activity.activity_type IS 'Type of suspicious activity detected';
COMMENT ON COLUMN suspicious_activity.severity IS 'Severity level: low, medium, high';

-- ============================================================================
-- 4. Update event_participants table
-- ============================================================================

ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS verified_at_venue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS join_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS join_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_location_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outside_geofence_count INTEGER DEFAULT 0;

-- ============================================================================
-- 5. Create function to get available registration slots
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_registration_stats(p_event_id UUID)
RETURNS TABLE(
  total_registered BIGINT,
  total_checked_in BIGINT,
  total_waitlist BIGINT,
  max_participants INTEGER,
  slots_available INTEGER,
  registration_open BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE registration_status = 'registered') as registered,
      COUNT(*) FILTER (WHERE checked_in = TRUE) as checked_in,
      COUNT(*) FILTER (WHERE registration_status = 'waitlist') as waitlist
    FROM event_registrations
    WHERE event_id = p_event_id
  ),
  event_info AS (
    SELECT
      e.max_participants,
      CASE
        WHEN e.registration_opens_at IS NOT NULL AND NOW() < e.registration_opens_at THEN FALSE
        WHEN e.registration_closes_at IS NOT NULL AND NOW() > e.registration_closes_at THEN FALSE
        ELSE TRUE
      END as is_open
    FROM events e
    WHERE e.event_id = p_event_id
  )
  SELECT
    stats.registered,
    stats.checked_in,
    stats.waitlist,
    event_info.max_participants,
    CASE
      WHEN event_info.max_participants IS NULL THEN NULL
      ELSE GREATEST(0, event_info.max_participants - stats.registered::INTEGER)
    END as available,
    event_info.is_open
  FROM stats, event_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Create function to calculate distance between coordinates
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL(10, 8),
  lon1 DECIMAL(11, 8),
  lat2 DECIMAL(10, 8),
  lon2 DECIMAL(11, 8)
) RETURNS INTEGER AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371000; -- meters
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Haversine formula
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN ROUND(earth_radius * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. Create function to verify user is at venue
-- ============================================================================

CREATE OR REPLACE FUNCTION is_user_at_venue(
  p_event_id UUID,
  p_user_latitude DECIMAL(10, 8),
  p_user_longitude DECIMAL(11, 8)
) RETURNS BOOLEAN AS $$
DECLARE
  v_venue_lat DECIMAL(10, 8);
  v_venue_lon DECIMAL(11, 8);
  v_radius INTEGER;
  v_distance INTEGER;
BEGIN
  -- Get venue coordinates and radius
  SELECT venue_latitude, venue_longitude, venue_radius_meters
  INTO v_venue_lat, v_venue_lon, v_radius
  FROM events
  WHERE event_id = p_event_id;

  -- If no venue coordinates set, allow (backward compatibility)
  IF v_venue_lat IS NULL OR v_venue_lon IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Calculate distance
  v_distance := calculate_distance_meters(
    v_venue_lat, v_venue_lon,
    p_user_latitude, p_user_longitude
  );

  -- Check if within radius
  RETURN v_distance <= COALESCE(v_radius, 150);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Enable RLS on new tables
-- ============================================================================

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations
CREATE POLICY "Users can view their own registrations"
  ON event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register for events"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Event organizers can view registrations for their events"
  ON event_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.event_id = event_registrations.event_id
      AND e.artist_id = auth.uid()
    )
  );

-- RLS Policies for suspicious_activity
CREATE POLICY "Users can view their own suspicious activity"
  ON suspicious_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can log suspicious activity"
  ON suspicious_activity FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Event organizers can view suspicious activity for their events"
  ON suspicious_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.event_id = suspicious_activity.event_id
      AND e.artist_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. Create updated_at trigger for event_registrations
-- ============================================================================

CREATE OR REPLACE FUNCTION update_event_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_registrations_updated_at();

-- ============================================================================
-- 10. Grant permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON event_registrations TO authenticated;
GRANT ALL ON suspicious_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_registration_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance_meters TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_at_venue TO authenticated;
