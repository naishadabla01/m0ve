// components/home/LogoutCard.tsx
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text } from "react-native";
import SectionCard from "./SectionCard";

export default function LogoutCard() {
  const onLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/"); // back to your main Move screen
  };

  return (
    <SectionCard title="Need a break?" subtitle="You can log out anytime.">
      <Pressable
        onPress={onLogout}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#991b1b" : "#ef4444",
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: "center",
        })}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Log out</Text>
      </Pressable>
    </SectionCard>
  );
}
