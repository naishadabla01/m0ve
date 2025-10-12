// move/app/join.tsx
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signOut().catch(() => {});
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}

async function resolveEventId(value: string): Promise<string> {
  const v = value.trim();
  if (v.length <= 8) {
    const { data, error } = await supabase
      .from('events')
      .select('event_id')
      .eq('short_code', v)
      .single();
    if (error || !data) throw new Error('Invalid event code');
    return data.event_id;
  }
  return v; // assume full uuid
}

export default function JoinScreen() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const onJoin = useCallback(async () => {
    if (!value.trim()) {
      Alert.alert('Join', 'Enter an event code or event_id');
      return;
    }
    setBusy(true);
    try {
      await ensureSession();

      const event_id = await resolveEventId(value);

      const { data: me } = await supabase.auth.getUser();
      const user_id = me?.user?.id;
      if (!user_id) throw new Error('No auth user');

      // insert participant (ignore duplicates)
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id, user_id }, { returning: 'minimal' });

      if (error) {
        // If already joined, PostgREST may return 409 with unique violation.
        // Treat it as success and continue.
        const msg = String(error.message || '');
        const dup = msg.includes('duplicate key value') || msg.includes('event_participants_pkey');
        if (!dup) throw error;
      }

      // Persist active event id for the movement screen.
    await AsyncStorage.setItem('last_event_id', event_id);

      Alert.alert('Joined', 'You have joined the event.');
      router.replace({ pathname: '/stage', params: { event_id } });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Join failed', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }, [value]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding' })}>
        <View style={{ padding: 20, flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Join</Text>
          <Text style={{ color: '#9ca3af', fontSize: 16, marginBottom: 8 }}>
            Enter event <Text style={{ color: 'white' }}>code</Text> (e.g. 7DF044) or full <Text style={{ color: 'white' }}>event_id</Text>.
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="7DF044 or 92275f5d-...-fbd5b07a0295"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: '#111827',
              color: 'white',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: '#27272a',
              fontSize: 16,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity
              disabled={busy}
              onPress={onJoin}
              style={{
                flex: 1,
                backgroundColor: busy ? '#065f46' : '#10b981',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'black', fontWeight: '700', fontSize: 16 }}>
                {busy ? 'Joining…' : 'Join'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={busy}
              onPress={() => router.push('/scan')}
              style={{
                width: 120,
                backgroundColor: '#0ea5e9',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
              }}
            >
              <Text style={{ color: 'black', fontWeight: '700', fontSize: 16 }}>Scan QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
