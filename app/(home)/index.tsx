// app/(home)/index.tsx - iOS 26 Redesigned Home Page
// Main home screen with event browsing and joining functionality
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import { eventEmitter } from "@/lib/events";
import { router } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Ionicons } from "@expo/vector-icons";
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

  // Listen for QR button press from floating tab bar
  useEffect(() => {
    const handleQRPress = () => {
      setShowJoinModal(true);
    };

    eventEmitter.on("openJoinModal", handleQRPress);
    return () => eventEmitter.off("openJoinModal", handleQRPress);
  }, []);

  // Load joined event from AsyncStorage
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const savedEventId = await AsyncStorage.getItem("event_id");
        if (!savedEventId || !isMounted) return;

        // Fetch event details
        const { data: event } = await supabase
          .from("events")
          .select("event_id, artist_id, name, title, short_code, location, cover_image_url, start_at, end_at, ended_at, status")
          .eq("event_id", savedEventId)
          .maybeSingle();

        if (!event || !isMounted) {
          // Event not found, clear storage
          await AsyncStorage.removeItem("event_id");
          return;
        }

        // Check if event has ended
        if (event.status === 'ended' || event.ended_at) {
          // Event ended, clear storage
          await AsyncStorage.removeItem("event_id");
          setActiveEvent(null);
          return;
        }

        // Event is still valid, set as active
        if (isMounted) {
          setActiveEvent(event);
        }
      } catch (error) {
        console.error("Error loading joined event:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
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
            }}
          >
            m0ve
          </Text>
        </Animated.View>

        {/* Welcome Message - Artistic */}
        <View style={{ marginBottom: Spacing.sm }}>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.xs,
              fontWeight: '200',
              letterSpacing: 3,
              textTransform: 'lowercase',
              opacity: 0.7,
              marginBottom: 2,
            }}
          >
            welcome back
          </Text>
          <Text
            style={{
              color: Colors.accent.purple.light,
              fontSize: Typography.size['4xl'],
              fontWeight: Typography.weight.bold,
              lineHeight: 48,
            }}
          >
            {displayName} 👋
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

        {/* Join an Event Button - iOS 26 Blue Theme (Hidden if already in an event) */}
        {!activeEvent && (
          <Pressable onPress={() => setShowJoinModal(true)}>
            {({ pressed }) => (
              <LinearGradient
                colors={["#007AFF", "#0051D5"]} // iOS blue gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.xl,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: BorderRadius['2xl'],
                  opacity: pressed ? 0.85 : 1,
                  ...Shadows.xl,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderWidth: 1,
                  borderColor: 'rgba(0, 122, 255, 0.3)', // iOS blue border
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: BorderRadius.lg,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)', // Slightly more white for iOS look
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={28} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: Typography.weight.bold,
                        fontSize: Typography.size.xl,
                        letterSpacing: 0.5,
                      }}
                    >
                      Enter the Experience
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255, 255, 255, 0.9)', // Brighter white for iOS
                        fontSize: Typography.size.xs,
                        marginTop: 2,
                      }}
                    >
                      Scan QR or enter code
                    </Text>
                  </View>
                  <Text style={{ fontSize: 20, color: "#ffffff" }}>→</Text>
                </View>
              </LinearGradient>
            )}
          </Pressable>
        )}

        {/* Active Event Modal - Conditional */}
        {activeEvent && (
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius['2xl'],
              borderWidth: 2,
              borderColor: Colors.accent.purple.light,
              padding: Spacing.lg,
              ...Shadows.xl,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.xs }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: BorderRadius.full,
                      backgroundColor: Colors.status.live,
                      ...Shadows.md,
                    }}
                  />
                  <Text
                    style={{
                      color: Colors.accent.purple.light,
                      fontSize: Typography.size.xs,
                      fontWeight: Typography.weight.bold,
                      letterSpacing: 1.5,
                    }}
                  >
                    JOINED EVENT
                  </Text>
                </View>
                <Text
                  style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.lg,
                    fontWeight: Typography.weight.bold,
                  }}
                >
                  {activeEvent.title || activeEvent.name}
                </Text>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    marginTop: Spacing.xs,
                  }}
                >
                  📍 {activeEvent.location || 'Location TBA'}
                </Text>
              </View>
            </View>

            {/* Event Cover Image */}
            {activeEvent.cover_image_url && (
              <Image
                source={{ uri: activeEvent.cover_image_url }}
                style={{
                  width: '100%',
                  height: 80,
                  borderRadius: BorderRadius.lg,
                  marginBottom: Spacing.sm,
                }}
                resizeMode="cover"
              />
            )}

            {/* Action Buttons */}
            <View style={{ gap: Spacing.xs }}>
              {/* Start Moving Button */}
              <Pressable onPress={() => router.push(`/move?event_id=${activeEvent.event_id}`)}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: Spacing.sm,
                      borderRadius: BorderRadius.lg,
                      alignItems: "center",
                      opacity: pressed ? 0.8 : 1,
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
                      ⚡ Start Moving
                    </Text>
                  </LinearGradient>
                )}
              </Pressable>

              {/* Exit Event Button */}
              <Pressable
                onPress={async () => {
                  await AsyncStorage.removeItem("event_id");
                  setActiveEvent(null);
                }}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      paddingVertical: Spacing.sm,
                      borderRadius: BorderRadius.lg,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: Colors.border.glass,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontWeight: Typography.weight.semibold,
                        fontSize: Typography.size.sm,
                      }}
                    >
                      Exit Event
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* Ongoing Events Component */}
        <OngoingEventsComponent events={ongoingEvents} onShowDetails={setSelectedEventForDetails} />

        {/* Past Events Component */}
        <PastEventsComponent events={pastEvents} onShowDetails={setSelectedEventForDetails} />
      </ScrollView>

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
        activeEvent={activeEvent}
        setActiveEvent={setActiveEvent}
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

