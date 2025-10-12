// app/(home)/index.tsx
import { supabase } from "@/lib/supabase/client";
import JoinEventCard from "@components/home/JoinEventCard"; // ⬅️ NEW
import LogoutCard from "@components/home/LogoutCard";
import OngoingEventsCard from "@components/home/OngoingEventsCard";
import ProfileCard from "@components/home/ProfileCard";
import React, { useEffect, useState } from "react";
import { Platform, SafeAreaView, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState<string>("");

    // app/(home)/index.tsx — add near the top of the component
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) router.replace("/(auth)/signin");
  });
  return () => sub.subscription.unsubscribe();
}, []);


  // app/(home)/index.tsx  — replace your useEffect entirely
useEffect(() => {
  let isMounted = true;

  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // no valid session -> go sign in
      router.replace("/(auth)/signin");
      return;
    }

    const uid = session.user.id;
    if (!uid || !isMounted) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name, first_name, last_name")
      .eq("user_id", uid)
      .maybeSingle();

    if (!isMounted) return;

    setDisplayName(
      (data?.display_name ||
        [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
        "Mover") as string
    );
  })();

  return () => { isMounted = false; };
}, []);


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* Glows */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 240,
            height: 240,
            borderRadius: 9999,
            backgroundColor: "#10b981",
            opacity: 0.14,
            filter: Platform.OS === "web" ? "blur(60px)" : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -90,
            left: -70,
            width: 280,
            height: 280,
            borderRadius: 9999,
            backgroundColor: "#22d3ee",
            opacity: 0.10,
            filter: Platform.OS === "web" ? "blur(70px)" : undefined,
          }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 16 }}>
        {/* Header */}
        <View style={{ gap: 6, marginBottom: 6 }}>
          <Text style={{ color: "#9ca3af", fontSize: 12, letterSpacing: 1 }}>
            WELCOME TO
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "#10b981",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#0a0a0a", fontWeight: "800" }}>M</Text>
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "800",
                letterSpacing: 0.3,
              }}
            >
              Move
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: "#e5e7eb",
            fontSize: 20,
            fontWeight: "700",
            marginTop: 4,
            marginBottom: 2,
          }}
        >
          Hey {displayName} 👋
        </Text>
        <Text style={{ color: "#9ca3af", marginBottom: 8 }}>
          Here’s what’s happening right now.
        </Text>

        {/* NEW: Scan/Join card at the top */}
        <JoinEventCard />

        {/* Existing sections */}
        <OngoingEventsCard />
        <ProfileCard />
        <LogoutCard />
      </ScrollView>
    </SafeAreaView>
  );
}
