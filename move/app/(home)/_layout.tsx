// app/(home)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        // ✅ MAIN FIX: Hide header by default (removes white bar)
        headerShown: false,
        
        // 🎨 Consistent dark theme
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#22d3ee",
        headerTitleStyle: { 
          fontWeight: "700",
          fontSize: 18,
        },
        contentStyle: { backgroundColor: "#0a0a0a" },
        
        // 🎨 Smooth animations for all platforms
        animation: Platform.select({
          ios: "slide_from_right",
          android: "slide_from_right",
          default: "slide_from_right",
        }),
        
        // 🎨 Gesture navigation
        gestureEnabled: true,
        gestureDirection: "horizontal",
        
        // 🎨 iOS-specific optimizations
        ...(Platform.OS === 'ios' && {
          presentation: "card",
        }),
        
        // 🎨 Remove header shadow
        headerShadowVisible: false,
      }}
    >
      {/* HOME SCREEN */}
      <Stack.Screen
        name="index"
        options={{
          title: "Move",
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* EVENTS LIST */}
      <Stack.Screen
        name="events"
        options={{
          title: "All Events",
          headerShown: true,
          headerBackTitle: "Home",
          animation: "slide_from_bottom",
        }}
      />

      {/* PROFILE */}
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      {/* LEADERBOARD */}
      <Stack.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          headerShown: true,
          headerBackTitle: "Back",
          animation: "fade",
        }}
      />
    </Stack>
  );
}