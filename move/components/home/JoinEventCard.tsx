// components/home/JoinEventCard.tsx
import { apiBase } from "@/lib/apiBase";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

export default function JoinEventCard() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const API_BASE = useMemo(() => apiBase(), []);

  const join = async () => {
    setErr(null);

    try {
      if (!code.trim()) {
        setErr("Please enter an event code");
        return;
      }

      setBusy(true);

      // Accept full QR/URL or just the 6-char code
      let joinCode = code.trim();
      try {
        const u = new URL(joinCode);
        const q = u.searchParams.get("code");
        if (q) joinCode = q;
      } catch {
        // not a URL, treat as code
      }

      // Get current user
      const { data: auth } = await (await import("@/lib/supabase/client")).supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setErr("Please sign in first");
        return;
      }

      const url = `${API_BASE}/api/join?code=${encodeURIComponent(
        joinCode
      )}&user_id=${encodeURIComponent(userId)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const r = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!r.ok) {
          if (r.status === 404) {
            setErr(`Event code "${joinCode}" not found`);
          } else {
            setErr(`Join failed (${r.status})`);
          }
          return;
        }

        const j = await r.json().catch(() => null);
        if (!j?.ok || !j?.event_id) {
          setErr("Unexpected response");
          return;
        }

        // Save event
        try {
          const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
          await AsyncStorage.setItem("event_id", String(j.event_id));
        } catch (e) {
          console.error("Failed to save event_id:", e);
        }

        setCode("");
        setShowCodeInput(false);

        // Navigate to movement screen
        setTimeout(() => {
          if (Platform.OS !== "web") {
            router.push({ pathname: "/move", params: { event_id: j.event_id } });
          }
        }, 300);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          setErr("Connection timeout");
        } else {
          throw fetchError;
        }
      }
    } catch (e: any) {
      console.error("Join error:", e);
      setErr(e?.message || "Join failed");
    } finally {
      setBusy(false);
    }
  };

  const handleScan = () => {
    router.push("/scan");
  };

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text.trim()) {
        setCode(text.trim());
        setErr(null);
      }
    } catch (e) {
      console.error("Paste failed:", e);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#0b1920",
        borderColor: "#1a2e3a",
        borderWidth: 1,
        padding: 16,
        borderRadius: 14,
        gap: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 18 }}>🎫</Text>
        <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "700" }}>
          Join Event
        </Text>
      </View>

      {/* Primary Action: Scan QR */}
      <Pressable
        onPress={handleScan}
        disabled={busy}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#0d9488" : "#10b981",
          paddingVertical: 14,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          shadowColor: "#10b981",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        })}
      >
        <Text style={{ fontSize: 18 }}>📷</Text>
        <Text
          style={{
            color: "#000",
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          Scan QR Code
        </Text>
      </Pressable>

      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: "#1f2937" }} />
        <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "600" }}>
          OR
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "#1f2937" }} />
      </View>

      {/* Toggle Code Input */}
      {!showCodeInput ? (
        <Pressable
          onPress={() => setShowCodeInput(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#0b1b25" : "#0a1926",
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1f2937",
          })}
        >
          <Text style={{ color: "#22d3ee", fontSize: 14, fontWeight: "600" }}>
            Enter Event Code
          </Text>
        </Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          {/* Code Input */}
          <TextInput
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setErr(null);
            }}
            placeholder="ABC123"
            placeholderTextColor="#4b5563"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            style={{
              backgroundColor: "#060f14",
              borderColor: err ? "#dc2626" : "#1f2937",
              borderWidth: 1.5,
              borderRadius: 8,
              padding: 12,
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: "500",
              letterSpacing: 1,
            }}
          />

          {/* Paste + Join Row */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={paste}
              disabled={busy}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? "#1f2937" : "#111827",
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#374151",
              })}
            >
              <Text style={{ color: "#9ca3af", fontSize: 13, fontWeight: "600" }}>
                📋 Paste
              </Text>
            </Pressable>

            <Pressable
              onPress={join}
              disabled={busy || !code.trim()}
              style={({ pressed }) => ({
                flex: 2,
                backgroundColor:
                  busy || !code.trim()
                    ? "#374151"
                    : pressed
                    ? "#0d9488"
                    : "#10b981",
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  color: busy || !code.trim() ? "#9ca3af" : "#000",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {busy ? "Joining..." : "Join"}
              </Text>
            </Pressable>
          </View>

          {/* Cancel Button */}
          <Pressable
            onPress={() => {
              setShowCodeInput(false);
              setCode("");
              setErr(null);
            }}
            style={({ pressed }) => ({
              paddingVertical: 8,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#6b7280", fontSize: 12 }}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Error Message */}
      {err && (
        <View
          style={{
            backgroundColor: "#7f1d1d",
            padding: 10,
            borderRadius: 6,
            borderLeftWidth: 3,
            borderLeftColor: "#dc2626",
          }}
        >
          <Text style={{ color: "#fca5a5", fontSize: 12 }}>{err}</Text>
        </View>
      )}
    </View>
  );
}