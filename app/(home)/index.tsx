// app/(home)/index.tsx - iOS 26 Redesigned Home Page
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

const { width } = Dimensions.get("window");

interface Event {
  event_id: string;
  name: string;
  title: string;
  venue: string;
  location: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
}

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);

  // Auth state monitoring
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/(auth)/signin");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load user data and events
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/(auth)/signin");
        return;
      }

      const uid = session.user.id;
      if (!uid || !isMounted) return;

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (isMounted && profile) {
        setDisplayName(
          (profile.display_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Mover") as string
        );
      }

      // Load events
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);

      if (isMounted && events) {
        const now = new Date();
        const ongoing = events.filter(e => e.status === 'live' || (e.started_at && !e.ended_at));
        const past = events.filter(e => e.status === 'ended' || e.ended_at);

        setOngoingEvents(ongoing);
        setPastEvents(past);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      {/* Animated Background Blobs */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 240,
            height: 240,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.light,
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
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.pink.light,
            opacity: 0.1,
            filter: Platform.OS === "web" ? "blur(70px)" : undefined,
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing['2xl'],
          paddingTop: Spacing['2xl'],
          paddingBottom: 120, // Space for tab bar
          gap: Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo - Top Center */}
        <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: Spacing['2xl'],
              paddingVertical: Spacing.md,
              borderRadius: BorderRadius.xl,
              ...Shadows.xl,
            }}
          >
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size['5xl'],
                fontWeight: Typography.weight.extrabold,
                letterSpacing: 2,
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
            >
              m0ve
            </Text>
          </LinearGradient>
        </View>

        {/* Welcome Message */}
        <View>
          <Text
            style={{
              color: Colors.text.secondary,
              fontSize: Typography.size['2xl'],
              fontWeight: Typography.weight.bold,
            }}
          >
            Hey {displayName} 👋
          </Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              marginTop: Spacing.xs,
            }}
          >
            Here's what's happening right now
          </Text>
        </View>

        {/* Active Event Modal - Conditional */}
        {activeEvent && (
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing.xl,
              ...Shadows.xl,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    letterSpacing: 1.5,
                    marginBottom: Spacing.xs,
                  }}
                >
                  ACTIVE EVENT
                </Text>
                <Text
                  style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.xl,
                    fontWeight: Typography.weight.bold,
                  }}
                >
                  {activeEvent.title || activeEvent.name}
                </Text>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.sm,
                    marginTop: Spacing.xs,
                  }}
                >
                  {activeEvent.venue}
                </Text>
              </View>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.status.live,
                  ...Shadows.md,
                }}
              />
            </View>

            <LinearGradient
              colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.lg,
                alignItems: "center",
                marginTop: Spacing.md,
                ...Shadows.md,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontWeight: Typography.weight.bold,
                  fontSize: Typography.size.base,
                }}
              >
                View Details
              </Text>
            </LinearGradient>
          </LinearGradient>
        )}

        {/* Ongoing Events Component */}
        <OngoingEventsComponent events={ongoingEvents} />

        {/* Past Events Component */}
        <PastEventsComponent events={pastEvents} />

        {/* Quick Actions */}
        <QuickActionsComponent />
      </ScrollView>
    </SafeAreaView>
  );
}

// Ongoing Events Carousel Component
function OngoingEventsComponent({ events }: { events: Event[] }) {
  return (
    <LinearGradient
      colors={Gradients.glass.dark}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.xl,
        ...Shadows.lg,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg }}>
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size.xl,
            fontWeight: Typography.weight.bold,
          }}
        >
          Ongoing Events
        </Text>
        <Pressable onPress={() => router.push("/(home)/events")}>
          {({ pressed }) => (
            <Text
              style={{
                color: Colors.accent.purple.light,
                fontSize: Typography.size.sm,
                fontWeight: Typography.weight.semibold,
                opacity: pressed ? 0.7 : 1,
              }}
            >
              Show All →
            </Text>
          )}
        </Pressable>
      </View>

      {events.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md }}
        >
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎉</Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              textAlign: "center",
            }}
          >
            No ongoing events right now
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

// Past Events Component
function PastEventsComponent({ events }: { events: Event[] }) {
  return (
    <LinearGradient
      colors={Gradients.glass.dark}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.xl,
        ...Shadows.lg,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg }}>
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size.xl,
            fontWeight: Typography.weight.bold,
          }}
        >
          Past Events
        </Text>
        <Pressable onPress={() => router.push("/(home)/events")}>
          {({ pressed }) => (
            <Text
              style={{
                color: Colors.accent.purple.light,
                fontSize: Typography.size.sm,
                fontWeight: Typography.weight.semibold,
                opacity: pressed ? 0.7 : 1,
              }}
            >
              Show All →
            </Text>
          )}
        </Pressable>
      </View>

      {events.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md }}
        >
          {events.slice(0, 8).map((event) => (
            <EventCard key={event.event_id} event={event} isPast />
          ))}
        </ScrollView>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📅</Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              textAlign: "center",
            }}
          >
            No past events yet
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

// Event Card (Spotify-style)
function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        // Navigate to event details
      }}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={Gradients.glass.medium}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: width * 0.7,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border.glass,
            padding: Spacing.lg,
            opacity: pressed ? 0.8 : isPast ? 0.7 : 1,
            ...Shadows.md,
          }}
        >
          {/* Event Icon/Image Placeholder */}
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              height: 120,
              borderRadius: BorderRadius.lg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.md,
              ...Shadows.md,
            }}
          >
            <Text style={{ fontSize: 48 }}>🎵</Text>
          </LinearGradient>

          <Text
            numberOfLines={1}
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size.lg,
              fontWeight: Typography.weight.bold,
              marginBottom: Spacing.xs,
            }}
          >
            {event.title || event.name}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.sm,
              marginBottom: Spacing.sm,
            }}
          >
            {event.venue}
          </Text>

          {event.status === 'live' && !isPast && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.status.live,
                }}
              />
              <Text
                style={{
                  color: Colors.status.live,
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.semibold,
                }}
              >
                LIVE NOW
              </Text>
            </View>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

// Quick Actions Component
function QuickActionsComponent() {
  return (
    <View style={{ gap: Spacing.md }}>
      <Pressable onPress={() => router.push("/join")}>
        {({ pressed }) => (
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.xl,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
              ...Shadows.lg,
            }}
          >
            <Text
              style={{
                color: Colors.text.primary,
                fontWeight: Typography.weight.bold,
                fontSize: Typography.size.lg,
              }}
            >
              🎫 Join an Event
            </Text>
          </LinearGradient>
        )}
      </Pressable>

      <Pressable onPress={() => router.push("/scan")}>
        {({ pressed }) => (
          <LinearGradient
            colors={Gradients.glass.light}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: Spacing.lg,
              borderRadius: BorderRadius.xl,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.border.glass,
              opacity: pressed ? 0.8 : 1,
              ...Shadows.md,
            }}
          >
            <Text
              style={{
                color: Colors.text.secondary,
                fontWeight: Typography.weight.semibold,
                fontSize: Typography.size.lg,
              }}
            >
              📱 Scan QR Code
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}