// Reusable Event List Component - Uniform Layout for All Event Sections
function EventListSection({
  title,
  events,
  onShowDetails,
  isPast = false,
  emptyIcon = '🎉',
  emptyMessage = 'No events right now'
}: {
  title: string;
  events: Event[];
  onShowDetails: (event: Event) => void;
  isPast?: boolean;
  emptyIcon?: string;
  emptyMessage?: string;
}) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  // Dynamic constants based on screen width - Smaller and neater
  const CONTAINER_MARGIN = 64; // 32px on each side - more margin
  const CONTAINER_WIDTH = screenWidth - CONTAINER_MARGIN;
  const PAGE_SPACING = 16; // Fixed spacing between pages
  const SNAP_INTERVAL = CONTAINER_WIDTH + PAGE_SPACING; // Total width for snapping
  const IMAGE_SIZE = 80; // Reduced from 100
  const IMAGE_MARGIN = 12; // Reduced from 16
  const SEPARATOR_START = IMAGE_SIZE + IMAGE_MARGIN + IMAGE_MARGIN;

  const formatEventDate = (dateString: string | null) => {
    if (!dateString) return 'Date TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group events into pages of 3
  const eventsPerPage = 3;
  const pages: Event[][] = [];
  for (let i = 0; i < events.length; i += eventsPerPage) {
    pages.push(events.slice(i, i + eventsPerPage));
  }

  const renderEventItem = (event: Event, index: number, isLastInPage: boolean) => (
    <View key={event.event_id}>
      <Pressable
        onPress={() => onShowDetails(event)}
        onPressIn={() => setPressedId(event.event_id)}
        onPressOut={() => setPressedId(null)}
      >
        <Animated.View
          style={{
            transform: [{ scale: pressedId === event.event_id ? 0.98 : 1 }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              padding: IMAGE_MARGIN - 2, // Slightly tighter padding
            }}
          >
            {/* Cover Image */}
            <View
              style={{
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                borderRadius: BorderRadius.lg,
                overflow: 'hidden',
                marginRight: IMAGE_MARGIN,
              }}
            >
              {event.cover_image_url ? (
                <Image
                  source={{ uri: event.cover_image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 36 }}>🎵</Text>
                </LinearGradient>
              )}
            </View>

            {/* Event Details */}
            <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 4 }}>
              {/* Date at top */}
              <Text
                style={{
                  color: Colors.text.muted,
                  fontSize: 11, // Smaller
                  fontWeight: Typography.weight.medium,
                }}
              >
                {formatEventDate(isPast ? (event.ended_at || event.start_at) : event.start_at)}
              </Text>

              {/* Event name in middle */}
              <Text
                numberOfLines={2}
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.base, // Reduced from lg
                  fontWeight: Typography.weight.bold,
                  lineHeight: Typography.size.base * 1.3,
                }}
              >
                {event.name || event.title || event.short_code || 'Untitled Event'}
              </Text>

              {/* Location at bottom */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.text.muted,
                    fontSize: 12, // Smaller
                    flex: 1,
                  }}
                >
                  📍 {event.location || 'Location TBA'}
                </Text>

                {/* LIVE indicator (only for ongoing events) - Modern pill design */}
                {!isPast && event.status === 'live' && (
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.08)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      marginLeft: Spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: BorderRadius.full,
                        backgroundColor: Colors.status.live,
                      }}
                    />
                    <Text
                      style={{
                        color: Colors.status.live,
                        fontSize: 10,
                        fontWeight: Typography.weight.bold,
                        letterSpacing: 0.5,
                      }}
                    >
                      LIVE
                    </Text>
                  </LinearGradient>
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Separator line - starts from text area, thinner and lighter */}
      {!isLastInPage && (
        <View
          style={{
            height: 0.5,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            marginLeft: SEPARATOR_START,
            marginRight: IMAGE_MARGIN,
          }}
        />
      )}
    </View>
  );

  return (
    <View>
      {/* Title outside the container with > arrow */}
      <Pressable
        onPress={() => setShowAllEvents(true)}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs }}
      >
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size['2xl'],
            fontWeight: Typography.weight.bold,
            marginRight: Spacing.sm,
          }}
        >
          {title}
        </Text>
        <Ionicons name="chevron-forward" size={24} color={Colors.text.muted} />
      </Pressable>

      {events.length > 0 ? (
        <View>
          <Animated.ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingRight: CONTAINER_MARGIN / 2,
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {pages.map((pageEvents, pageIndex) => (
              <View
                key={pageIndex}
                style={{
                  width: CONTAINER_WIDTH,
                  marginRight: pageIndex < pages.length - 1 ? PAGE_SPACING : 0,
                  opacity: isPast ? 0.7 : 1,
                }}
              >
                {pageEvents.map((event, index) =>
                  renderEventItem(event, index, index === pageEvents.length - 1)
                )}
              </View>
            ))}
          </Animated.ScrollView>

          {/* Pagination Dots - Only show if more than 1 page */}
          {pages.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: Spacing.md,
                gap: 6,
              }}
            >
              {pages.map((_, index) => {
                const inputRange = [
                  (index - 1) * SNAP_INTERVAL,
                  index * SNAP_INTERVAL,
                  (index + 1) * SNAP_INTERVAL,
                ];

                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [6, 20, 6],
                  extrapolate: 'clamp',
                });

                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });

                const dotRadius = scrollX.interpolate({
                  inputRange,
                  outputRange: [3, 3, 3],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={index}
                    style={{
                      width: dotWidth,
                      height: 6,
                      borderRadius: dotRadius,
                      backgroundColor: Colors.accent.purple.light,
                      opacity: dotOpacity,
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: Spacing['3xl'],
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>{emptyIcon}</Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              textAlign: 'center',
            }}
          >
            {emptyMessage}
          </Text>
        </View>
      )}

      {/* All Events Modal */}
      {showAllEvents && (
        <Modal visible={true} transparent animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.md,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border.glass,
                }}
              >
                <Pressable onPress={() => setShowAllEvents(false)}>
                  <Ionicons name="chevron-back" size={28} color={Colors.accent.purple.light} />
                </Pressable>
                <Text
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    color: Colors.text.primary,
                    fontSize: Typography.size.xl,
                    fontWeight: Typography.weight.bold,
                    marginRight: 28,
                  }}
                >
                  All {title}
                </Text>
              </View>

              {/* Scrollable list of all events */}
              <ScrollView
                contentContainerStyle={{
                  padding: Spacing.xl,
                  gap: Spacing.md,
                }}
              >
                {events.map((event) => (
                  <Pressable
                    key={event.event_id}
                    onPress={() => {
                      setShowAllEvents(false);
                      onShowDetails(event);
                    }}
                    onPressIn={() => setPressedId(event.event_id)}
                    onPressOut={() => setPressedId(null)}
                  >
                    <Animated.View
                      style={{
                        transform: [{ scale: pressedId === event.event_id ? 0.98 : 1 }],
                        opacity: isPast ? 0.7 : 1,
                      }}
                    >
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: 'row',
                          borderRadius: BorderRadius.xl,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          padding: Spacing.md,
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          ...Shadows.sm,
                        }}
                      >
                        <View
                          style={{
                            width: IMAGE_SIZE,
                            height: IMAGE_SIZE,
                            borderRadius: BorderRadius.lg,
                            overflow: 'hidden',
                            marginRight: IMAGE_MARGIN,
                          }}
                        >
                          {event.cover_image_url ? (
                            <Image
                              source={{ uri: event.cover_image_url }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <LinearGradient
                              colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 36 }}>🎵</Text>
                            </LinearGradient>
                          )}
                        </View>

                        <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text style={{ color: Colors.text.muted, fontSize: 11, fontWeight: Typography.weight.medium }}>
                            {formatEventDate(isPast ? (event.ended_at || event.start_at) : event.start_at)}
                          </Text>
                          <Text numberOfLines={2} style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold, lineHeight: Typography.size.base * 1.3 }}>
                            {event.name || event.title || event.short_code || 'Untitled Event'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text numberOfLines={1} style={{ color: Colors.text.muted, fontSize: 12, flex: 1 }}>
                              📍 {event.location || 'Location TBA'}
                            </Text>
                            {!isPast && event.status === 'live' && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: Spacing.sm }}>
                                <View style={{ width: 6, height: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.status.live }} />
                                <Text style={{ color: Colors.status.live, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold }}>LIVE</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

