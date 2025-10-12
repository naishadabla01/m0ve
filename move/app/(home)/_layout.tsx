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
      <Stack.Screen
        name="index"
        options={{ title: "Home" }}
      />
    </Stack>
  );
}
