import { apiBase } from "@/lib/apiBase";
import { joinByEventId } from "@/lib/join";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, Text, View } from "react-native";

type EventRow = {
  event_id: string;
  name: string | null;
  short_code: string | null;
  energy: number;
  last_activity: string | null;
};

export default function EventsIndex() {
  const router = useRouter();
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const API = useMemo(() => apiBase(), []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/events?minutes=60&limit=100`, { cache: "no-store" });
      const j = await r.json();
      if (j?.ok && Array.isArray(j.rows)) setItems(j.rows);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onJoin = async (eventId: string) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("not signed in");

      const joinedEventId = await joinByEventId(uid, eventId);
      router.replace({ pathname: "/move", params: { event_id: joinedEventId } });
    } catch (e: any) {
      Alert.alert("Join failed", e?.message || "error");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>All On-Going Events</Text>
        <Text style={{ color: "#9ca3af", marginTop: 2 }}>Most active at the top.</Text>
      </View>
      {loading && (
        <View style={{ paddingTop: 24 }}>
          <ActivityIndicator color="#22d3ee" />
        </View>
      )}

      {!loading && (
        <FlatList
          data={items}
          keyExtractor={(i) => i.event_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: "#0a1926", borderRadius: 14, borderWidth: 1, borderColor: "#122a3a", padding: 14, gap: 8 }}>
              <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "700" }}>
                {item.name || item.short_code || `${item.event_id.slice(0, 6)}…${item.event_id.slice(-4)}`}
              </Text>
              <Text style={{ color: "#9fb5c7", fontSize: 12 }}>
                {Math.round(item.energy)} crowd energy • {item.last_activity ? timeAgo(item.last_activity) : "—"}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={() => onJoin(item.event_id)}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#115e59" : "#0f766e",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9999,
                  })}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>Join</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push({ pathname: "/leaderboard", params: { event_id: item.event_id } })}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#0b2230" : "#0a1926",
                    borderColor: "#123244",
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 9999,
                  })}
                >
                  <Text style={{ color: "#22d3ee", fontWeight: "700" }}>View leaderboard</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
