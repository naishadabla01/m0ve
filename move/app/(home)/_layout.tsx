// app/(home)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#e5e7eb",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#0a0a0a" },
        animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
      }}
    >
      {/* ✅ Home screen - NO back button */}
      <Stack.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,  // ← This removes the entire header including back button
        }}
      />

      {/* ✅ Events list screen */}
      <Stack.Screen
        name="events/index"
        options={{
          title: "All Events",
          headerBackTitle: "Back",
        }}
      />

      {/* ✅ NEW: Leaderboard screen */}
      <Stack.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}