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
  Image,
  ActivityIndicator,
  PanResponder,
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
  location?: string | null;
  cover_image_url?: string | null;
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
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<Event | null>(null);

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
        .select("event_id, artist_id, name, title, short_code, location, cover_image_url, start_at, end_at, ended_at, status")
        .order("start_at", { ascending: false })
        .limit(20);

      console.log("📊 Fetched events:", events?.length || 0);
      if (eventsError) console.error("❌ Events error:", eventsError);

      if (isMounted && events) {
        const now = new Date();

        // Ongoing events: live, scheduled (future), or started but not ended
        // Status can be: 'scheduled', 'live', 'ended'
        const ongoing = events.filter(e => {
          // Already ended - exclude
          if (e.status === 'ended' || e.ended_at) return false;

          // Live event - include
          if (e.status === 'live') return true;

          // Scheduled event - include
          if (e.status === 'scheduled') return true;

          // No status but has start_at and not ended - include
          if (!e.status && e.start_at && !e.ended_at) return true;

          return false;
        });

        // Past events: events that have ended
        const past = events.filter(e =>
          e.status === 'ended' || e.ended_at
        );

        console.log("✅ Ongoing events:", ongoing.length);
        console.log("🏁 Past events:", past.length);
        console.log("Ongoing:", ongoing.map(e => ({ name: e.name, status: e.status, start_at: e.start_at })));

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
        {/* App Logo - Clean and Simple */}
        <Animated.View style={{ alignItems: "center", marginBottom: Spacing.lg, transform: [{ scale: logoPulseAnim }] }}>
          <Text
            style={{
              fontSize: 64,
              fontWeight: '900',
              letterSpacing: 4,
              textAlign: "center",
              color: Colors.text.primary,
              textShadowColor: Colors.accent.purple.light,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}
          >
            m0ve
          </Text>
        </Animated.View>

        {/* Welcome Message - Artistic */}
        <View style={{ marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.xs }}>
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.xs,
                borderRadius: BorderRadius.full,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.sm,
                  fontWeight: Typography.weight.bold,
                  letterSpacing: 1,
                }}
              >
                WELCOME BACK
              </Text>
            </LinearGradient>
          </View>
          <Text
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size['3xl'],
              fontWeight: Typography.weight.bold,
              lineHeight: 40,
            }}
          >
            Hey {displayName}
            <Text style={{ fontSize: Typography.size['4xl'] }}> 👋</Text>
          </Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              marginTop: Spacing.sm,
              lineHeight: 22,
            }}
          >
            Ready to feel the energy?{'\n'}
            <Text style={{ color: Colors.accent.purple.light, fontWeight: Typography.weight.semibold }}>
              Scan, join, and move.
            </Text>
          </Text>
        </View>

        {/* Join an Event Button - Redesigned */}
        <Pressable onPress={() => setShowJoinModal(true)}>
          {({ pressed }) => (
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: Spacing.xl,
                paddingHorizontal: Spacing.lg,
                borderRadius: BorderRadius['2xl'],
                opacity: pressed ? 0.85 : 1,
                ...Shadows.xl,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: BorderRadius.full,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>✨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.xl,
                      letterSpacing: 0.5,
                    }}
                  >
                    Enter the Experience
                  </Text>
                  <Text
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: Typography.size.xs,
                      marginTop: 2,
                    }}
                  >
                    Scan QR or enter code
                  </Text>
                </View>
                <Text style={{ fontSize: 20, color: Colors.text.primary }}>→</Text>
              </View>
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
                  {activeEvent.location || 'Location TBA'}
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
              colors={[Gradients.purplePink.start, Gradients.purplePink.end] as const}
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
        <OngoingEventsComponent events={ongoingEvents} onShowDetails={setSelectedEventForDetails} />

        {/* Past Events Component */}
        <PastEventsComponent events={pastEvents} onShowDetails={setSelectedEventForDetails} />
      </ScrollView>

      {/* Floating QR Scan Button */}
      {/* Floating QR Scan Button - Modern & Visible */}
      <Pressable
        onPress={() => router.push("/scan")}
        style={{
          position: "absolute",
          bottom: 100,
          right: Spacing.xl,
          ...Shadows.xl,
        }}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: BorderRadius.full,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.background.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: BorderRadius.full,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 32 }}>⊞</Text>
              </LinearGradient>
            </View>
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
      {/* Event Details Modal */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => setSelectedEventForDetails(null)}
        />
      )}
    </SafeAreaView>
  );
}

