// app/_layout.tsx
import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Stack, router, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { IncomingCallModalWrapper } from "@components/IncomingCallModalWrapper";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();

  // Monitor auth state
  useEffect(() => {
    const initAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsReady(true);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onWelcomeScreens = segments[0] === "index" || segments[0] === "welcome";

    if (!session && !inAuthGroup && !onWelcomeScreens) {
      // Not logged in and not on welcome/auth screens, redirect to welcome
      router.replace("/");
    } else if (session && (inAuthGroup || onWelcomeScreens)) {
      // Logged in but on auth/welcome screen, redirect to home
      router.replace("/(home)");
    }
  }, [session, segments, isReady]);

  // Show loading screen while initializing
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0a0a0a" },
          }}
        >
          <Stack.Screen name="index" />
        </Stack>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0a0a0a" },
          animation: "fade",
          // Prevent back gesture when logged in to avoid accidental logout
          gestureEnabled: !session,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: "fade",
            gestureEnabled: false, // Never allow back gesture on splash
          }}
        />
        <Stack.Screen
          name="welcome"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            gestureEnabled: !session, // Only allow back when not logged in
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            gestureEnabled: !session, // Only allow back when not logged in
          }}
        />
        <Stack.Screen
          name="(home)"
          options={{
            headerShown: false,
            gestureEnabled: false, // Never allow back gesture from home (must sign out explicitly)
          }}
        />
        <Stack.Screen
          name="move"
          options={{
            headerShown: false,
            gestureEnabled: true, // Allow back to home
          }}
        />
        <Stack.Screen
          name="scan"
          options={{
            headerShown: false,
            gestureEnabled: true, // Allow back to previous screen
          }}
        />
        <Stack.Screen
          name="event-details"
          options={{
            headerShown: false,
            gestureEnabled: true, // Allow back to home
          }}
        />
        <Stack.Screen
          name="leaderboard"
          options={{
            headerShown: false,
            gestureEnabled: true, // Allow back to previous screen
          }}
        />
        <Stack.Screen
          name="final-leaderboard"
          options={{
            headerShown: false,
            gestureEnabled: true, // Allow back to home
          }}
        />
        {Platform.OS !== 'web' && (
          <Stack.Screen
            name="call"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              gestureEnabled: false, // Don't allow back during call
            }}
          />
        )}
      </Stack>

      {/* Global Incoming Call Modal - Only render when user is logged in */}
      {session && <IncomingCallModalWrapper />}
    </SafeAreaProvider>
  );
}