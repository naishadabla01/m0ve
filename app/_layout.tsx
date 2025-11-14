// app/_layout.tsx
import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Stack, router, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();

  // Monitor auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

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

    if (!session && !inAuthGroup) {
      // Not logged in, redirect to sign in
      router.replace("/(auth)/signin");
    } else if (session && inAuthGroup) {
      // Logged in but on auth screen, redirect to home
      router.replace("/(home)");
    }
  }, [session, segments, isReady]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0a0a0a" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(home)" options={{ headerShown: false }} />
      <Stack.Screen name="move" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
    </Stack>
  );
}