// src/components/home/JoinEventCard.tsx
import { apiBase } from "@/lib/apiBase"; // ✅ correct named export
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import { Button, Platform, Text, TextInput, View } from "react-native";

export default function JoinEventCard() {
  const [tab, setTab] = useState<"scan" | "code">("scan");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const API_BASE = useMemo(() => apiBase(), []);

  console.log("apiBase =", apiBase()); // should print http://localhost:3000 on web


  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setCode(text.trim());
    } catch {}
  };

  const join = async () => {
    setErr(null);
    setOk(null);

    try {
      if (!code.trim()) {
        setErr("Enter a code or paste a QR link.");
        return;
      }

      setBusy(true);

      // Accept full QR/URL or just the 6-char code
      let joinCode = code.trim();
      try {
        const u = new URL(joinCode);
        // e.g. .../leaderboard?code=XXXXXX
        const q = u.searchParams.get("code");
        if (q) joinCode = q;
      } catch {
        // not a URL, treat as code
      }

      // Get current user id for join
      const { data: auth } = await (await import("@/lib/supabase/client")).supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setErr("You need to sign in first.");
        return;
      }

      // *** THIS is the important part: always hit the DASHBOARD base, not the Expo origin ***
      const url = `${API_BASE}/api/join?code=${encodeURIComponent(
        joinCode
      )}&user_id=${encodeURIComponent(userId)}`;

      const r = await fetch(url, { method: "GET" });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        setErr(`join failed (${r.status})${text ? `: ${text}` : ""}`);
        return;
      }

      // Expect JSON { ok: true, event_id: ... }
      const j = await r.json().catch(() => null);
      if (!j?.ok || !j?.event_id) {
        setErr("Unexpected response from server.");
        return;
      }

      // Persist event for /move screen
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        await AsyncStorage.setItem("event_id", String(j.event_id));
      } catch {}

      setOk("Joined!");
      if (Platform.OS !== "web") {
        // Navigate to /move only on device (web keeps preview)
        const { router } = await import("expo-router");
        router.push({ pathname: "/move", params: { event_id: j.event_id } });
      }
    } catch (e: any) {
      setErr(e?.message || "join failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#0b1920",
        borderColor: "#11212b",
        borderWidth: 1,
        padding: 16,
        borderRadius: 16,
        gap: 12,
      }}
    >
      <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "700" }}>
        Scan / Join Event
      </Text>
      <Text style={{ color: "#9ca3af" }}>Scan a QR or enter a code / URL to join.</Text>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button
            title="Scan"
            onPress={() => setTab("scan")}
            color={tab === "scan" ? "#0ea5e9" : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Enter code"
            onPress={() => setTab("code")}
            color={tab === "code" ? "#0ea5e9" : undefined}
          />
        </View>
      </View>

      {/* Body */}
      {tab === "scan" ? (
        <View
          style={{
            height: 120,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#123",
            backgroundColor: "#071219",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#9ca3af" }}>
            {Platform.OS === "web"
              ? "Scanner available in native build. Use code/URL."
              : "Scanner here (dev build needed)."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="JRYBJB or url…"
            placeholderTextColor="#70808d"
            autoCapitalize="none"
            style={{
              backgroundColor: "#071219",
              borderColor: "#123",
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              color: "#e5e7eb",
            }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 0 }}>
              <Button title="PASTE" onPress={paste} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ flex: 0 }}>
              <Button title={busy ? "…" : "JOIN"} onPress={join} />
            </View>
          </View>

          {err && <Text style={{ color: "#ef4444" }}>{err}</Text>}
          {ok && <Text style={{ color: "#10b981" }}>{ok}</Text>}
        </View>
      )}
    </View>
  );
}