// Ongoing Events Component - Uses Reusable Component
function OngoingEventsComponent({ events, onShowDetails }: { events: Event[]; onShowDetails: (event: Event) => void }) {
  return (
    <EventListSection
      title="Ongoing Events"
      events={events}
      onShowDetails={onShowDetails}
      isPast={false}
      emptyIcon="🎉"
      emptyMessage="No ongoing events right now"
    />
  );
}

// Past Events Component - Uses Reusable Component
function PastEventsComponent({ events, onShowDetails }: { events: Event[]; onShowDetails: (event: Event) => void }) {
  return (
    <EventListSection
      title="Past Events"
      events={events}
      onShowDetails={onShowDetails}
      isPast={true}
      emptyIcon="📅"
      emptyMessage="No past events yet"
    />
  );
}

// Old implementations removed - using reusable EventListSection component

// Join Event Modal Component
function JoinEventModal({
  visible,
  onClose,
  showCodeInput,
  setShowCodeInput,
  eventCode,
  setEventCode,
  liveEvents,
  activeEvent,
  setActiveEvent,
}: {
  visible: boolean;
  onClose: () => void;
  showCodeInput: boolean;
  setShowCodeInput: (show: boolean) => void;
  eventCode: string;
  setEventCode: (code: string) => void;
  liveEvents: Event[];
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleJoinWithCode = async () => {
    // Check if user is already in an event
    if (activeEvent) {
      setErrorMessage(`You're already in "${activeEvent.title || activeEvent.name}". Exit that event first to join a new one.`);
      return;
    }

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
        .select("event_id, artist_id, name, title, short_code, location, cover_image_url, start_at, end_at, ended_at, status")
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

      // Check if event has ended
      if (event.status === 'ended' || event.ended_at) {
        setErrorMessage("This event has already ended");
        setIsJoining(false);
        return;
      }

      // Save event_id to AsyncStorage
      await AsyncStorage.setItem("event_id", event.event_id);

      // Set as active event
      setActiveEvent(event);

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

            {/* Scan QR Code Button - iOS 26 Style */}
            <Pressable onPress={() => { onClose(); router.push("/scan"); }}>
              {({ pressed }) => (
                <LinearGradient
                  colors={["#007AFF", "#0051D5"]} // iOS blue
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: Spacing.lg,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: BorderRadius.lg,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: Spacing.sm,
                    marginBottom: Spacing.md,
                    opacity: pressed ? 0.85 : 1,
                    ...Shadows.md,
                  }}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.base,
                    }}
                  >
                    Scan QR Code
                  </Text>
                </LinearGradient>
              )}
            </Pressable>

            {/* Enter Code Button - iOS 26 Style */}
            {!showCodeInput ? (
              <Pressable onPress={() => setShowCodeInput(true)}>
                {({ pressed }) => (
                  <View
                    style={{
                      paddingVertical: Spacing.lg,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.lg,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: Spacing.sm,
                      backgroundColor: "rgba(120, 120, 128, 0.16)", // iOS gray background
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      marginBottom: Spacing.lg,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons name="key-outline" size={20} color="#8E8E93" />
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: Typography.weight.semibold,
                        fontSize: Typography.size.base,
                      }}
                    >
                      Enter Event Code
                    </Text>
                  </View>
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
                    <LiveEventCard
                      key={event.event_id}
                      event={event}
                      onJoin={onClose}
                      activeEvent={activeEvent}
                      setActiveEvent={setActiveEvent}
                    />
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
function LiveEventCard({
  event,
  onJoin,
  activeEvent,
  setActiveEvent,
}: {
  event: Event;
  onJoin: () => void;
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
}) {
  const cardWidth = 160;

  return (
    <Pressable
      onPress={() => {
        // Navigate to event details page
        onJoin(); // Close modal
        router.push(`/event-details?event_id=${event.event_id}`);
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
          <View
            style={{
              width: cardWidth,
              height: cardWidth,
              borderRadius: BorderRadius.lg,
              marginBottom: Spacing.sm,
              ...Shadows.md,
              overflow: 'hidden',
            }}
          >
            {event.cover_image_url ? (
              <Image
                source={{ uri: event.cover_image_url }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 48 }}>🎵</Text>
              </LinearGradient>
            )}
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
          </View>

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
  const scrollViewRef = useRef<any>(null);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);

  // Backdrop opacity animation - fades as user swipes down
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, 300],
    outputRange: [0.85, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to downward swipes anywhere on the modal (very gentle threshold)
        return gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow downward movement from anywhere
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 100px, close the modal
        if (gestureState.dy > 100) {
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
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0.6,
                }}
                resizeMode="cover"
                blurRadius={20}
              />
              {/* Dark vignette overlay from edges */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
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
              {/* Left edge shadow */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 100,
                }}
              />
              {/* Right edge shadow */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 100,
                }}
              />
              {/* Subtle purple/pink highlight overlay for depth */}
              <LinearGradient
                colors={[
                  'rgba(168, 85, 247, 0.1)',
                  'rgba(236, 72, 153, 0.05)',
                  'rgba(0, 0, 0, 0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
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
            <View
              style={{ alignItems: "center", paddingVertical: Spacing.lg, marginBottom: Spacing.lg }}
            >
              <Pressable onPress={onClose}>
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
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => {
                const offsetY = e.nativeEvent.contentOffset.y;
                setIsScrolledToTop(offsetY <= 0);
              }}
              scrollEventThrottle={16}
            >
              {/* Header */}
              <View style={{ marginBottom: Spacing.xl }}>
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
                      {normalizeScoreForDisplay(eventStats.totalEnergy).toLocaleString()}
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
                              {normalizeScoreForDisplay(entry.score || 0).toLocaleString()}
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
