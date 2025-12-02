// app/(home)/index.tsx - iOS 26 Redesigned Home Page
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import { eventEmitter } from "@/lib/events";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { Event } from "./types";
import { EventListSection } from "./components/EventListSection";
import { JoinEventModal } from "./components/JoinEventModal";
import { LiveEventDetailsModal } from "./components/LiveEventDetailsModal";
import { UpcomingEventModal } from "./components/UpcomingEventModal";
import { OngoingEventsComponent } from "./components/OngoingEventsComponent";
import { PastEventsComponent } from "./components/PastEventsComponent";
import { LiveEventCard } from "./components/LiveEventCard";
import { CircularProgressIndicator } from "../../components/energy/CircularProgressIndicator";
import { EnergyStatsModal } from "../../components/energy/EnergyStatsModal";
import { getEnergyLevel } from "../../constants/MusicPersonalization";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  console.log('🔴 [HOME] HomeScreen component rendering/re-rendering');

  const [displayName, setDisplayName] = useState<string>("");
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<Event | null>(null);
  const [selectedUpcomingEvent, setSelectedUpcomingEvent] = useState<Event | null>(null);
  const [userEnergyPoints, setUserEnergyPoints] = useState<number>(0);
  const [userEnergyGoalLevel, setUserEnergyGoalLevel] = useState<string>('chill');
  const [showEnergyStatsModal, setShowEnergyStatsModal] = useState(false);

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

  // Auto-show Event Details modal when coming back from Movement Screen
  useEffect(() => {
    console.log('🔄 [HOME] ========== CHECKING EVENT DETAILS FLAG ==========');
    console.log('🔄 [HOME] Current activeEvent:', activeEvent);

    const checkShouldShowEventDetails = async () => {
      const shouldShow = await AsyncStorage.getItem("shouldShowEventDetails");
      console.log('🔄 [HOME] shouldShowEventDetails flag value:', shouldShow);

      if (shouldShow === "true") {
        // Clear the flag immediately
        await AsyncStorage.removeItem("shouldShowEventDetails");
        console.log('🔄 [HOME] ✅ Flag cleared, preparing to show modal');

        if (activeEvent) {
          console.log('✅ [HOME] activeEvent exists! Name:', activeEvent.name);
          console.log('✅ [HOME] Setting selectedEventForDetails to show modal');
          setSelectedEventForDetails(activeEvent);
        } else {
          console.warn('⚠️ [HOME] shouldShowEventDetails flag is true but activeEvent is NULL');
          console.log('🔄 [HOME] Attempting fallback: reload event from AsyncStorage...');

          // Fallback: Load event from AsyncStorage if not in state
          try {
            const savedEventId = await AsyncStorage.getItem("event_id");
            console.log('🔄 [HOME] Fallback - Saved event ID:', savedEventId);

            if (savedEventId) {
              const { data: event } = await supabase
                .from("events")
                .select("*")
                .eq("event_id", savedEventId)
                .single();

              if (event) {
                console.log('✅ [HOME] Fallback - Event loaded, showing modal:', event.name);
                setActiveEvent(event);
                setSelectedEventForDetails(event);
              }
            }
          } catch (error) {
            console.error('❌ [HOME] Fallback error:', error);
          }
        }
      } else {
        console.log('🔄 [HOME] No flag detected (flag is null or false)');
      }
      console.log('🔄 [HOME] ================================================');
    };

    checkShouldShowEventDetails();
  }, [activeEvent]);

  // Auto-show modal when screen comes into focus (handles iOS gesture back)
  useFocusEffect(
    useCallback(() => {
      console.log('👀 [HOME] ========== SCREEN FOCUSED ==========');
      console.log('👀 [HOME] activeEvent on focus:', activeEvent);

      const checkAndShowModal = async () => {
        const shouldShow = await AsyncStorage.getItem("shouldShowEventDetails");
        console.log('👀 [HOME] shouldShowEventDetails flag on focus:', shouldShow);

        if (shouldShow === "true" && activeEvent) {
          console.log('👀 [HOME] ✅ Showing modal for:', activeEvent.name);
          await AsyncStorage.removeItem("shouldShowEventDetails");
          setSelectedEventForDetails(activeEvent);
        }
        console.log('👀 [HOME] ==========================================');
      };

      const reloadEnergyGoal = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("energy_goal_level")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile) {
            setUserEnergyGoalLevel(profile.energy_goal_level || 'chill');
          }
        } catch (error) {
          console.error('Failed to reload energy goal:', error);
        }
      };

      checkAndShowModal();
      reloadEnergyGoal();
    }, [activeEvent])
  );

  // Close modal when screen comes back into focus (after navigation)
  // Removed - was causing modal to stay open during navigation
  // Modal now closes automatically when navigation completes

  // Load joined event from AsyncStorage
  useEffect(() => {
    console.log('🟢 [HOME] useEffect - Load joined event from AsyncStorage');
    let isMounted = true;

    (async () => {
      try {
        const savedEventId = await AsyncStorage.getItem("event_id");
        console.log('🟢 [HOME] Saved event ID from AsyncStorage:', savedEventId);
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

        // Compute actual status based on time
        const now = new Date();
        let actualStatus = event.status;

        if (event.ended_at || event.status === 'ended') {
          actualStatus = 'ended';
        } else if (event.end_at && new Date(event.end_at) < now) {
          actualStatus = 'ended';
        } else if (event.start_at && new Date(event.start_at) > now) {
          actualStatus = 'scheduled';
        } else if (event.start_at && new Date(event.start_at) <= now) {
          actualStatus = 'live';
        }

        // Check if event has ended
        if (actualStatus === 'ended') {
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
    console.log('🟡 [HOME] useEffect - Load user data and events');
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

      // Check if user has set up music preferences (onboarding check)
      const { data: musicPrefs } = await supabase
        .from("user_music_preferences")
        .select("genres")
        .eq("user_id", uid)
        .maybeSingle();

      // If no music preferences, redirect to onboarding
      if (!musicPrefs && isMounted) {
        console.log('🎵 [HOME] No music preferences found, redirecting to onboarding');
        router.replace("/music-preferences");
        return;
      }

      // Load profile with energy goal data
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, first_name, last_name, energy_goal_level, energy_goal_points")
        .eq("user_id", uid)
        .maybeSingle();

      if (isMounted && profile) {
        setDisplayName(
          (profile.display_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Mover") as string
        );
        setUserEnergyGoalLevel(profile.energy_goal_level || 'chill');
      }

      // Load user's total energy points from all events
      const { data: totalEnergyData } = await supabase
        .from("user_total_energy")
        .select("total_energy")
        .eq("user_id", uid)
        .maybeSingle();

      if (isMounted && totalEnergyData) {
        setUserEnergyPoints(totalEnergyData.total_energy || 0);
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

        // Map events to include artist_name and compute actual status dynamically
        const mappedEvents = events.map((event: any) => {
          // Compute actual status based on time, not just database field
          let actualStatus = event.status;

          // If event has been explicitly ended
          if (event.ended_at || event.status === 'ended') {
            actualStatus = 'ended';
          }
          // If event has end_at and it's passed
          else if (event.end_at && new Date(event.end_at) < now) {
            actualStatus = 'ended';
          }
          // If event hasn't started yet
          else if (event.start_at && new Date(event.start_at) > now) {
            actualStatus = 'scheduled';
          }
          // Event is currently happening
          else if (event.start_at && new Date(event.start_at) <= now) {
            actualStatus = 'live';
          }

          return {
            ...event,
            artist_name: artistMap.get(event.artist_id) || null,
            actualStatus, // computed status based on current time
          };
        });

        // Ongoing events: scheduled (upcoming) or live (currently happening)
        const ongoing = mappedEvents.filter(e => {
          return e.actualStatus === 'scheduled' || e.actualStatus === 'live';
        });

        // Past events: events that have ended
        const past = mappedEvents.filter(e => {
          return e.actualStatus === 'ended';
        });

        console.log("✅ Ongoing events:", ongoing.length);
        console.log("🏁 Past events:", past.length);
        console.log("Ongoing:", ongoing.map(e => ({ name: e.name, artist: e.artist_name, status: e.actualStatus, db_status: e.status, start_at: e.start_at })));

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

        {/* Welcome Message - Artistic with Circular Progress */}
        <View style={{ marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
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
            </View>

            {/* Circular Progress Indicator */}
            <View style={{ marginTop: 8 }}>
              <CircularProgressIndicator
                progress={Math.min((userEnergyPoints / getEnergyLevel(userEnergyGoalLevel).points) * 100, 100)}
                size={45}
                strokeWidth={4}
                onPress={() => setShowEnergyStatsModal(true)}
              />
            </View>
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

        {/* Active Event Card - Apple Music Style with Green Accent */}
        {activeEvent && (
          <View
            style={{
              borderRadius: BorderRadius['2xl'],
              borderWidth: 2,
              borderColor: '#34d399', // Green border (Tailwind green-400)
              backgroundColor: 'rgba(18, 18, 22, 0.95)', // Dark background like event cards
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
              ...Shadows.xl,
            }}
          >
            <Pressable
              onPress={() => {
                console.log('🔵 [HOME] Joined Event card clicked');
                console.log('🔵 [HOME] Event ID:', activeEvent.event_id);
                console.log('🔵 [HOME] Event Name:', activeEvent.name || activeEvent.title);
                console.log('🔵 [HOME] About to navigate to move screen');
                try {
                  router.push({
                    pathname: '/move',
                    params: { event_id: activeEvent.event_id }
                  });
                  console.log('🔵 [HOME] router.push called successfully');
                } catch (error) {
                  console.error('🔴 [HOME] Navigation error:', error);
                }
              }}
              style={{ opacity: 1 }}
            >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.xs }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: BorderRadius.full,
                      backgroundColor: '#34d399', // Green dot
                      shadowColor: '#34d399',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 4,
                    }}
                  />
                  <Text
                    style={{
                      color: '#34d399', // Green text
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
              {/* Start Moving Button - Green gradient (card is already clickable) */}
              <LinearGradient
                colors={['#10b981', '#34d399']} // Green gradient (Tailwind green-500 to green-400)
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.lg,
                  alignItems: "center",
                  ...Shadows.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name="play-circle" size={20} color="#ffffff" />
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.sm,
                    }}
                  >
                    Start Moving
                  </Text>
                </View>
              </LinearGradient>

              {/* Exit Event Button */}
              <Pressable
                onPress={async (e) => {
                  e?.stopPropagation?.();
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
                      borderWidth: 1.5,
                      borderColor: 'rgba(239, 68, 68, 0.5)', // Toned down red border (50% opacity)
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.text.primary, // White text
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
          </Pressable>
          </View>
        )}

        {/* Ongoing Events Component */}
        <OngoingEventsComponent
          events={ongoingEvents}
          onShowDetails={(event) => {
            // Show correct modal based on event status
            if (event.actualStatus === 'scheduled') {
              setSelectedUpcomingEvent(event);
            } else if (event.actualStatus === 'live') {
              setSelectedEventForDetails(event);
            } else {
              // For ended or unknown status, show modal
              setSelectedEventForDetails(event);
            }
          }}
        />

        {/* Past Events Component */}
        <PastEventsComponent
          events={pastEvents}
          onShowDetails={(event) => {
            // For past events, could route to event-ended.tsx in the future
            setSelectedEventForDetails(event);
          }}
        />
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
        liveEvents={ongoingEvents.filter(e => e.actualStatus === 'live')}
        activeEvent={activeEvent}
        setActiveEvent={setActiveEvent}
        LiveEventCard={LiveEventCard}
      />

      {/* Live Event Details Modal - Rendered inside SafeAreaView */}
      {selectedEventForDetails && (
        <>
          {console.log('🎯 [HOME] RENDERING LiveEventDetailsModal for event:', selectedEventForDetails.name)}
          <LiveEventDetailsModal
            event={selectedEventForDetails}
            onClose={() => {
              console.log('🎯 [HOME] LiveEventDetailsModal onClose called');
              setSelectedEventForDetails(null);
            }}
            showJoinButton={false}
          />
        </>
      )}

      {/* Upcoming Event Modal - Rendered inside SafeAreaView */}
      {selectedUpcomingEvent && (
        <UpcomingEventModal
          event={selectedUpcomingEvent}
          onClose={() => {
            setSelectedUpcomingEvent(null);
          }}
        />
      )}

      {/* Energy Stats Modal */}
      <EnergyStatsModal
        visible={showEnergyStatsModal}
        onClose={() => setShowEnergyStatsModal(false)}
        currentPoints={userEnergyPoints}
        goalLevel={userEnergyGoalLevel}
        onChangeGoal={() => {
          setShowEnergyStatsModal(false);
          router.push('/(home)/profile');
        }}
      />
    </SafeAreaView>
  );
}
