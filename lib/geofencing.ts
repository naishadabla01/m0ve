// lib/geofencing.ts - Geofencing and location verification utilities
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase/client';

export interface VenueLocation {
  latitude: number;
  longitude: number;
  radius: number; // meters
}

export interface LocationCheckResult {
  isValid: boolean;
  distance?: number; // meters from venue
  error?: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Get current user location
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('[Geofencing] Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
    });

    console.log('[Geofencing] Current location:', {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      accuracy: location.coords.accuracy,
    });

    return location;
  } catch (error) {
    console.error('[Geofencing] Failed to get current location:', error);
    return null;
  }
}

/**
 * Check if user is at venue location
 */
export async function isUserAtVenue(
  eventId: string,
  userLocation?: Location.LocationObject
): Promise<LocationCheckResult> {
  try {
    // Get event venue coordinates
    const { data: event, error } = await supabase
      .from('events')
      .select('venue_latitude, venue_longitude, venue_radius_meters')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('[Geofencing] Failed to fetch event venue:', error);
      return { isValid: false, error: 'Failed to fetch event details' };
    }

    // If no venue coordinates set, allow (backward compatibility)
    if (!event.venue_latitude || !event.venue_longitude) {
      console.log('[Geofencing] No venue coordinates set, allowing entry');
      return { isValid: true };
    }

    // Get user location if not provided
    let location = userLocation;
    if (!location) {
      location = await getCurrentLocation();
      if (!location) {
        return {
          isValid: false,
          error: 'Unable to determine your location. Please enable location services.',
        };
      }
    }

    // Calculate distance from venue
    const distance = calculateDistance(
      event.venue_latitude,
      event.venue_longitude,
      location.coords.latitude,
      location.coords.longitude
    );

    const radius = event.venue_radius_meters || 150;
    const isValid = distance <= radius;

    console.log('[Geofencing] Distance check:', {
      distance,
      radius,
      isValid,
      userLat: location.coords.latitude,
      userLon: location.coords.longitude,
      venueLat: event.venue_latitude,
      venueLon: event.venue_longitude,
    });

    if (!isValid) {
      return {
        isValid: false,
        distance,
        error: `You must be within ${radius}m of the venue to join this event. You are ${distance}m away.`,
      };
    }

    return { isValid: true, distance };
  } catch (error: any) {
    console.error('[Geofencing] Error checking venue location:', error);
    return { isValid: false, error: error.message || 'Location check failed' };
  }
}

/**
 * Check if event is within entry time window
 */
export async function isWithinEntryWindow(eventId: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('start_at, entry_window_minutes')
      .eq('event_id', eventId)
      .single();

    if (error) {
      return { isValid: false, error: 'Failed to fetch event details' };
    }

    const now = new Date();
    const eventStart = new Date(event.start_at);
    const windowMinutes = event.entry_window_minutes || 120; // Default 2 hours

    // Allow entry from 'windowMinutes' before start to 'windowMinutes' after start
    const windowStart = new Date(eventStart.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(eventStart.getTime() + windowMinutes * 60 * 1000);

    const isValid = now >= windowStart && now <= windowEnd;

    console.log('[Geofencing] Entry window check:', {
      now: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      isValid,
    });

    if (!isValid) {
      if (now < windowStart) {
        const minutesUntil = Math.round((windowStart.getTime() - now.getTime()) / 60000);
        return {
          isValid: false,
          error: `Event entry opens in ${minutesUntil} minutes`,
        };
      } else {
        return {
          isValid: false,
          error: 'Event entry window has closed',
        };
      }
    }

    return { isValid: true };
  } catch (error: any) {
    console.error('[Geofencing] Error checking entry window:', error);
    return { isValid: false, error: error.message || 'Entry window check failed' };
  }
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string,
  eventId: string,
  activityType: string,
  metadata?: any,
  severity: 'low' | 'medium' | 'high' = 'medium'
) {
  try {
    const { error } = await supabase.from('suspicious_activity').insert({
      user_id: userId,
      event_id: eventId,
      activity_type: activityType,
      severity,
      metadata,
    });

    if (error) {
      console.error('[Geofencing] Failed to log suspicious activity:', error);
    } else {
      console.log('[Geofencing] Logged suspicious activity:', {
        activityType,
        severity,
      });
    }
  } catch (error) {
    console.error('[Geofencing] Error logging suspicious activity:', error);
  }
}

/**
 * Periodic location check for active event participation
 */
export async function performLocationCheck(
  userId: string,
  eventId: string
): Promise<boolean> {
  const locationResult = await isUserAtVenue(eventId);

  if (!locationResult.isValid) {
    // Log failure and increment counter
    const { error } = await supabase
      .from('event_participants')
      .update({
        outside_geofence_count: supabase.raw('outside_geofence_count + 1'),
        last_location_check: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (!error) {
      // Log suspicious activity if distance is very far
      if (locationResult.distance && locationResult.distance > 1000) {
        await logSuspiciousActivity(
          userId,
          eventId,
          'outside_geofence',
          { distance: locationResult.distance },
          'medium'
        );
      }
    }

    return false;
  }

  // Update last check time
  await supabase
    .from('event_participants')
    .update({
      last_location_check: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('event_id', eventId);

  return true;
}

/**
 * Detect suspicious movement patterns
 */
export async function detectSuspiciousMovement(
  userId: string,
  eventId: string,
  speed: number, // meters per second
  totalMovement: number, // total meters moved
  eventDuration: number // minutes
): Promise<void> {
  const speedKmh = speed * 3.6;

  // Flag if moving faster than 50 km/h (likely in a vehicle)
  if (speedKmh > 50) {
    await logSuspiciousActivity(
      userId,
      eventId,
      'excessive_speed',
      { speed_kmh: speedKmh },
      'high'
    );
  }

  // Flag if completely stationary for long period (likely not at venue)
  if (eventDuration > 30 && totalMovement < 10) {
    await logSuspiciousActivity(
      userId,
      eventId,
      'stationary',
      { total_movement: totalMovement, duration_minutes: eventDuration },
      'low'
    );
  }
}

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Geofencing] Failed to request location permission:', error);
    return false;
  }
}
