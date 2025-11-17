// app/_layout.tsx
import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Stack, router, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { IncomingCallModal } from "@components/IncomingCallModal";

// 🚀 DEV MODE - Set to true to bypass login
const DEV_MODE = true;

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();

  // Monitor auth state
  useEffect(() => {
    const initAuth = async () => {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      // DEV MODE: Auto-login if no session
      if (DEV_MODE && !session) {
        try {
          const DEV_EMAIL = "dev@m0ve.app";
          const DEV_PASSWORD = "dev123456";

          // Try to sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
          });

          if (signInError) {
            // User doesn't exist, create it
            await supabase.auth.signUp({
              email: DEV_EMAIL,
              password: DEV_PASSWORD,
            });

            // Sign in again
            const { data: retryData } = await supabase.auth.signInWithPassword({
              email: DEV_EMAIL,
              password: DEV_PASSWORD,
            });

            setSession(retryData.session);
          } else {
            setSession(signInData.session);
          }
        } catch (e) {
          console.error("Dev auto-login failed:", e);
          setSession(session);
        }
      } else {
        setSession(session);
      }

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
    const inHomeGroup = segments[0] === "(home)";

    // DEV MODE: Only redirect from welcome/auth screens to home
    if (DEV_MODE && session && (onWelcomeScreens || inAuthGroup)) {
      router.replace("/(home)");
      return;
    }

    // Regular auth flow (not dev mode specific)
    if (!session && !inAuthGroup && !onWelcomeScreens) {
      // Not logged in and not on welcome screens, redirect to home (splash screen)
      router.replace("/");
    } else if (session && inAuthGroup) {
      // Logged in but on auth screen, redirect to home
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
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
        <Stack.Screen name="move" options={{ headerShown: false }} />
        <Stack.Screen name="scan" options={{ headerShown: false }} />
        <Stack.Screen name="event-details" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      </Stack>

      {/* Global Incoming Call Modal - Shows on all screens */}
      <IncomingCallModal />
    </SafeAreaProvider>
  );
}