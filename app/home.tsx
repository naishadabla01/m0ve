import { supabase } from '@/lib/supabase';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

type EventRow = {
  event_id: string;
  title: string | null;
  name: string | null;
  short_code: string | null;
  start_at: string | null;
  end_at: string | null;
  artist_id: string;
};

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // "Ongoing" = started and not ended
      const { data, error } = await supabase
        .from('events')
        .select('event_id, title, name, short_code, start_at, end_at, artist_id')
        .is('end_at', null)
        .lte('start_at', new Date().toISOString())
        .order('start_at', { ascending: false });
      if (error) throw error;
      setEvents(data ?? []);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/signin');
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'black' }}>
      <View style={{ padding:20, gap:16, flex:1 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ color:'white', fontSize:24, fontWeight:'700' }}>Home</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={{ color:'#fca5a5' }}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection:'row', gap:12 }}>
          <Link href="/join" asChild>
            <TouchableOpacity style={{ flex:1, backgroundColor:'#10b981', padding:14, borderRadius:12, alignItems:'center' }}>
              <Text style={{ color:'black', fontWeight:'700' }}>Join by code / QR</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/stage" asChild>
            <TouchableOpacity style={{ flex:1, backgroundColor:'#22d3ee', padding:14, borderRadius:12, alignItems:'center' }}>
              <Text style={{ color:'black', fontWeight:'700' }}>Movement</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={{ flex:1, borderRadius:16, borderWidth:1, borderColor:'#27272a', backgroundColor:'#0b0f19' }}>
          <View style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#1f2937' }}>
            <Text style={{ color:'white', fontWeight:'700' }}>Ongoing artist events</Text>
          </View>

          {loading ? (
            <Text style={{ color:'#9ca3af', padding:12 }}>Loading…</Text>
          ) : events.length === 0 ? (
            <Text style={{ color:'#9ca3af', padding:12 }}>No events right now.</Text>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.event_id}
              renderItem={({ item }) => (
                <View style={{ padding:12, borderBottomWidth:1, borderBottomColor:'#111827' }}>
                  <Text style={{ color:'white', fontWeight:'600' }}>{item.title || item.name || item.short_code}</Text>
                  <Text style={{ color:'#9ca3af', marginTop:4 }}>Code: {item.short_code ?? '—'}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
