// app/(home)/index.tsx - iOS 26 Redesigned Home Page
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Dimensions,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

const { width } = Dimensions.get("window");

interface Event {
  event_id: string;
  artist_id: string;
  name: string | null;
  title?: string | null;
  short_code?: string | null;
  venue?: string | null;
  location?: string | null;
  start_at: string | null;
  end_at: string | null;
  ended_at: string | null;
  status: string | null;
}

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [eventCode, setEventCode] = useState("");

  // Animation for logo pulse effect
  const logoPulseAnim = useRef(new Animated.Value(1)).current;

  // Logo pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

      // Load events from database (created by artists via move-dashboard-deploy)
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("event_id, artist_id, name, title, short_code, venue, location, start_at, end_at, ended_at, status")
        .order("start_at", { ascending: false })
        .limit(20);

      if (isMounted && events) {
        const now = new Date();

        // Ongoing events: live or upcoming events that haven't ended
        const ongoing = events.filter(e =>
          (e.status === 'live' || e.status === 'upcoming' || (!e.status && e.start_at && !e.ended_at)) &&
          !e.ended_at
        );

        // Past events: events that have ended
        const past = events.filter(e =>
          e.status === 'ended' || e.ended_at
        );

        setOngoingEvents(ongoing);
        setPastEvents(past);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
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
        <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
          {/* Small "m" logo above */}
          <View style={{ marginBottom: Spacing.xs }}>
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: BorderRadius.md,
                alignItems: "center",
                justifyContent: "center",
                ...Shadows.md,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: 18,
                  fontWeight: Typography.weight.extrabold,
                }}
              >
                m
              </Text>
            </LinearGradient>
          </View>

          {/* Main logo with flowing gradient background */}
          <Animated.View
            style={{
              borderRadius: BorderRadius.xl,
              overflow: 'hidden',
              transform: [{ scale: logoPulseAnim }],
              ...Shadows.lg,
            }}
          >
            <LinearGradient
              colors={[
                Colors.accent.purple.DEFAULT,
                Colors.accent.pink.light,
                Colors.accent.purple.light,
                Colors.accent.pink.DEFAULT,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: Spacing.xl,
                paddingVertical: Spacing.md,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size['5xl'],
                  fontWeight: Typography.weight.extrabold,
                  letterSpacing: 3,
                  textAlign: "center",
                  textShadowColor: 'rgba(0, 0, 0, 0.3)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                }}
              >
                m0ve
              </Text>
            </LinearGradient>
          </Animated.View>
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
              fontSize: Typography.size.sm,
              marginTop: Spacing.xs,
            }}
          >
            Join an event below by scanning a QR code or entering an event code
          </Text>
        </View>

        {/* Join an Event Button */}
        <Pressable onPress={() => setShowJoinModal(true)}>
          {({ pressed }) => (
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: Spacing.lg,
                borderRadius: BorderRadius.xl,
                alignItems: "center",
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                opacity: pressed ? 0.8 : 1,
                ...Shadows.md,
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
      </ScrollView>

      {/* Floating QR Scan Button */}
      <Pressable
        onPress={() => router.push("/scan")}
        style={{
          position: "absolute",
          bottom: 100, // Above tab bar
          right: Spacing.xl,
          width: 64,
          height: 64,
          borderRadius: BorderRadius.full,
          ...Shadows.xl,
        }}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: BorderRadius.full,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            }}
          >
            <Text style={{ fontSize: 32 }}>📷</Text>
          </LinearGradient>
        )}
      </Pressable>

      {/* Join Event Modal */}
      <JoinEventModal
        visible={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setShowCodeInput(false);
          setEventCode("");
        }}
        showCodeInput={showCodeInput}
        setShowCodeInput={setShowCodeInput}
        eventCode={eventCode}
        setEventCode={setEventCode}
        liveEvents={ongoingEvents.filter(e => e.status === 'live')}
      />
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
            {event.name || event.title || event.short_code || 'Untitled Event'}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.sm,
              marginBottom: Spacing.sm,
            }}
          >
            {event.venue || event.location || 'Location TBA'}
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

