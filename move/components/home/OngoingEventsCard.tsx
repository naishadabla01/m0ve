// components/home/OngoingEventsCard.tsx - WORKING VERSION
import { apiBase } from "@/lib/apiBase";
import { joinEventById } from "@/lib/join";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type EventRow = {
  event_id: string;
  name: string | null;
  short_code: string | null;
  energy: number;
  last_activity: string | null;
  status?: string;
};

export default function OngoingEventsCard() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const base = apiBase();
      
      // Use the same API endpoint that works
      const url = `${base}/api/events?minutes=10800&limit=100`;
      console.log("OngoingEventsCard fetching:", url);
      
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      
      console.log("OngoingEventsCard response:", j);
      
      if (j?.ok && Array.isArray(j.rows)) {
        // Filter out ended events if status field exists
        const activeEvents = j.rows.filter((ev: any) => 
          !ev.status || ev.status !== 'ended'
        );
        console.log("OngoingEventsCard loaded", activeEvents.length, "active events");
        setRows(activeEvents);
      } else {
        console.warn("OngoingEventsCard: No events or bad response:", j);
        setRows([]);
      }
    } catch (err) {
      console.error("OngoingEventsCard error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load();
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Top 3 only for the home card
  const top3 = useMemo(() => rows.slice(0, 3), [rows]);

  return (
    <View style={{ 
      backgroundColor: "#07141c", 
      borderRadius: 16, 
      borderWidth: 1, 
      borderColor: "#0f2430", 
      padding: 16, 
      gap: 12 
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: "#e5eef5", fontSize: 16, fontWeight: "700" }}>
            On-Going Events
          </Text>
          <Text style={{ color: "#8aa3b3", fontSize: 12, marginTop: 2 }}>
            Top playing right now
          </Text>
        </View>
        
        <Pressable onPress={load}>
          <Text style={{ color: "#4ECDC4", fontSize: 12 }}>Refresh</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color="#4ECDC4" />
        </View>
      )}

      {!loading && top3.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ color: "#7c93a3", fontSize: 14 }}>
            No active events yet
          </Text>
          <Text style={{ color: "#5a6a7a", fontSize: 12, marginTop: 5 }}>
            Check back later or create one!
          </Text>
        </View>
      )}

      {!loading && top3.map((ev) => {
        const displayName = ev.name || ev.short_code || `Event ${ev.event_id.slice(0, 6)}`;
        const ago = ev.last_activity ? timeAgo(ev.last_activity) : "Just now";
        
        return (
          <View
            key={ev.event_id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#0a1823",
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: "#152230",
            }}
          >
            <View style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              backgroundColor: "#4ECDC4",
              opacity: 0.2,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 18 }}>🏃</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: "#ffffff", 
                fontSize: 14, 
                fontWeight: "600",
                marginBottom: 2,
              }}>
                {displayName}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Text style={{ color: "#6a8090", fontSize: 12 }}>
                  {ev.energy} GP
                </Text>
                <Text style={{ color: "#6a8090", fontSize: 12 }}>
                  {ago}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                joinEventById(ev.event_id);
              }}
              style={{
                backgroundColor: "#10b981",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#000", fontSize: 12, fontWeight: "600" }}>
                Join
              </Text>
            </Pressable>
          </View>
        );
      })}

      {!loading && rows.length > 3 && (
        <Pressable
          onPress={() => {
            // Navigate to events page - adjust path as needed
            const { router } = require('expo-router');
            router.push("/(home)/events");
          }}
          style={{
            alignItems: "center",
            paddingTop: 8,
          }}
        >
          <Text style={{ color: "#4ECDC4", fontSize: 13 }}>
            View all {rows.length} events →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}