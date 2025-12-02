// move/app/stage/index.tsx
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

type Sample = { ax: number; ay: number; az: number; t: number };

// ==== TUNABLES (this is where you enforce the 3s flush) ====
const HZ = 10;              // sensor rate (10Hz)
const FLUSH_MS = 3000;      // <-- 3 seconds flush interval (change here if needed)
const USE_RAW_SAMPLES = false; // keep false to avoid per-second motion_samples writes
// ===========================================================

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signOut().catch(() => {});
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}

/** Ensure user is registered as a participant (idempotent). */
async function ensureParticipant(event_id: string, user_id: string) {
  const { error } = await supabase
    .from('event_participants')
    .upsert({ event_id, user_id }, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** Upsert a minute bucket on server and get a suggested delta to bump score. */
async function upsertBucketAndGetDelta(event_id: string, count: number, sumAccel: number, maxAccel: number) {
  const bucketTs = new Date(); // minute bucket
  bucketTs.setSeconds(0, 0);
  const { data: delta, error } = await supabase.rpc('fn_upsert_motion_bucket', {
    p_event: event_id,
    p_bucket_ts: bucketTs.toISOString(),
    p_count: count,
    p_sum: sumAccel,
    p_max: maxAccel
  });
  if (error) throw error;
  return typeof delta === 'number' ? delta : 0;
}

/** Bump the live score once per flush. */
async function bumpScore(event_id: string, delta: number) {
  if (delta <= 0) return;
  const { error } = await supabase.rpc('fn_bump_score', { p_event: event_id, p_delta: delta });
  if (error) throw error;
}

export default function Stage() {
  const { event_id: p } = useLocalSearchParams<{ event_id?: string }>();
  const router = useRouter();

  const [eventId, setEventId] = useState<string | null>(p ?? null);
  const [running, setRunning] = useState(false);

  const accelSub = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<any>(null);
  const buffer = useRef<Sample[]>([]);
  const lastFlush = useRef<number>(0);

  // Load/persist active event id
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (p) {
          await AsyncStorage.setItem('active_event_id', String(p));
          if (mounted) setEventId(String(p));
        } else {
          const v = await AsyncStorage.getItem('active_event_id');
          if (v && mounted) setEventId(v);
          if (!v) {
            const legacy = await AsyncStorage.getItem('last_event_id');
            if (legacy && mounted) setEventId(legacy);
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [p]);

  useEffect(() => {
    return () => stop(); // cleanup all listeners/timers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    try {
      await ensureSession();
      const { data: me } = await supabase.auth.getUser();
      const user_id = me?.user?.id;
      if (!user_id) throw new Error('Not signed in');
      if (!eventId) throw new Error('No event_id');

      // Ensure participant (also ensures a scores row exists)
      await ensureParticipant(eventId, user_id);

      // Reset state
      buffer.current = [];
      lastFlush.current = Date.now();
      setRunning(true);

      // Set accelerometer rate from HZ (1000ms / HZ)
      Accelerometer.setUpdateInterval(Math.max(50, Math.floor(1000 / HZ)));
      accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
        buffer.current.push({ ax: x, ay: y, az: z, t: Date.now() });
      });

      // Flush loop (3s window by default)
      timerRef.current = setInterval(async () => {
        if (!running) return;
        const now = Date.now();
        if (now - lastFlush.current < FLUSH_MS) return;

        const batch = buffer.current.splice(0, buffer.current.length);
        lastFlush.current = now;
        if (batch.length === 0) return;

        // Aggregate the window on-device
        let sum = 0;
        let maxMag = 0;
        for (const r of batch) {
          const mag = Math.sqrt(r.ax*r.ax + r.ay*r.ay + r.az*r.az);
          sum += mag;
          if (mag > maxMag) maxMag = mag;
        }
        const count = batch.length;

        // (Optional) raw sample write for debugging ONLY
        if (USE_RAW_SAMPLES) {
          const mean = sum / count;
          const { error } = await supabase
            .from('motion_samples')
            .insert({ event_id: eventId, user_id, accel: mean, steps: null });
          if (error) console.warn('motion_samples insert failed:', error.message);
        }

        // Upsert bucket & bump score ONCE per flush
        try {
          const delta = await upsertBucketAndGetDelta(eventId, count, sum, maxMag);
          await bumpScore(eventId, delta);
          // Optional: console feedback
          // console.log(`flush ${count} samples, delta=${delta.toFixed(2)}`);
        } catch (e: any) {
          console.warn('bucket/bump failed:', e?.message ?? String(e));
        }
      }, 350); // check timer ~3x/sec (flushes only when FLUSH_MS elapsed)
    } catch (e: any) {
      Alert.alert('Start failed', e?.message ?? String(e));
    }
  }, [eventId, running]);

  const stop = useCallback(() => {
    setRunning(false);
    try { accelSub.current?.remove(); } catch {}
    accelSub.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ padding: 20, gap: 16 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Movement</Text>
        <Text style={{ color: '#9ca3af' }}>
          Event: {eventId ?? '—'} · {HZ}Hz · flush {FLUSH_MS}ms
        </Text>

        {!eventId && (
          <Text style={{ color: '#fca5a5' }}>
            No active event. Go back and join an event first.
          </Text>
        )}

        {!running ? (
          <TouchableOpacity
            disabled={!eventId}
            onPress={start}
            style={{
              backgroundColor: !eventId ? '#374151' : '#10b981',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'black', fontWeight: '700' }}>
              {eventId ? 'Start' : 'Join an event to start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={stop}
            style={{ backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Stop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 8,
            backgroundColor: '#111827',
            borderRadius: 12,
            padding: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#27272a',
          }}
        >
          <Text style={{ color: 'white' }}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
