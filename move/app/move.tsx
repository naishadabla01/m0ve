// app/move.tsx
import { startMotionStream, StreamHandle } from "@/lib/motionStream";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Platform, Text, View } from "react-native";

export default function MoveScreen() {
  // event_id may come via route params after /scan
  const { event_id: eventIdParam } = useLocalSearchParams<{ event_id?: string }>();
  const [eventId, setEventId] = useState<string | null>(null);

  // live magnitude display
  const [mag, setMag] = useState<number>(0);
  const [running, setRunning] = useState(false);

  const streamRef = useRef<StreamHandle | null>(null);
  const accelSubRef = useRef<{ remove?: () => void } | null>(null);

  // Resolve event_id: route param first, then AsyncStorage fallback
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const fromParam = (eventIdParam || "").trim();
      if (fromParam) {
        if (isMounted) setEventId(fromParam);
        // stash it so future opens (e.g., cold start) still know the event
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

  // Accelerometer preview (native only)
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return; // no sensor on web

      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) return;

        Accelerometer.setUpdateInterval(200); // ~5 Hz
        const sub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
          setMag(Math.sqrt(x * x + y * y + z * z));
        });
        accelSubRef.current = sub;
      } catch {
        // ignore preview if sensor not available
      }
    })();

    return () => {
      try {
        accelSubRef.current?.remove?.();
      } catch {}
      accelSubRef.current = null;
    };
  }, []);

  // Ensure stream stops if we leave the screen
  useEffect(() => {
    return () => {
      try {
        streamRef.current?.stop?.();
      } catch {}
      streamRef.current = null;
    };
  }, []);

  if (!eventId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", marginBottom: 12 }}>No event selected.</Text>
        <Button title="Scan event" onPress={() => router.replace("/scan")} />
      </View>
    );
  }

  const start = () => {
    if (running) return;

    if (Platform.OS === "web") {
      Alert.alert("Web preview", "Motion streaming runs on a real device. Use Android/iOS app.");
      return;
    }

    // Sends a sample every ~1s; adjust interval as needed
    streamRef.current = startMotionStream(eventId, 1000);
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

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>Event</Text>
      <Text style={{ color: "#0f0" }}>{eventId}</Text>

      <Text style={{ color: "#fff", marginTop: 16 }}>
        Live magnitude: {mag.toFixed(2)}
        {Platform.OS === "web" ? " (web preview)" : ""}
      </Text>

      <Button title={running ? "Stop Movement" : "Start Movement"} onPress={running ? stop : start} />
      <View style={{ height: 8 }} />
      <Button title="Re-scan event" onPress={() => router.replace("/scan")} />
    </View>
  );
}
