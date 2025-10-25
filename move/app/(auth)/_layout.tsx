// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        // ✅ CRITICAL: Hide header for all auth screens (removes white bar)
        headerShown: false,
        
        // 🎨 Match your dark theme
        contentStyle: { 
          backgroundColor: "#0a0a0a" 
        },
        
        // 🎨 Smooth transitions
        animation: Platform.select({
          ios: "slide_from_right",
          android: "fade_from_bottom",
          default: "fade",
        }),
        
        // 🎨 Disable gestures on auth screens (prevent accidental navigation)
        gestureEnabled: false,
      }}
    >
      {/* SIGN IN SCREEN */}
      <Stack.Screen
        name="signin"
        options={{
          title: "Sign In",
          headerShown: false, // Extra safety
        }}
      />

      {/* SIGN UP SCREEN */}
      <Stack.Screen
        name="signup"
        options={{
          title: "Sign Up",
          headerShown: false, // Extra safety
        }}
      />
    </Stack>
  );
}