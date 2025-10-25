// app/(home)/events/index.tsx
import { apiBase } from "@/lib/apiBase";
import { joinEventById, openLeaderboard } from "@/lib/join";
import { router } from "expo-router"; // ← Add this import
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

type EventRow = {
  event_id: string;
  name: string | null;
  short_code: string | null;
  energy: number;
  last_activity: string | null;
};

export default function AllEventsScreen() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const base = apiBase();
      const url = `${base}/api/events?minutes=10800&limit=100`;
      
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      
      if (j?.ok && Array.isArray(j.rows)) {
        setRows(j.rows);
      } else {
        setRows([]);
      }
    } catch (err) {
      console.error("Events error:", err);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* ✅ CUSTOM HEADER WITH BACK BUTTON */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#1f2937",
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            marginRight: 12,
            padding: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: "#22d3ee", fontSize: 18, fontWeight: "600" }}>
            ← Back
          </Text>
        </Pressable>

        {/* Title */}
        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 20,
            fontWeight: "700",
            flex: 1,
          }}
        >
          All On-Going Events
        </Text>

        {/* Optional: Refresh Icon */}
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={({ pressed }) => ({
            padding: 8,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: "#22d3ee", fontSize: 20 }}>
            {refreshing ? "⟳" : "↻"}
          </Text>
        </Pressable>
      </View>

      {/* Subtitle */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>
          Most active at the top.
        </Text>
      </View>

      {/* Events List */}
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22d3ee"
          />
        }
      >
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={{ color: "#9ca3af", marginTop: 12 }}>
              Loading events...
            </Text>
          </View>
        )}

        {!loading && rows.length === 0 && (
          <View
            style={{
              padding: 40,
              alignItems: "center",
              backgroundColor: "#111827",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#1f2937",
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 40, marginBottom: 12 }}>
              🎭
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 16, textAlign: "center" }}>
              No active events right now
            </Text>
            <Text
              style={{
                color: "#6b7280",
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Check back later or create one!
            </Text>
          </View>
        )}

        {!loading &&
          rows.map((ev) => {
            const displayName =
              ev.name ||
              ev.short_code ||
              `${ev.event_id.slice(0, 6)}…${ev.event_id.slice(-4)}`;
            const ago = ev.last_activity ? timeAgo(ev.last_activity) : "—";

            return (
              <View
                key={ev.event_id}
                style={{
                  backgroundColor: "#111827",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#1f2937",
                  padding: 20,
                  gap: 12,
                }}
              >
                {/* Event Name */}
                <Text
                  style={{
                    color: "#e5e7eb",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {displayName}
                </Text>

                {/* Stats */}
                <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                  {Math.round(ev.energy)} crowd energy • {ago}
                </Text>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Pressable
                    onPress={() => joinEventById(ev.event_id)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? "#0d9488" : "#10b981",
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#000", fontWeight: "700" }}>
                      Join
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => openLeaderboard(ev.event_id)}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? "#1e3a4f" : "#0a1926",
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#1f2937",
                    })}
                  >
                    <Text style={{ color: "#22d3ee", fontWeight: "700" }}>
                      Leaderboard
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
      </ScrollView>
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