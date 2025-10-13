// app/move.tsx
import { apiBase } from "@/lib/apiBase";
import { startMotionStream, StreamHandle } from "@/lib/motionStream";
import { supabase } from "@/lib/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

type EventInfo = {
  event_id: string;
  name?: string;
  title?: string;
  artist_name?: string;
  artist_id?: string;
  short_code?: string;
};

export default function MoveScreen() {
  const { event_id: eventIdParam } = useLocalSearchParams<{ event_id?: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Motion tracking
  const [mag, setMag] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [totalEnergy, setTotalEnergy] = useState<number>(0);
  const [percentComplete, setPercentComplete] = useState<number>(0);

  const streamRef = useRef<StreamHandle | null>(null);
  const accelSubRef = useRef<{ remove?: () => void } | null>(null);

  // Resolve event_id: route param first, then AsyncStorage
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const fromParam = (eventIdParam || "").trim();
      if (fromParam) {
        if (isMounted) setEventId(fromParam);
        try {
          await AsyncStorage.setItem("event_id", fromParam);
        } catch {}
        return;
      }

      try {
        const saved = (await AsyncStorage.getItem("event_id")) || "";
        if (isMounted) setEventId(saved || null);
      } catch {
        if (isMounted) setEventId(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [eventIdParam]);

  // Fetch event info
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        
        // Get event details
        const { data: event } = await supabase
          .from("events")
          .select("event_id, name, title, short_code, artist_id")
          .eq("event_id", eventId)
          .maybeSingle();

        if (!isMounted) return;

        let artistName = "Unknown Artist";
        
        // Get artist info if available
        if (event?.artist_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, first_name, last_name")
            .eq("user_id", event.artist_id)
            .maybeSingle();

          if (profile) {
            artistName =
              profile.display_name ||
              [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
              "Unknown Artist";
          }
        }

        if (!isMounted) return;

        setEventInfo({
          event_id: eventId,
          name: event?.name || event?.title || null,
          artist_name: artistName,
          artist_id: event?.artist_id,
          short_code: event?.short_code,
        });

        // Fetch current energy for this event
        try {
          const base = apiBase();
          const url = `${base}/api/scores?event_id=${encodeURIComponent(eventId)}`;
          const res = await fetch(url);
          const json = await res.json();
          
          if (json?.ok) {
            const entries = json.scores || json.rows || [];
            const total = entries.reduce((sum: number, e: any) => sum + (e.score || e.seconds || 0), 0);
            setTotalEnergy(total);
            
            // Simple percentage: arbitrary goal of 10000 energy
            const goal = 10000;
            setPercentComplete(Math.min(100, Math.round((total / goal) * 100)));
          }
        } catch (e) {
          console.error("Failed to fetch energy:", e);
        }
      } catch (err) {
        console.error("Failed to load event info:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Accelerometer preview
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;

      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) return;

        Accelerometer.setUpdateInterval(200);
        const sub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
          setMag(Math.sqrt(x * x + y * y + z * z));
        });
        accelSubRef.current = sub;
      } catch {}
    })();

    return () => {
      try {
        accelSubRef.current?.remove?.();
      } catch {}
      accelSubRef.current = null;
    };
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      try {
        streamRef.current?.stop?.();
      } catch {}
      streamRef.current = null;
    };
  }, []);

  const start = () => {
    if (running) return;

    if (Platform.OS === "web") {
      Alert.alert("Web preview", "Motion streaming runs on a real device. Use Android/iOS app.");
      return;
    }

    streamRef.current = startMotionStream(eventId!, 1000);
    setRunning(true);
  };

  const stop = () => {
    try {
      streamRef.current?.stop?.();
    } catch {}
    streamRef.current = null;
    setRunning(false);
    Alert.alert("Stopped", "Movement streaming stopped.");
  };

  const openLeaderboard = () => {
    router.push({
      pathname: "/(home)/leaderboard",
      params: { event_id: eventId! },
    });
  };

  if (!eventId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#9ca3af", fontSize: 16, marginBottom: 16, textAlign: "center" }}>
            No event selected
          </Text>
          <Pressable
            onPress={() => router.replace("/(home)")}
            style={{
              backgroundColor: "#10b981",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#000", fontWeight: "700" }}>Go to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const eventName = eventInfo?.name || `Event ${eventInfo?.short_code || eventId.slice(0, 8)}`;
  const artistName = eventInfo?.artist_name || "Unknown Artist";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ color: "#22d3ee", fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Movement</Text>
        </View>

        {/* SECTION 1: Event Info Card */}
        <View
          style={{
            backgroundColor: "#0b1920",
            borderColor: "#1a2e3a",
            borderWidth: 1,
            padding: 18,
            borderRadius: 14,
            gap: 14,
          }}
        >
          {/* Event Name */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "600", letterSpacing: 1 }}>
              EVENT
            </Text>
            <Text style={{ color: "#e5e7eb", fontSize: 18, fontWeight: "700" }}>
              {eventName}
            </Text>
          </View>

          {/* Artist Name */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "600", letterSpacing: 1 }}>
              ARTIST
            </Text>
            <Text style={{ color: "#22d3ee", fontSize: 15, fontWeight: "600" }}>
              {artistName}
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: "#1f2937", marginVertical: 4 }} />

          {/* Event Score Progress */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600" }}>
                Event Energy
              </Text>
              <Text style={{ color: "#10b981", fontSize: 16, fontWeight: "700" }}>
                {percentComplete}%
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View
              style={{
                height: 8,
                backgroundColor: "#1f2937",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${percentComplete}%`,
                  backgroundColor: "#10b981",
                  borderRadius: 999,
                }}
              />
            </View>

            <Text style={{ color: "#6b7280", fontSize: 11 }}>
              Total: {Math.round(totalEnergy)} energy points
            </Text>
          </View>

          {/* Live Magnitude */}
          <View
            style={{
              backgroundColor: "#060f14",
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: running ? "#10b981" : "#1f2937",
            }}
          >
            <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>
              Live Sensor Data
            </Text>
            <Text style={{ color: running ? "#10b981" : "#6b7280", fontSize: 20, fontWeight: "700" }}>
              {mag.toFixed(2)}
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 10, marginTop: 2 }}>
              {Platform.OS === "web" ? "Web preview" : running ? "Streaming..." : "Idle"}
            </Text>
          </View>
        </View>

        {/* SECTION 2: Start/Stop Button */}
        <Pressable
          onPress={running ? stop : start}
          style={({ pressed }) => ({
            backgroundColor: running
              ? pressed
                ? "#b91c1c"
                : "#dc2626"
              : pressed
              ? "#0d9488"
              : "#10b981",
            paddingVertical: 24,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: running ? "#dc2626" : "#10b981",
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            borderWidth: 2,
            borderColor: running ? "#991b1b" : "#059669",
          })}
        >
          <View style={{ alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: running ? "#7f1d1d" : "#064e3b",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: running ? "#991b1b" : "#059669",
              }}
            >
              <Text style={{ fontSize: 32 }}>{running ? "⏸" : "▶"}</Text>
            </View>
            <Text
              style={{
                color: "#000",
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {running ? "STOP MOVEMENT" : "START MOVEMENT"}
            </Text>
            <Text style={{ color: running ? "#7f1d1d" : "#064e3b", fontSize: 12 }}>
              {running ? "Tap to stop tracking" : "Tap to start tracking"}
            </Text>
          </View>
        </Pressable>

        {/* SECTION 3: Leaderboard Button */}
        <Pressable
          onPress={openLeaderboard}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#1e3a4f" : "#0a1926",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1f2937",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          })}
        >
          <Text style={{ fontSize: 20 }}>🏆</Text>
          <Text
            style={{
              color: "#22d3ee",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            View Leaderboard
          </Text>
        </Pressable>

        {/* Helper Text */}
        <View
          style={{
            backgroundColor: "#0b1920",
            padding: 14,
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: "#22d3ee",
          }}
        >
          <Text style={{ color: "#9ca3af", fontSize: 12, lineHeight: 18 }}>
            💡 Keep the app open and your phone in hand. Your movement will be tracked and contribute to the event's total energy!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}