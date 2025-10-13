// app/(home)/leaderboard.tsx
import { apiBase } from "@/lib/apiBase";
import { router, useLocalSearchParams } from "expo-router";
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

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name?: string;
  name?: string;
  score: number;
  seconds?: number;
  last_activity?: string;
  last_seen?: string;
};

type LeaderboardData = {
  event_id: string;
  event_name?: string;
  event_title?: string;
  short_code?: string;
  entries: LeaderboardEntry[];
  total_energy?: number;
};

export default function LeaderboardScreen() {
  const { event_id } = useLocalSearchParams<{ event_id: string }>();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!event_id) return;
    
    setError(null);
    
    try {
      const base = apiBase();
      const url = `${base}/api/scores?event_id=${encodeURIComponent(event_id)}`;
      console.log("🔍 Fetching leaderboard:", url);
      
      const res = await fetch(url);
      const json = await res.json();
      
      console.log("📊 Leaderboard API response:", JSON.stringify(json, null, 2));
      
      if (!json?.ok) {
        setError(json?.error || "Failed to load leaderboard");
        setData(null);
        return;
      }

      // ✅ FIXED: Handle both 'rows' and 'scores' response formats
      const rawEntries = json.scores || json.rows || [];
      
      console.log(`📋 Found ${rawEntries.length} entries`);

      // ✅ FIXED: Map to consistent format, handling both field name variants
      const entries: LeaderboardEntry[] = rawEntries.map((entry: any, idx: number) => {
        const score = parseFloat(entry.score || entry.seconds || 0);
        const displayName = 
          entry.display_name || 
          entry.name || 
          `User ${entry.user_id?.slice(0, 6) || 'unknown'}`;
        
        console.log(`  ${idx + 1}. ${displayName}: ${score}`);

        return {
          rank: idx + 1,
          user_id: entry.user_id || "unknown",
          display_name: displayName,
          score: score,
          last_activity: entry.last_activity || entry.last_seen || entry.updated_at,
        };
      });

      // ✅ Get event name from response
      const eventName = json.event_name || json.event_title || null;
      console.log("🏷️  Event name:", eventName);

      setData({
        event_id: event_id,
        event_name: eventName,
        short_code: json.short_code,
        entries,
        total_energy: json.total_energy,
      });
    } catch (e) {
      console.error("❌ Failed to load leaderboard:", e);
      setError(e instanceof Error ? e.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [event_id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!event_id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#ef4444", fontSize: 16 }}>No event ID provided</Text>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: 16, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: "#1f2937", borderRadius: 8 }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#1f2937",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ marginRight: 12, padding: 8 }}
        >
          <Text style={{ color: "#22d3ee", fontSize: 18 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Leaderboard</Text>
          {/* ✅ FIXED: Show event name instead of just code */}
          {(data?.event_name || data?.short_code) && (
            <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
              {data.event_name || `Event ${data.short_code}`}
            </Text>
          )}
        </View>
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: refreshing ? "#374151" : "#1f2937",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#22d3ee", fontWeight: "600" }}>
            {refreshing ? "..." : "Refresh"}
          </Text>
        </Pressable>
      </View>

      {/* Stats Card */}
      {data?.total_energy !== undefined && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            padding: 16,
            backgroundColor: "#0b1920",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#1f2937",
          }}
        >
          <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>Total Crowd Energy</Text>
          <Text style={{ color: "#10b981", fontSize: 28, fontWeight: "700" }}>
            {Math.round(data.total_energy || 0)}
          </Text>
        </View>
      )}

      {/* Loading State */}
      {loading && !data && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading leaderboard...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#ef4444", fontSize: 16, marginBottom: 12 }}>
            {error}
          </Text>
          <Pressable
            onPress={load}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 20,
              backgroundColor: "#1f2937",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#22d3ee", fontWeight: "600" }}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Leaderboard Table */}
      {!loading && !error && data && (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />
          }
        >
          {data.entries.length === 0 ? (
            <View
              style={{
                padding: 32,
                backgroundColor: "#0b1920",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#1f2937",
              }}
            >
              <Text style={{ color: "#9ca3af", textAlign: "center" }}>
                No participants yet. Be the first to join!
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "#0b1920",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#1f2937",
                overflow: "hidden",
              }}
            >
              {/* Table Header */}
              <View
                style={{
                  flexDirection: "row",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: "#111827",
                  borderBottomWidth: 1,
                  borderBottomColor: "#1f2937",
                }}
              >
                <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "700", width: 40 }}>#</Text>
                <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "700", flex: 1 }}>User</Text>
                <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "700", width: 80, textAlign: "right" }}>
                  Score
                </Text>
              </View>

              {/* Table Rows */}
              {data.entries.map((entry, idx) => {
                const isTop3 = entry.rank <= 3;
                const isFirst = entry.rank === 1;

                return (
                  <View
                    key={entry.user_id}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderBottomWidth: idx < data.entries.length - 1 ? 1 : 0,
                      borderBottomColor: "#1f2937",
                      backgroundColor: isFirst ? "#064e3b" : isTop3 ? "#0b1920" : "transparent",
                    }}
                  >
                    {/* Rank */}
                    <View style={{ width: 40, justifyContent: "center" }}>
                      {isFirst ? (
                        <Text style={{ fontSize: 20 }}>🥇</Text>
                      ) : entry.rank === 2 ? (
                        <Text style={{ fontSize: 20 }}>🥈</Text>
                      ) : entry.rank === 3 ? (
                        <Text style={{ fontSize: 20 }}>🥉</Text>
                      ) : (
                        <Text style={{ color: "#9ca3af", fontSize: 14, fontWeight: "600" }}>
                          {entry.rank}
                        </Text>
                      )}
                    </View>

                    {/* Display Name */}
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={{
                          color: isFirst ? "#10b981" : "#e5e7eb",
                          fontSize: 14,
                          fontWeight: isTop3 ? "700" : "400",
                        }}
                        numberOfLines={1}
                      >
                        {entry.display_name}
                      </Text>
                      {entry.last_activity && (
                        <Text style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
                          {timeAgo(entry.last_activity)}
                        </Text>
                      )}
                    </View>

                    {/* Score */}
                    <View style={{ width: 80, justifyContent: "center", alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: isFirst ? "#10b981" : "#e5e7eb",
                          fontSize: isTop3 ? 16 : 14,
                          fontWeight: isTop3 ? "700" : "600",
                        }}
                      >
                        {entry.score.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Join Button at Bottom */}
          <Pressable
            onPress={() => {
              router.push({ pathname: "/move", params: { event_id } });
            }}
            style={({ pressed }) => ({
              marginTop: 20,
              paddingVertical: 16,
              backgroundColor: pressed ? "#0d9488" : "#10b981",
              borderRadius: 12,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#000", fontSize: 16, fontWeight: "700" }}>
              Join & Start Moving
            </Text>
          </Pressable>
        </ScrollView>
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