// Join Event Modal Component
function JoinEventModal({
  visible,
  onClose,
  showCodeInput,
  setShowCodeInput,
  eventCode,
  setEventCode,
  liveEvents,
}: {
  visible: boolean;
  onClose: () => void;
  showCodeInput: boolean;
  setShowCodeInput: (show: boolean) => void;
  eventCode: string;
  setEventCode: (code: string) => void;
  liveEvents: Event[];
}) {
  const handleJoinWithCode = () => {
    if (eventCode.trim()) {
      // TODO: Implement join event logic
      console.log("Joining event with code:", eventCode);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onClose}
      >
        <Pressable
          style={{ width: "90%", maxWidth: 500 }}
          onPress={(e) => e.stopPropagation()}
        >
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
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl }}>
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size['2xl'],
                  fontWeight: Typography.weight.bold,
                }}
              >
                Join an Event
              </Text>
              <Pressable onPress={onClose}>
                <Text style={{ color: Colors.text.muted, fontSize: 28 }}>×</Text>
              </Pressable>
            </View>

            {/* Scan QR Code Button */}
            <Pressable onPress={() => { onClose(); router.push("/scan"); }}>
              {({ pressed }) => (
                <LinearGradient
                  colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: Spacing.lg,
                    borderRadius: BorderRadius.lg,
                    alignItems: "center",
                    marginBottom: Spacing.md,
                    opacity: pressed ? 0.9 : 1,
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
                    📷 Scan QR Code
                  </Text>
                </LinearGradient>
              )}
            </Pressable>

            {/* Enter Code Button */}
            {!showCodeInput ? (
              <Pressable onPress={() => setShowCodeInput(true)}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={Gradients.glass.light}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: Spacing.lg,
                      borderRadius: BorderRadius.lg,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: Colors.border.glass,
                      marginBottom: Spacing.lg,
                      opacity: pressed ? 0.8 : 1,
                      ...Shadows.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.text.secondary,
                        fontWeight: Typography.weight.semibold,
                        fontSize: Typography.size.base,
                      }}
                    >
                      🔑 Enter Event Code
                    </Text>
                  </LinearGradient>
                )}
              </Pressable>
            ) : (
              <View style={{ marginBottom: Spacing.lg }}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                  style={{
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border.glass,
                    marginBottom: Spacing.sm,
                  }}
                >
                  <TextInput
                    value={eventCode}
                    onChangeText={setEventCode}
                    placeholder="Enter event code"
                    placeholderTextColor={Colors.text.muted}
                    style={{
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                    }}
                    autoCapitalize="characters"
                  />
                </LinearGradient>
                <Pressable onPress={handleJoinWithCode}>
                  {({ pressed }) => (
                    <LinearGradient
                      colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: Spacing.md,
                        borderRadius: BorderRadius.lg,
                        alignItems: "center",
                        opacity: pressed ? 0.9 : 1,
                        ...Shadows.md,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.text.primary,
                          fontWeight: Typography.weight.bold,
                          fontSize: Typography.size.sm,
                        }}
                      >
                        Join Event
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            )}

            {/* Live Events Carousel */}
            <View>
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.lg,
                  fontWeight: Typography.weight.bold,
                  marginBottom: Spacing.md,
                }}
              >
                Live Events
              </Text>
              {liveEvents.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.md }}
                >
                  {liveEvents.map((event) => (
                    <LiveEventCard key={event.event_id} event={event} onJoin={onClose} />
                  ))}
                </ScrollView>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: Spacing.xl }}>
                  <Text style={{ fontSize: 32, marginBottom: Spacing.sm }}>🎵</Text>
                  <Text
                    style={{
                      color: Colors.text.muted,
                      fontSize: Typography.size.sm,
                      textAlign: "center",
                    }}
                  >
                    No live events right now
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Live Event Card (Spotify-style for modal)
function LiveEventCard({ event, onJoin }: { event: Event; onJoin: () => void }) {
  const cardWidth = 160;

  return (
    <Pressable
      onPress={() => {
        // TODO: Implement join event logic
        console.log("Joining event:", event.event_id);
        onJoin();
      }}
    >
      {({ pressed }) => (
        <View
          style={{
            width: cardWidth,
            opacity: pressed ? 0.8 : 1,
          }}
        >
          {/* Event Image/Icon */}
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: cardWidth,
              height: cardWidth,
              borderRadius: BorderRadius.lg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.sm,
              ...Shadows.md,
            }}
          >
            <Text style={{ fontSize: 48 }}>🎵</Text>
            {/* Live Indicator */}
            <View
              style={{
                position: "absolute",
                top: Spacing.sm,
                right: Spacing.sm,
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.xs,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                paddingHorizontal: Spacing.sm,
                paddingVertical: 4,
                borderRadius: BorderRadius.md,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.status.live,
                }}
              />
              <Text
                style={{
                  color: Colors.status.live,
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.bold,
                }}
              >
                LIVE
              </Text>
            </View>
          </LinearGradient>

          {/* Event Details */}
          <Text
            numberOfLines={1}
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size.sm,
              fontWeight: Typography.weight.bold,
              marginBottom: 4,
            }}
          >
            {event.name || event.title || event.short_code || 'Untitled Event'}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.xs,
              marginBottom: Spacing.sm,
            }}
          >
            {event.venue || event.location || 'Location TBA'}
          </Text>

          {/* Join Button */}
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: Spacing.sm,
              borderRadius: BorderRadius.md,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.border.glass,
            }}
          >
            <Text
              style={{
                color: Colors.text.primary,
                fontWeight: Typography.weight.semibold,
                fontSize: Typography.size.xs,
              }}
            >
              Join
            </Text>
          </LinearGradient>
        </View>
      )}
    </Pressable>
  );
}
