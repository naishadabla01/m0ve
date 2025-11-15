// app/(home)/index.tsx - iOS 26 Redesigned Home Page
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
  artist_name?: string | null;
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

  // Parallax scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

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
        // Get unique artist IDs
        const artistIds = [...new Set(events.map(e => e.artist_id).filter(Boolean))];

        // Fetch artist profiles separately
        const { data: artistProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, first_name, last_name")
          .in("user_id", artistIds);

        // Create artist lookup map
        const artistMap = new Map(
          (artistProfiles || []).map(profile => [
            profile.user_id,
            profile.display_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            null
          ])
        );

        const now = new Date();

        // Map events to include artist_name from profiles
        const mappedEvents = events.map((event: any) => {
          return {
            ...event,
            artist_name: artistMap.get(event.artist_id) || null,
          };
        });

        // Ongoing events: live, scheduled (future), or started but not ended
        // Status can be: 'scheduled', 'live', 'ended'
        const ongoing = mappedEvents.filter(e => {
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
        const past = mappedEvents.filter(e =>
          e.status === 'ended' || e.ended_at
        );

        console.log("✅ Ongoing events:", ongoing.length);
        console.log("🏁 Past events:", past.length);
        console.log("Ongoing:", ongoing.map(e => ({ name: e.name, artist: e.artist_name, status: e.status, start_at: e.start_at })));

        setOngoingEvents(ongoing);
        setPastEvents(past);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Parallax transform for background blobs
  const purpleBlobTransform = scrollY.interpolate({
    inputRange: [0, 500],
    outputRange: [0, -100], // Move slower (only -100px when scrolled 500px)
    extrapolate: 'clamp',
  });

  const pinkBlobTransform = scrollY.interpolate({
    inputRange: [0, 500],
    outputRange: [0, -80], // Move even slower for variation
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }} edges={['top', 'left', 'right']}>
      {/* Animated Background Blobs with Parallax */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <Animated.View
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
            transform: [{ translateY: purpleBlobTransform }],
          }}
        />
        <Animated.View
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
            transform: [{ translateY: pinkBlobTransform }],
          }}
        />
      </View>

      <Animated.ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing['2xl'],
          paddingTop: Spacing['2xl'],
          paddingBottom: 120, // Space for tab bar
          gap: Spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
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
              color: Colors.text.primary,
              fontSize: Typography.size.lg,
              fontWeight: Typography.weight.semibold,
              letterSpacing: 0.5,
              textTransform: 'lowercase',
              marginBottom: 2,
            }}
          >
            welcome back
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                color: Colors.accent.purple.light,
                fontSize: Typography.size['4xl'],
                fontWeight: Typography.weight.bold,
                lineHeight: 48,
              }}
            >
              {displayName}
            </Text>
            <Ionicons
              name="sparkles"
              size={28}
              color={Colors.accent.purple.light}
              style={{ marginTop: 4 }}
            />
          </View>
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

        {/* Join an Event Button - iOS 26 with Dynamic Spotlight (Hidden if already in an event) */}
        {!activeEvent && (
          <Pressable onPress={() => setShowJoinModal(true)}>
            {({ pressed }) => (
              <LinearGradient
                colors={[
                  "rgba(25, 25, 30, 0.95)",
                  "rgba(30, 30, 38, 0.92)",
                  "rgba(28, 28, 35, 0.94)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: Spacing.xl,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: BorderRadius['2xl'],
                  opacity: pressed ? 0.85 : 1,
                  ...Shadows.xl,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderWidth: 1.5,
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Spotlight glow effect - top right INSIDE - Blue */}
                <View
                  style={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    backgroundColor: 'rgba(59, 130, 246, 0.25)',
                    filter: Platform.OS === 'web' ? 'blur(50px)' : undefined,
                  }}
                />
                {/* Secondary glow - bottom left INSIDE - Blue */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -50,
                    left: -50,
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    filter: Platform.OS === 'web' ? 'blur(45px)' : undefined,
                  }}
                />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md, zIndex: 1 }}>
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
      </Animated.ScrollView>

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
    </SafeAreaView>
    {/* Event Details Modal - Rendered outside SafeAreaView to appear on top of All Events modal */}
    {selectedEventForDetails && (
      <EventDetailsModal
        event={selectedEventForDetails}
        onClose={() => {
          setSelectedEventForDetails(null);
          // Also close All Events modal if it was open
          setShowAllEvents(false);
        }}
      />
    )}
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
  const [menuVisible, setMenuVisible] = useState<string | null>(null); // Track which event menu is open
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
        onPress={() => {
          setMenuVisible(null); // Close menu when tapping card
          onShowDetails(event);
        }}
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
              {/* Top section: Date and Status Dot */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {/* Status Dot - Green for live, Blue for upcoming */}
                {!isPast && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: event.status === 'live' ? '#10b981' : '#3b82f6',
                    }}
                  />
                )}
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: 11,
                    fontWeight: Typography.weight.medium,
                  }}
                >
                  {formatEventDate(isPast ? (event.ended_at || event.start_at) : event.start_at)}
                </Text>
              </View>

              {/* Middle section: Event name and 3-dot menu */}
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                      fontWeight: Typography.weight.bold,
                      flex: 1,
                    }}
                  >
                    {event.name || event.title || event.short_code || 'Untitled Event'}
                  </Text>

                  {/* 3-Dot Menu Button */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setMenuVisible(menuVisible === event.event_id ? null : event.event_id);
                    }}
                    style={{
                      padding: 6,
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text.muted} />
                  </Pressable>
                </View>

                {/* Artist Name with Instagram-style Verified Badge */}
                {event.artist_name && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: Colors.text.secondary,
                        fontSize: 13,
                        fontWeight: Typography.weight.semibold,
                      }}
                    >
                      {event.artist_name}
                    </Text>
                    <Ionicons name="checkmark-circle" size={15} color="#3b82f6" />
                  </View>
                )}
              </View>

              {/* Bottom section: Location moved to bottom right */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.text.muted,
                    fontSize: 11,
                  }}
                >
                  📍 {event.location || 'Location TBA'}
                </Text>
              </View>
            </View>
          </View>

          {/* Popup Menu - Enhanced Apple Music Style with Gloss */}
          {menuVisible === event.event_id && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <Pressable
                onPress={() => setMenuVisible(null)}
                style={{
                  position: 'absolute',
                  top: -100,
                  left: -100,
                  right: -100,
                  bottom: -100,
                  zIndex: 998,
                }}
              />

              <LinearGradient
                colors={[
                  'rgba(45, 45, 52, 0.98)',
                  'rgba(35, 35, 42, 0.95)',
                  'rgba(40, 40, 48, 0.97)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 45,
                  right: 8,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  overflow: 'hidden',
                  minWidth: 200,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.6,
                  shadowRadius: 20,
                  elevation: 12,
                  zIndex: 999,
                }}
              >
                {/* Inner glow effect */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />

                {/* Leaderboard Option */}
                <Pressable
                  onPress={() => {
                    setMenuVisible(null);
                    router.push({
                      pathname: "/(home)/leaderboard",
                      params: { event_id: event.event_id },
                    });
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  })}
                >
                  <Ionicons name="trophy-outline" size={20} color={Colors.text.primary} style={{ marginRight: 14 }} />
                  <Text style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.base,
                    fontWeight: Typography.weight.semibold,
                    letterSpacing: 0.2,
                  }}>
                    Leaderboard
                  </Text>
                </Pressable>

                {/* Divider with gradient */}
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 1, marginHorizontal: 14 }}
                />

                {/* I'm Interested Option */}
                <Pressable
                  onPress={() => {
                    setMenuVisible(null);
                    // TODO: Add functionality later
                    console.log("I'm Interested clicked for event:", event.event_id);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  })}
                >
                  <Ionicons name="heart-outline" size={20} color={Colors.text.primary} style={{ marginRight: 14 }} />
                  <Text style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.base,
                    fontWeight: Typography.weight.semibold,
                    letterSpacing: 0.2,
                  }}>
                    I'm Interested
                  </Text>
                </Pressable>
              </LinearGradient>
            </>
          )}
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
        <Modal visible={true} animationType="slide">
          <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
              {/* Header with proper spacing */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.xl,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border.glass,
                  backgroundColor: Colors.background.primary,
                }}
              >
                <Pressable
                  onPress={() => setShowAllEvents(false)}
                  style={{
                    padding: Spacing.sm,
                    marginLeft: -Spacing.sm,
                  }}
                >
                  <Ionicons name="chevron-back" size={32} color={Colors.accent.purple.light} />
                </Pressable>
                <Text
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    color: Colors.text.primary,
                    fontSize: Typography.size['2xl'],
                    fontWeight: Typography.weight.bold,
                    marginRight: 32,
                  }}
                >
                  All {title}
                </Text>
              </View>

              {/* Scrollable list of all events - Clean compact style */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  gap: Spacing.sm,
                  paddingBottom: Spacing['3xl'],
                }}
                showsVerticalScrollIndicator={false}
              >
                {events.map((event) => (
                  <Pressable
                    key={event.event_id}
                    onPress={() => {
                      // Open event details modal directly without closing all events modal
                      onShowDetails(event);
                    }}
                    onPressIn={() => setPressedId(event.event_id)}
                    onPressOut={() => setPressedId(null)}
                  >
                    {({ pressed }) => (
                      <LinearGradient
                        colors={['rgba(30, 30, 35, 0.6)', 'rgba(25, 25, 30, 0.5)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderRadius: BorderRadius.xl,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          padding: Spacing.md,
                          opacity: pressed ? 0.7 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        }}
                      >
                        {/* Event Cover Image - Smaller */}
                        <View
                          style={{
                            width: 70,
                            height: 70,
                            borderRadius: BorderRadius.lg,
                            overflow: 'hidden',
                            marginRight: Spacing.md,
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
                              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 28 }}>🎵</Text>
                            </LinearGradient>
                          )}
                        </View>

                        {/* Event Details */}
                        <View style={{ flex: 1 }}>
                          {/* Date and Status Dot */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {!isPast && (
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: event.status === 'live' ? '#10b981' : '#3b82f6',
                                }}
                              />
                            )}
                            <Text style={{ color: Colors.text.muted, fontSize: 12, fontWeight: Typography.weight.medium }}>
                              {formatEventDate(isPast ? (event.ended_at || event.start_at) : event.start_at)}
                            </Text>
                          </View>

                          {/* Event Name */}
                          <Text
                            numberOfLines={1}
                            style={{
                              color: Colors.text.primary,
                              fontSize: Typography.size.lg,
                              fontWeight: Typography.weight.bold,
                              marginBottom: 4,
                            }}
                          >
                            {event.name || event.title || event.short_code || 'Untitled Event'}
                          </Text>

                          {/* Location */}
                          <Text
                            numberOfLines={1}
                            style={{
                              color: Colors.text.muted,
                              fontSize: 13,
                            }}
                          >
                            📍 {event.location || 'Location TBA'}
                          </Text>
                        </View>

                        {/* LIVE indicator on right */}
                        {!isPast && event.status === 'live' && (
                          <View
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              marginLeft: Spacing.sm,
                            }}
                          >
                            <Text
                              style={{
                                color: '#10b981',
                                fontSize: 11,
                                fontWeight: Typography.weight.bold,
                                letterSpacing: 0.5,
                              }}
                            >
                              LIVE
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </SafeAreaView>
          </View>
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

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  // Trigger animation when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      blurAnim.setValue(0);

      // Run animations in parallel
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(blurAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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

  // Interpolate blur radius
  const backdropBlur = blurAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const backdropOpacity = blurAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.92],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Animated Backdrop with Enhanced Blur Effect */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: backdropOpacity.interpolate({
            inputRange: [0, 0.92],
            outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.92)'],
          }),
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pressable
          style={{ flex: 1, width: '100%', justifyContent: "center", alignItems: "center" }}
          onPress={handleClose}
        >
          {/* Animated Modal Content */}
          <Animated.View
            style={{
              width: "90%",
              maxWidth: 500,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* iOS 26 Glassmorphism Modal Container with Gloss */}
              <View style={{ position: 'relative', borderRadius: BorderRadius['2xl'] }}>
                {/* Subtle gloss/shine effect at top */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    borderTopLeftRadius: BorderRadius['2xl'],
                    borderTopRightRadius: BorderRadius['2xl'],
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
                <LinearGradient
                  colors={[
                    'rgba(18, 18, 22, 0.95)',
                    'rgba(25, 25, 30, 0.92)',
                    'rgba(20, 20, 25, 0.94)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1.5,
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    padding: Spacing.xl,
                    ...Shadows.xl,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 30,
                    elevation: 15,
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
              <Pressable onPress={handleClose}>
                <Text style={{ color: Colors.text.muted, fontSize: 28 }}>×</Text>
              </Pressable>
            </View>

            {/* Scan QR Code Button - iOS 26 Style with Light Blue */}
            <View style={{ overflow: 'hidden', borderRadius: BorderRadius.xl, marginBottom: Spacing.md }}>
              {/* Glow effect layer - Light Blue */}
              <View style={{
                position: 'absolute', top: -50, right: -50, width: 110, height: 110,
                borderRadius: 55, backgroundColor: 'rgba(96, 165, 250, 0.3)', zIndex: 0,
              }} />
              <View style={{
                position: 'absolute', bottom: -50, left: -50, width: 100, height: 100,
                borderRadius: 50, backgroundColor: 'rgba(59, 130, 246, 0.25)', zIndex: 0,
              }} />

              <Pressable onPress={() => { onClose(); router.push("/scan"); }}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={[
                      'rgba(30, 32, 38, 0.85)',
                      'rgba(38, 42, 50, 0.85)',
                      'rgba(32, 35, 42, 0.85)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: Spacing.lg,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: BorderRadius.xl,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: Spacing.sm,
                      borderWidth: 2,
                      borderColor: 'rgba(96, 165, 250, 0.4)',
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      shadowColor: 'rgba(96, 165, 250, 0.5)',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 8,
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={24} color="#60a5fa" />
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
            </View>

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
                      colors={['#3b82f6', '#2563eb', '#1d4ed8'] as const}
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

            {/* Live Events Horizontal Scroll */}
            <View>
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.lg,
                  fontWeight: Typography.weight.bold,
                  marginBottom: Spacing.md,
                }}
              >
                Live Events Nearby
              </Text>
              {liveEvents.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: Spacing.md, paddingRight: Spacing.md }}
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
                <View style={{ alignItems: "center", paddingVertical: Spacing.lg }}>
                  <Text style={{ fontSize: 32, marginBottom: Spacing.sm }}>📍</Text>
                  <Text
                    style={{
                      color: Colors.text.muted,
                      fontSize: Typography.size.sm,
                      textAlign: "center",
                    }}
                  >
                    No live events nearby
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// Live Event Card - Compact card with photo on left
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const cardWidth = 200;

  return (
    <>
      <Pressable
        onPress={() => setShowDetailsModal(true)}
      >
        {({ pressed }) => (
          <View style={{ width: cardWidth }}>
            {/* Card Container with subtle purple/pink glow */}
            <LinearGradient
              colors={[
                'rgba(30, 30, 35, 0.7)',
                'rgba(35, 35, 42, 0.6)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: 'rgba(168, 85, 247, 0.2)', // Subtle purple border
                overflow: 'hidden',
                opacity: pressed ? 0.85 : 1,
                ...Shadows.md,
              }}
            >
              {/* Subtle purple glow in corner */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  zIndex: 0,
                }}
              />

              {/* Cover Image - Top */}
              <View
                style={{
                  width: '100%',
                  height: 100,
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
                    colors={[
                      'rgba(168, 85, 247, 0.4)', // Purple
                      'rgba(236, 72, 153, 0.4)', // Pink
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 36 }}>🎵</Text>
                  </LinearGradient>
                )}
                {/* Live Indicator */}
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    paddingHorizontal: 6,
                    paddingVertical: 3,
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
                      fontSize: 10,
                      fontWeight: Typography.weight.bold,
                    }}
                  >
                    LIVE
                  </Text>
                </View>
              </View>

              {/* Event Details - Bottom */}
              <View style={{ padding: Spacing.sm }}>
                {/* Event Title */}
                <Text
                  numberOfLines={1}
                  style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.sm,
                    fontWeight: Typography.weight.bold,
                    marginBottom: 3,
                  }}
                >
                  {event.name || event.title || event.short_code || 'Untitled Event'}
                </Text>

                {/* Artist Name with purple/pink gradient text effect */}
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#c084fc', // Light purple
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginBottom: 4,
                  }}
                >
                  {event.artist_name || 'Artist'}
                </Text>

                {/* Time */}
                {event.start_at && (
                  <Text
                    style={{
                      color: Colors.text.muted,
                      fontSize: Typography.size.xs,
                      marginBottom: 6,
                    }}
                  >
                    {new Date(event.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                )}

                {/* Location with arrow at bottom */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-sharp" size={12} color="#ec4899" />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#ec4899', // Pink
                      fontSize: Typography.size.xs,
                      fontWeight: Typography.weight.medium,
                      flex: 1,
                    }}
                  >
                    {event.location || 'Location TBA'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </Pressable>

      {/* Event Details Modal */}
      {showDetailsModal && (
        <EventDetailsModal
          visible={showDetailsModal}
          event={event}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </>
  );
}

// Reusable Event Info Box Component
const renderEventInfoBox = ({
  icon,
  iconColor,
  label,
  value,
  subValue,
  backgroundColor,
  borderColor,
  glowColor,
  isCode = false,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
  isCode?: boolean;
}) => {
  return (
    <View style={{ flex: 1, overflow: 'hidden', borderRadius: BorderRadius.xl }}>
      {/* Glow effect layer */}
      <View style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: glowColor,
        opacity: 0.4,
      }} />
      <View style={{
        backgroundColor,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor,
        minHeight: 90,
        justifyContent: 'space-between',
      }}>
        <Ionicons name={icon} size={18} color={iconColor} style={{ marginBottom: 6 }} />
        <View>
          <Text style={{
            color: Colors.text.muted,
            fontSize: 10,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {label}
          </Text>
          {isCode ? (
            <LinearGradient
              colors={[`${backgroundColor}99`, backgroundColor, `${backgroundColor}99`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: Spacing.xs,
                paddingVertical: 4,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: borderColor,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{
                color: iconColor,
                fontSize: Typography.size.base,
                fontWeight: Typography.weight.bold,
                letterSpacing: 2,
              }}>
                {value}
              </Text>
            </LinearGradient>
          ) : (
            <>
              <Text numberOfLines={2} style={{
                color: Colors.text.primary,
                fontSize: Typography.size.sm,
                fontWeight: Typography.weight.semibold,
              }}>
                {value}
              </Text>
              {subValue && (
                <Text style={{
                  color: Colors.text.muted,
                  fontSize: 10,
                  marginTop: 2,
                }}>
                  {subValue}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

// Event Details Modal Component
function EventDetailsModal({
  event,
  onClose,
  showJoinButton = false
}: {
  event: Event;
  onClose: () => void;
  showJoinButton?: boolean;
}) {
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

  // Swipe down gesture to close modal with smooth animations
  const translateY = useRef(new Animated.Value(1000)).current; // Start from bottom
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);

  // Entrance animation on mount - Smooth slide up from bottom
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Backdrop opacity animation - fades as user swipes down
  const backdropOpacity = modalOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.85],
    extrapolate: 'clamp',
  });

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 1000,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  // Enhanced pan responder for header area
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Always respond to vertical gestures in header
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow downward movement only
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 150px or velocity is high, close
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          // Otherwise, spring back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Removed contentPanResponder to fix glitchy swipe behavior
  // Only headerPanResponder is used for smooth swipe-to-close

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleClose}
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
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={handleClose}
        />
        <Animated.View
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
            opacity: modalOpacity,
            overflow: 'hidden',
          }}
        >
          {/* Background Image with Reduced Blur Effect */}
          {event.cover_image_url ? (
            <>
              {/* Less blurred background layer */}
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
                  opacity: 0.7,
                }}
                resizeMode="cover"
                blurRadius={8}
              />
              {/* Lighter vignette overlay from edges */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.6)']}
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
                colors={['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)']}
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
                colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)']}
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
                  'rgba(168, 85, 247, 0.08)',
                  'rgba(236, 72, 153, 0.04)',
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
            {/* Handle Bar and Header - Draggable Area */}
            <View {...headerPanResponder.panHandlers}>
              {/* Handle Bar - Swipe down to close */}
              <View
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
              </View>

              {/* Header - iOS Centered Style */}
              <View style={{ marginBottom: Spacing.xl, alignItems: 'center' }}>
                <Text
                  style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size['3xl'],
                    fontWeight: Typography.weight.bold,
                    marginBottom: Spacing.sm,
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}
                >
                  {event.name || event.title || event.short_code || 'Untitled Event'}
                </Text>
                {event.status === 'live' && (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.xs,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.xs,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  }}>
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
                        fontWeight: Typography.weight.bold,
                        letterSpacing: 0.5,
                      }}
                    >
                      LIVE NOW
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onScroll={(e) => {
                const offsetY = e.nativeEvent.contentOffset.y;
                setIsScrolledToTop(offsetY <= 0);
              }}
              scrollEventThrottle={16}
              {...(isScrolledToTop ? contentPanResponder.panHandlers : {})}
            >
              {/* Event Info Card - 2x2 Grid with Reusable Component */}
              <View
                style={{
                  borderRadius: BorderRadius['2xl'],
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(18, 18, 22, 0.85)',
                  padding: Spacing.lg,
                  marginBottom: Spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                {/* 2x2 Grid */}
                <View style={{ gap: Spacing.sm }}>
                  {/* Row 1: Location and Event Code */}
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    {/* Location */}
                    {renderEventInfoBox({
                      icon: 'location',
                      iconColor: Colors.accent.purple.light,
                      label: 'Location',
                      value: event.location || 'TBA',
                      backgroundColor: 'rgba(168, 85, 247, 0.12)',
                      borderColor: 'rgba(168, 85, 247, 0.3)',
                      glowColor: 'rgba(168, 85, 247, 0.3)',
                    })}

                    {/* Event Code */}
                    {renderEventInfoBox({
                      icon: 'qr-code',
                      iconColor: '#10b981',
                      label: 'Code',
                      value: event.short_code || 'N/A',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      glowColor: 'rgba(16, 185, 129, 0.3)',
                      isCode: true,
                    })}
                  </View>

                  {/* Row 2: Start Time and End Time */}
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    {/* Start Time */}
                    {renderEventInfoBox({
                      icon: 'time-outline',
                      iconColor: '#3b82f6',
                      label: 'Start',
                      value: event.start_at ? new Date(event.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'TBA',
                      subValue: event.start_at ? new Date(event.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      glowColor: 'rgba(59, 130, 246, 0.3)',
                    })}

                    {/* End Time */}
                    {renderEventInfoBox({
                      icon: 'alarm-outline',
                      iconColor: Colors.accent.pink.light,
                      label: 'End',
                      value: event.end_at ? new Date(event.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'TBA',
                      subValue: event.end_at ? new Date(event.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      borderColor: 'rgba(236, 72, 153, 0.3)',
                      glowColor: 'rgba(236, 72, 153, 0.3)',
                    })}
                  </View>
                </View>
              </View>

              {/* Event Stats - Compact with Glows */}
              {eventStats && (
                <View
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(18, 18, 22, 0.85)',
                    padding: Spacing.md,
                    marginBottom: Spacing.lg,
                    flexDirection: "row",
                    gap: Spacing.sm,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                    overflow: 'hidden',
                  }}
                >
                  {/* Purple glow for Energy */}
                  <View style={{
                    position: 'absolute',
                    left: -20,
                    top: -20,
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    opacity: 0.3,
                  }} />

                  {/* Pink glow for Players */}
                  <View style={{
                    position: 'absolute',
                    right: -20,
                    top: -20,
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    opacity: 0.3,
                  }} />

                  <View style={{ flex: 1, alignItems: "center", paddingVertical: Spacing.sm }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: Spacing.xs,
                      borderWidth: 1,
                      borderColor: 'rgba(168, 85, 247, 0.3)',
                      shadowColor: Colors.accent.purple.light,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      elevation: 4,
                    }}>
                      <Ionicons name="flash" size={18} color={Colors.accent.purple.light} />
                    </View>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.lg,
                        fontWeight: Typography.weight.bold,
                        marginBottom: 2,
                      }}
                    >
                      {normalizeScoreForDisplay(eventStats.totalEnergy).toLocaleString()}
                    </Text>
                    <Text style={{ color: Colors.text.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Energy
                    </Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                  <View style={{ flex: 1, alignItems: "center", paddingVertical: Spacing.sm }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(236, 72, 153, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: Spacing.xs,
                      borderWidth: 1,
                      borderColor: 'rgba(236, 72, 153, 0.3)',
                      shadowColor: Colors.accent.pink.light,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      elevation: 4,
                    }}>
                      <Ionicons name="people" size={18} color={Colors.accent.pink.light} />
                    </View>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.lg,
                        fontWeight: Typography.weight.bold,
                        marginBottom: 2,
                      }}
                    >
                      {eventStats.participantCount}
                    </Text>
                    <Text style={{ color: Colors.text.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Players
                    </Text>
                  </View>
                </View>
              )}

              {/* Leaderboard - Top 5 visible, rest scrollable inside */}
              <View
                style={{
                  borderRadius: BorderRadius['2xl'],
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(18, 18, 22, 0.85)',
                  padding: Spacing.xl,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text
                  style={{
                    color: Colors.text.secondary,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    marginBottom: Spacing.lg,
                    opacity: 0.7,
                  }}
                >
                  Top 10 Leaderboard
                </Text>

                {loadingLeaderboard ? (
                  <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
                    <ActivityIndicator color={Colors.accent.purple.light} size="large" />
                  </View>
                ) : leaderboard.length > 0 ? (
                  <>
                    {/* Top 5 - Always visible */}
                    <View style={{ gap: Spacing.xs, marginBottom: leaderboard.length > 5 ? Spacing.xs : 0 }}>
                      {leaderboard.slice(0, 5).map((entry, index) => {
                        return (
                          <View
                            key={entry.user_id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              padding: Spacing.md,
                              borderRadius: BorderRadius.xl,
                              backgroundColor: index < 3 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                              borderWidth: index < 3 ? 1 : 0,
                              borderColor: index < 3 ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            }}
                          >
                            {/* Rank Badge */}
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                backgroundColor: index === 0 ? 'rgba(255, 215, 0, 0.2)' : index === 1 ? 'rgba(192, 192, 192, 0.2)' : index === 2 ? 'rgba(205, 127, 50, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                borderWidth: 1.5,
                                borderColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255, 255, 255, 0.1)',
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: Spacing.sm,
                              }}
                            >
                              <Text
                                style={{
                                  color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : Colors.text.primary,
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
                                  fontSize: Typography.size.sm,
                                  fontWeight: Typography.weight.semibold,
                                }}
                              >
                                {entry.display_name}
                              </Text>
                              {entry.is_live && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <View style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: 2.5,
                                    backgroundColor: Colors.status.live,
                                  }} />
                                  <Text
                                    style={{
                                      color: Colors.status.live,
                                      fontSize: 10,
                                      fontWeight: Typography.weight.medium,
                                    }}
                                  >
                                    Live
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Energy Score */}
                            <View style={{ alignItems: "flex-end" }}>
                              <Text
                                style={{
                                  color: Colors.text.primary,
                                  fontSize: Typography.size.base,
                                  fontWeight: Typography.weight.bold,
                                }}
                              >
                                {normalizeScoreForDisplay(entry.score || 0).toLocaleString()}
                              </Text>
                              <Text
                                style={{
                                  color: Colors.text.muted,
                                  fontSize: 10,
                                }}
                              >
                                energy
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Rest (6-10) - Scrollable inside leaderboard */}
                    {leaderboard.length > 5 && (
                      <ScrollView
                        style={{ maxHeight: 200 }}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        <View style={{ gap: Spacing.xs }}>
                          {leaderboard.slice(5, 10).map((entry, idx) => {
                            const index = idx + 5; // Actual index (5-9)
                            return (
                              <View
                                key={entry.user_id}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  padding: Spacing.md,
                                  borderRadius: BorderRadius.xl,
                                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                }}
                              >
                                {/* Rank Badge */}
                                <View
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 9,
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: Spacing.sm,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: Colors.text.primary,
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
                                      fontSize: Typography.size.sm,
                                      fontWeight: Typography.weight.semibold,
                                    }}
                                  >
                                    {entry.display_name}
                                  </Text>
                                  {entry.is_live && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                      <View style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: 2.5,
                                        backgroundColor: Colors.status.live,
                                      }} />
                                      <Text
                                        style={{
                                          color: Colors.status.live,
                                          fontSize: 10,
                                          fontWeight: Typography.weight.medium,
                                        }}
                                      >
                                        Live
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Energy Score */}
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text
                                    style={{
                                      color: Colors.text.primary,
                                      fontSize: Typography.size.base,
                                      fontWeight: Typography.weight.bold,
                                    }}
                                  >
                                    {normalizeScoreForDisplay(entry.score || 0).toLocaleString()}
                                  </Text>
                                  <Text
                                    style={{
                                      color: Colors.text.muted,
                                      fontSize: 10,
                                    }}
                                  >
                                    energy
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    )}
                  </>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: Spacing['3xl'] }}>
                    <View style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: Spacing.md,
                    }}>
                      <Ionicons name="trophy" size={32} color={Colors.accent.purple.light} />
                    </View>
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
              </View>

              {/* Join Event Button - Only shown when opening from Live Events */}
              {showJoinButton && (
                <View style={{ marginTop: Spacing.xl, paddingBottom: Spacing.lg }}>
                  <View style={{ overflow: 'hidden', borderRadius: BorderRadius.xl }}>
                    {/* Glow effect layer - Blue */}
                    <View style={{
                      position: 'absolute', top: -50, right: -50, width: 110, height: 110,
                      borderRadius: 55, backgroundColor: 'rgba(59, 130, 246, 0.3)', zIndex: 0,
                    }} />
                    <View style={{
                      position: 'absolute', bottom: -50, left: -50, width: 100, height: 100,
                      borderRadius: 50, backgroundColor: 'rgba(59, 130, 246, 0.25)', zIndex: 0,
                    }} />

                    <Pressable
                      onPress={async () => {
                        try {
                          // Save event_id to AsyncStorage
                          await AsyncStorage.setItem("event_id", event.event_id);

                          // Close modal and navigate to movement screen
                          onClose();
                          router.push(`/move?event_id=${event.event_id}`);
                        } catch (error) {
                          console.error("Error joining event:", error);
                        }
                      }}
                    >
                      {({ pressed }) => (
                        <LinearGradient
                          colors={[
                            'rgba(30, 32, 38, 0.85)',
                            'rgba(38, 42, 50, 0.85)',
                            'rgba(32, 35, 42, 0.85)',
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            paddingVertical: Spacing.lg,
                            paddingHorizontal: Spacing.lg,
                            borderRadius: BorderRadius.xl,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: Spacing.sm,
                            borderWidth: 2,
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            opacity: pressed ? 0.85 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            shadowColor: 'rgba(59, 130, 246, 0.5)',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 12,
                            elevation: 8,
                          }}
                        >
                          <Ionicons name="enter-outline" size={24} color="#60a5fa" />
                          <Text
                            style={{
                              color: "#ffffff",
                              fontWeight: Typography.weight.bold,
                              fontSize: Typography.size.lg,
                            }}
                          >
                            Join Event
                          </Text>
                        </LinearGradient>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