// Ongoing Events Carousel Component
function OngoingEventsComponent({ events, onShowDetails }: { events: Event[]; onShowDetails: (event: Event) => void }) {
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
        {/* Show All button removed - events folder deleted */}
      </View>

      {events.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md }}
        >
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} onShowDetails={onShowDetails} />
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
function PastEventsComponent({ events, onShowDetails }: { events: Event[]; onShowDetails: (event: Event) => void }) {
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
        {/* Show All button removed - events folder deleted */}
      </View>

      {events.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.md }}
        >
          {events.slice(0, 8).map((event) => (
            <EventCard key={event.event_id} event={event} isPast onShowDetails={onShowDetails} />
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
function EventCard({ event, isPast = false, onShowDetails }: { event: Event; isPast?: boolean; onShowDetails: (event: Event) => void }) {
  return (
    <Pressable
      onPress={() => onShowDetails(event)}
      style={{ width: width * 0.7 }}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={Gradients.glass.medium}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border.glass,
            padding: Spacing.lg,
            opacity: isPast ? 0.7 : pressed ? 0.85 : 1,
            ...Shadows.md,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          }}
        >
        {/* Cover Image or Gradient Placeholder */}
        {event.cover_image_url ? (
          <Image
            source={{ uri: event.cover_image_url }}
            style={{
              width: "100%",
              height: 120,
              borderRadius: BorderRadius.lg,
              marginBottom: Spacing.md,
            }}
            resizeMode="cover"
          />
        ) : (
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
        )}

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
          {event.location || (event.short_code ? `Code: ${event.short_code}` : 'Location TBA')}
        </Text>

        {/* Bottom Row: LIVE indicator and tap indicator */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {event.status === 'live' && !isPast ? (
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
          ) : <View />}

          {/* Tap to view indicator */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.xs,
              paddingHorizontal: Spacing.sm,
            }}
          >
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.xs,
                fontStyle: "italic",
              }}
            >
              Tap to view
            </Text>
            <Text style={{ color: Colors.accent.purple.light, fontSize: 14 }}>→</Text>
          </View>
        </View>
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
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleJoinWithCode = async () => {
    const code = eventCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage("Please enter an event code");
      return;
    }

    setIsJoining(true);
    setErrorMessage("");

    try {
      // Look up event by short_code
      const { data: events, error } = await supabase
        .from("events")
        .select("event_id, name, title, short_code, status")
        .eq("short_code", code)
        .limit(1);

      if (error) {
        console.error("Error finding event:", error);
        setErrorMessage("Failed to find event. Please try again.");
        setIsJoining(false);
        return;
      }

      if (!events || events.length === 0) {
        setErrorMessage(`Event with code "${code}" not found`);
        setIsJoining(false);
        return;
      }

      const event = events[0];

      // Navigate to movement tracker with event_id
      onClose();
      router.push(`/move?event_id=${event.event_id}`);
    } catch (err) {
      console.error("Error joining event:", err);
      setErrorMessage("An unexpected error occurred");
      setIsJoining(false);
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
          <View
            style={{
              backgroundColor: Colors.background.primary,
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: Colors.border.strong,
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
                  colors={[Gradients.purplePink.start, Gradients.purplePink.end] as const}
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
                  colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] as const}
                  style={{
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: Colors.border.glass,
                    marginBottom: Spacing.sm,
                  }}
                >
                  <TextInput
                    value={eventCode}
                    onChangeText={(text) => {
                      setEventCode(text);
                      setErrorMessage(""); // Clear error on input
                    }}
                    placeholder="Enter event code (e.g., JRYBJB)"
                    placeholderTextColor={Colors.text.muted}
                    style={{
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.lg,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                    }}
                    autoCapitalize="characters"
                    editable={!isJoining}
                  />
                </LinearGradient>

                {/* Error Message */}
                {errorMessage && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderLeftWidth: 3,
                      borderLeftColor: '#ef4444',
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.sm,
                      borderRadius: BorderRadius.sm,
                      marginBottom: Spacing.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: '#ef4444',
                        fontSize: Typography.size.sm,
                      }}
                    >
                      {errorMessage}
                    </Text>
                  </View>
                )}

                <Pressable onPress={handleJoinWithCode} disabled={isJoining}>
                  {({ pressed }) => (
                    <LinearGradient
                      colors={[Gradients.purplePink.start, Gradients.purplePink.end] as const}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: Spacing.md,
                        borderRadius: BorderRadius.lg,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isJoining ? 0.6 : pressed ? 0.9 : 1,
                        ...Shadows.md,
                        minHeight: 48,
                      }}
                    >
                      {isJoining ? (
                        <ActivityIndicator color={Colors.text.primary} />
                      ) : (
                        <Text
                          style={{
                            color: Colors.text.primary,
                            fontWeight: Typography.weight.bold,
                            fontSize: Typography.size.sm,
                          }}
                        >
                          Join Event
                        </Text>
                      )}
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
          </View>
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
        // Navigate to movement tracker for this live event
        onJoin();
        router.push(`/move?event_id=${event.event_id}`);
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
            {event.location || (event.short_code ? `Code: ${event.short_code}` : 'Tap to join')}
          </Text>

          {/* Join Button */}
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)'] as const}
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

