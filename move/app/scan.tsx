// app/scan.tsx
import { joinEvent } from "@/lib/join";
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";


import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ScanScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Pre-fill from ?code=XXXX (works with our short links /e/CODE)
  useEffect(() => {
    if (typeof codeParam === "string" && codeParam.trim()) {
      setValue(codeParam.trim().toUpperCase());
    }
  }, [codeParam]);

  useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUserId(data.user?.id ?? null);
    } catch {
      if (mounted) setUserId(null);
    }
  })();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    setUserId(session?.user?.id ?? null);
  });

  return () => {
    mounted = false;
    sub?.subscription.unsubscribe();
  };
}, []);

const handleJoin = async () => {
  const input = value.trim();
  if (!input) {
    setErr("Enter a 6-char code or an event UUID.");
    return;
  }
  if (!userId) {
    setErr("Sign in first to join an event.");
    return;
  }

  setErr(null);
  setBusy(true);

  try {
    let code: string | undefined;
    let eventId: string | undefined;

    // If user pasted a URL, extract ?code / ?event_id
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input);
      code = u.searchParams.get("code") ?? undefined;
      eventId = u.searchParams.get("event_id") ?? undefined;
    } else if (/^[A-Za-z0-9]{6}$/.test(input)) {
      code = input.toUpperCase();
    } else if (/^[0-9a-fA-F-]{36}$/.test(input)) {
      eventId = input;
    } else {
      setErr("Enter a 6-char code or a valid event UUID.");
      return;
    }

    const r = await joinEvent({ code, eventId, userId });
    if (!r.ok) throw new Error(r.error);

    const joinedEventId = r.event_id ?? eventId;
if (!joinedEventId) {
  throw new Error("Joined but no event_id returned.");
}

// Go to the in-app movement screen
    router.replace({ pathname: "/move", params: { event_id: joinedEventId } });
    // TODO: navigate or toast (example)
    // router.push(`/leaderboard?event_id=${r.event_id ?? eventId}`);
  } catch (e: any) {
    setErr(e?.message || "Join failed.");
    console.error("join failed:", e);
  } finally {
    setBusy(false);
  }
};



  return (
    <View style={{ flex: 1, backgroundColor: "#000", padding: 20 }}>
      <Text style={{ color: "#fff", fontSize: 20, marginBottom: 16 }}>Scan / Enter Event</Text>
      <Text style={{ color: "#9ca3af", marginBottom: 12 }}>
        Paste a QR link (…/leaderboard?code=XXXXXX), a 6-char code, or the event UUID.
      </Text>

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="JRYBJB or uuid…"
        placeholderTextColor="#6b7280"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{
          backgroundColor: "#111827",
          color: "#e5e7eb",
          borderColor: "#374151",
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 14 : 10,
          marginBottom: 14,
        }}
      />

      {!!err && (
        <Text style={{ color: "#fca5a5", marginBottom: 12 }}>
          {err}
        </Text>
      )}

      <TouchableOpacity
        onPress={handleJoin}
        disabled={busy}
        style={{
          backgroundColor: busy ? "#2563eb88" : "#2563eb",
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>{busy ? "Joining…" : "JOIN"}</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />

      <Text style={{ color: "#9ca3af" }}>
        Tip: on web / Expo Go we’re using the text field. We’ll enable camera scanning after we make a
        custom dev build.
      </Text>
    </View>
  );
}
