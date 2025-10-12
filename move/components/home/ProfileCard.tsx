// components/home/ProfileCard.tsx
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import SectionCard from "./SectionCard";

export default function ProfileCard() {
  const [profile, setProfile] = useState<{
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, email")
        .eq("user_id", uid)
        .maybeSingle();
      if (mounted) setProfile(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Your profile";

  return (
    <SectionCard title="My Profile" subtitle="Basic account info">
      <View style={{ gap: 6 }}>
        <Text style={{ color: "#e5e7eb", fontWeight: "600" }}>{name}</Text>
        {!!profile?.email && (
          <Text style={{ color: "#9ca3af", fontSize: 12 }}>{profile.email}</Text>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/scan")} // or route to a dedicated profile screen later
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#111827" : "transparent",
          borderWidth: 1,
          borderColor: "#1f2937",
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: "center",
          marginTop: 8,
        })}
      >
        <Text style={{ color: "#e5e7eb", fontWeight: "600" }}>Edit / View</Text>
      </Pressable>
    </SectionCard>
  );
}