// Event Details Modal Component
function EventDetailsModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [eventStats, setEventStats] = useState<{ totalEnergy: number; participantCount: number } | null>(null);

  // Load leaderboard and stats when modal opens
  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoadingLeaderboard(true);

      try {
        // Fetch top 10 scores for this event
        const { data: scores, error: scoresError } = await supabase
          .from("scores")
          .select(`
            user_id,
            score,
            is_live,
            profiles!inner(display_name, first_name, last_name)
          `)
          .eq("event_id", event.event_id)
          .order("score", { ascending: false })
          .limit(10);

        if (scoresError) {
          console.error("Failed to load scores:", scoresError);
        } else if (isMounted && scores && scores.length > 0) {
          // Map scores with profile data
          const leaderboardData = scores.map(entry => {
            // Supabase returns profiles as array with foreign key join
            const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
            return {
              user_id: entry.user_id,
              score: entry.score,
              is_live: entry.is_live,
              display_name: profile?.display_name ||
                [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
                "Anonymous"
            };
          });

          setLeaderboard(leaderboardData);

          // Calculate stats
          const totalEnergy = scores.reduce((sum, s) => sum + (s.score || 0), 0);
          const participantCount = scores.length;
          setEventStats({ totalEnergy, participantCount });
        } else if (isMounted) {
          setLeaderboard([]);
          setEventStats({ totalEnergy: 0, participantCount: 0 });
        }
      } catch (err) {
        console.error("Error loading event details:", err);
      } finally {
        if (isMounted) setLoadingLeaderboard(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [event.event_id]);

  // Format date/time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Swipe down gesture to close modal
  const translateY = useRef(new Animated.Value(0)).current;

  // Backdrop opacity animation - fades as user swipes down
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 300],
    outputRange: [0.85, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 150px, close the modal
        if (gestureState.dy > 150) {
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: false, // Can't use native driver with opacity
          }).start(() => onClose());
        } else {
          // Otherwise, spring back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            justifyContent: "flex-end",
          },
          {
            backgroundColor: backdropOpacity.interpolate({
              inputRange: [0, 0.85],
              outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.85)'],
            }),
          },
        ]}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            height: "90%",
            borderTopLeftRadius: BorderRadius['3xl'],
            borderTopRightRadius: BorderRadius['3xl'],
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: Colors.border.strong,
            shadowColor: Colors.accent.purple.light,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 20,
            transform: [{ translateY }],
            overflow: 'hidden',
          }}
        >
          {/* Background Image with Blur Effect */}
          {event.cover_image_url ? (
            <>
              {/* Blurred background layer using native blurRadius */}
              <Image
                source={{ uri: event.cover_image_url }}
                style={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  right: -20,
                  bottom: -20,
                  width: undefined,
                  height: undefined,
                  opacity: 0.3,
                }}
                resizeMode="cover"
                blurRadius={25}
              />
              {/* Dark gradient overlay for better text readability */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.75)', 'rgba(0, 0, 0, 0.9)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </>
          ) : (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: Colors.background.primary,
              }}
            />
          )}

          {/* Content Container */}
          <View
            style={{
              flex: 1,
              paddingTop: Spacing.xl,
              paddingHorizontal: Spacing.xl,
              paddingBottom: Spacing['3xl'],
            }}
          >
            {/* Handle Bar - Swipe down to close */}
            <Pressable
              onPress={onClose}
              style={{ alignItems: "center", paddingVertical: Spacing.lg, marginBottom: Spacing.lg }}
            >
              <View
                style={{
                  width: 60,
                  height: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.text.muted,
                  opacity: 0.5,
                }}
              />
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.xl }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size['3xl'],
                      fontWeight: Typography.weight.bold,
                      marginBottom: Spacing.xs,
                    }}
                  >
                    {event.name || event.title || event.short_code || 'Untitled Event'}
                  </Text>
                  {event.status === 'live' && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: BorderRadius.full,
                          backgroundColor: Colors.status.live,
                        }}
                      />
                      <Text
                        style={{
                          color: Colors.status.live,
                          fontSize: Typography.size.sm,
                          fontWeight: Typography.weight.bold,
                        }}
                      >
                        LIVE NOW
                      </Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={onClose}>
                  <Text style={{ color: Colors.text.muted, fontSize: 32 }}>×</Text>
                </Pressable>
              </View>

              {/* Event Info Card */}
              <LinearGradient
                colors={Gradients.glass.medium}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1,
                  borderColor: Colors.border.glass,
                  padding: Spacing.lg,
                  marginBottom: Spacing.xl,
                  ...Shadows.md,
                }}
              >
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    letterSpacing: 1.5,
                    marginBottom: Spacing.md,
                  }}
                >
                  EVENT INFORMATION
                </Text>

                <View style={{ gap: Spacing.md }}>
                  {/* Location */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 2 }}>
                        Location
                      </Text>
                      <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold }}>
                        {event.location || 'Location TBA'}
                      </Text>
                    </View>
                  </View>

                  {/* Start Time */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>🕐</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 2 }}>
                        Start Time
                      </Text>
                      <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold }}>
                        {formatDateTime(event.start_at)}
                      </Text>
                    </View>
                  </View>

                  {/* End Time */}
                  {event.end_at && (
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>⏰</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 2 }}>
                          End Time
                        </Text>
                        <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold }}>
                          {formatDateTime(event.end_at)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Event Code */}
                  {event.short_code && (
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>🔑</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 2 }}>
                          Event Code
                        </Text>
                        <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, letterSpacing: 2 }}>
                          {event.short_code}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </LinearGradient>

              {/* Event Stats */}
              {eventStats && (
                <LinearGradient
                  colors={Gradients.glass.medium}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: BorderRadius.xl,
                    borderWidth: 1,
                    borderColor: Colors.border.glass,
                    padding: Spacing.lg,
                    marginBottom: Spacing.xl,
                    flexDirection: "row",
                    gap: Spacing.lg,
                    ...Shadows.md,
                  }}
                >
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 32, marginBottom: Spacing.xs }}>⚡</Text>
                    <Text
                      style={{
                        color: Colors.accent.purple.light,
                        fontSize: Typography.size['2xl'],
                        fontWeight: Typography.weight.bold,
                      }}
                    >
                      {eventStats.totalEnergy.toLocaleString()}
                    </Text>
                    <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4 }}>
                      Total Energy
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: Colors.border.glass }} />
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 32, marginBottom: Spacing.xs }}>👥</Text>
                    <Text
                      style={{
                        color: Colors.accent.pink.light,
                        fontSize: Typography.size['2xl'],
                        fontWeight: Typography.weight.bold,
                      }}
                    >
                      {eventStats.participantCount}
                    </Text>
                    <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 4 }}>
                      Participants
                    </Text>
                  </View>
                </LinearGradient>
              )}

              {/* Leaderboard */}
              <LinearGradient
                colors={Gradients.glass.medium}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1,
                  borderColor: Colors.border.glass,
                  padding: Spacing.lg,
                  ...Shadows.md,
                }}
              >
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    letterSpacing: 1.5,
                    marginBottom: Spacing.md,
                  }}
                >
                  TOP 10 LEADERBOARD
                </Text>

                {loadingLeaderboard ? (
                  <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
                    <ActivityIndicator color={Colors.accent.purple.light} size="large" />
                  </View>
                ) : leaderboard.length > 0 ? (
                  <View style={{ gap: Spacing.sm }}>
                    {leaderboard.map((entry, index) => {
                      return (
                        <LinearGradient
                          key={entry.user_id}
                          colors={index < 3 ? Gradients.glass.light : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)'] as const}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: Spacing.md,
                            borderRadius: BorderRadius.lg,
                            borderWidth: index < 3 ? 1 : 0,
                            borderColor: index < 3 ? Colors.border.glass : 'transparent',
                          }}
                        >
                          {/* Rank */}
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: BorderRadius.full,
                              backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255, 255, 255, 0.1)',
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: Spacing.md,
                            }}
                          >
                            <Text
                              style={{
                                color: index < 3 ? '#000' : Colors.text.primary,
                                fontSize: Typography.size.sm,
                                fontWeight: Typography.weight.bold,
                              }}
                            >
                              {index + 1}
                            </Text>
                          </View>

                          {/* User Info */}
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: Colors.text.primary,
                                fontSize: Typography.size.base,
                                fontWeight: Typography.weight.semibold,
                              }}
                            >
                              {entry.display_name}
                            </Text>
                            {entry.is_live && (
                              <Text
                                style={{
                                  color: Colors.status.live,
                                  fontSize: Typography.size.xs,
                                  marginTop: 2,
                                }}
                              >
                                🔴 Live
                              </Text>
                            )}
                          </View>

                          {/* Energy */}
                          <View style={{ alignItems: "flex-end" }}>
                            <Text
                              style={{
                                color: Colors.accent.purple.light,
                                fontSize: Typography.size.lg,
                                fontWeight: Typography.weight.bold,
                              }}
                            >
                              {(entry.score || 0).toLocaleString()}
                            </Text>
                            <Text
                              style={{
                                color: Colors.text.muted,
                                fontSize: Typography.size.xs,
                              }}
                            >
                              energy
                            </Text>
                          </View>
                        </LinearGradient>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
                    <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🏆</Text>
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: Typography.size.base,
                        textAlign: "center",
                      }}
                    >
                      No participants yet
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
