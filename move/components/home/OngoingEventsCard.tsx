// components/home/OngoingEventsCard.tsx
import { apiBase } from "@/lib/apiBase";
import { joinEventById, openLeaderboard } from "@/lib/join";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type EventRow = {
  event_id: string;
  energy: number;       // crowd energy total
  last_ts?: string|null; // ISO for “last active”
};

export default function OngoingEventsCard() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      // This endpoint is the same one you already wired for the “All events” page.
      const base = apiBase();
      const r = await fetch(`${base}/api/events/ongoing`, { cache: "no-store" });
      const j = await r.json();
      if (Array.isArray(j?.rows)) setRows(j.rows as EventRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Top 3 only for the home card
  const top3 = useMemo(() => rows.slice(0, 3), [rows]);

  return (
    <View style={{ backgroundColor: "#07141c", borderRadius: 16, borderWidth: 1, borderColor: "#0f2430", padding: 16, gap: 12 }}>
      <Text style={{ color: "#e5eef5", fontSize: 16, fontWeight: "700" }}>On-Going Events</Text>
      <Text style={{ color: "#8aa3b3", fontSize: 12, marginTop: -4 }}>Top playing right now.</Text>

      {loading && (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && top3.length === 0 && (
        <Text style={{ color: "#7c93a3" }}>No active events yet.</Text>
      )}

      {!loading && top3.map((ev) => {
        const shortId = `${ev.event_id.slice(0, 6)}…${ev.event_id.slice(-4)}`;
        const ago = ev.last_ts ? timeAgo(ev.last_ts) : "—";
        return (
          <View
            key={ev.event_id}
            style={{
              backgroundColor: "#0b1b25",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#0f2a37",
              padding: 14,
              marginTop: 4,
            }}
          >
            <Text style={{ color: "#d9e6ee", fontWeight: "700", marginBottom: 2 }}>{shortId}</Text>
            <Text style={{ color: "#91a9b8", fontSize: 12, marginBottom: 10 }}>
              {ev.energy} crowd energy • {ago}
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => joinEventById(ev.event_id)}
                style={{
                  backgroundColor: "#0f5d42",
                  borderColor: "#177a58",
                  borderWidth: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#d3f4e7", fontWeight: "700" }}>Join</Text>
              </Pressable>

              <Pressable
                onPress={() => openLeaderboard(ev.event_id)}
                style={{
                  backgroundColor: "#0e2b4a",
                  borderColor: "#173c66",
                  borderWidth: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#cfe3ff", fontWeight: "700" }}>Leaderboard</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* The “View all events” button still navigates to the full list page */}
      <Pressable
        onPress={() => {
          // go to the /events page (you already have it)
          // NOTE: do NOT change this to /scan
          // We navigate with Expo Router segment under (home)
          // @ts-ignore - we can import here to avoid a top-level dep cycle
          const { router } = require("expo-router");
          router.push("/(home)/events");
        }}
        style={{
          alignSelf: "flex-start",
          marginTop: 6,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: "#0b1b25",
          borderColor: "#103448",
          borderWidth: 1,
        }}
      >
        <Text style={{ color: "#cfe3ff", fontWeight: "700" }}>View all events</Text>
      </Pressable>
    </View>
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
