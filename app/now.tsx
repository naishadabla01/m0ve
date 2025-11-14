// app/now.tsx
'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Accelerometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../src/lib/supabase';

const STORAGE_KEY = 'last_event_id';
const INGEST_URL = (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_INGEST_URL as string;

type IntervalHandle = ReturnType<typeof setInterval>;

export default function NowPage() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [avg, setAvg] = useState(0);
  const [lastOk, setLastOk] = useState<null | boolean>(null);

  const buf = useRef<number[]>([]);
  const loopRef = useRef<IntervalHandle | null>(null);
  const accelSub = useRef<{ remove: () => void } | null>(null);

  // Load event id + optional autostart
  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await AsyncStorage.getItem(STORAGE_KEY);
      if (!mounted) return;
      setEventId(id);

      const params = new URLSearchParams(globalThis.location?.search ?? '');
      if (id && params.get('autostart') === '1') {
        start(id);
      }
    })();
    return () => { mounted = false; stop(); };
  }, []);

  // Pause when app backgrounded
  useEffect(() => {
    const onChange = (s: AppStateStatus) => {
      if (s !== 'active') stop();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const start = async (id?: string) => {
    const eid = id ?? eventId;
    if (!eid) {
      Alert.alert('No event selected', 'Scan an event QR first.');
      return;
    }
    if (running) return;

    // Start accelerometer
    Accelerometer.setUpdateInterval(100); // 10 Hz
    accelSub.current = Accelerometer.addListener(({ x, y, z }) => {
      // magnitude minus gravity ~1g
      const g = Math.sqrt(x * x + y * y + z * z);
      buf.current.push(Math.max(0, g - 1));
    });

    // Start 1 Hz loop
    loopRef.current = setInterval(async () => {
      try {
        const samples = buf.current.splice(0); // drain
        const average = samples.length
          ? samples.reduce((a, b) => a + b, 0) / samples.length
          : 0;
        setAvg(average);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch(INGEST_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ event_id: eid, accel: average, steps: 0 })
        });
        setLastOk(res.ok);
      } catch {
        setLastOk(false);
      }
    }, 1000);

    setRunning(true);
  };

  const stop = () => {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
    if (accelSub.current) accelSub.current.remove();
    accelSub.current = null;
    setRunning(false);
  };

  return (
    <View style={S.container}>
      <Text style={S.title}>Now sending movement</Text>
      <Text style={S.sub}>Event: {eventId ?? 'None (scan first)'}</Text>
      <View style={{ height: 10 }} />
      <View style={S.card}>
        <Text style={S.cardTitle}>Current avg accel</Text>
        <Text style={S.big}>{avg.toFixed(3)} g</Text>
        <Text style={[S.status, lastOk === true && S.ok, lastOk === false && S.bad]}>
          {lastOk === null ? '—' : lastOk ? 'last send: ok' : 'last send: failed'}
        </Text>
      </View>
      <View style={{ height: 14 }} />
      <Button title={running ? 'Stop' : 'Start'} onPress={running ? stop : () => start()} />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10, justifyContent: 'center', backgroundColor: '#0b1020' },
  title: { fontSize: 20, fontWeight: '700', color: '#e2e8f0' },
  sub: { color: '#94a3b8' },
  card: { backgroundColor: '#111827', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { color: '#9ca3af', marginBottom: 6 },
  big: { color: '#f8fafc', fontSize: 28, fontWeight: '800' },
  status: { marginTop: 6, color: '#94a3b8' },
  ok: { color: '#22c55e' },
  bad: { color: '#ef4444' }
});
