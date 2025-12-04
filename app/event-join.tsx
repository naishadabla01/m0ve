// app/event-join.tsx - Pre-Join Event Modal (shown after scanning QR)
import { supabase } from "@/lib/supabase/client";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";
import { isUserAtVenue, isWithinEntryWindow, getCurrentLocation } from "@root/lib/geofencing";
import { EventSignUpModal } from "@components/events/EventSignUpModal";

const { height, width } = Dimensions.get("window");

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
  venue_latitude?: number | null;
  venue_longitude?: number | null;
  venue_radius_meters?: number | null;
  requires_registration?: boolean;
}

export default function EventJoinScreen() {
  const params = useLocalSearchParams();
  const event_id_param = params.event_id as string | undefined;
  const code_param = params.code as string | undefined;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadEventDetails();
  }, [event_id_param, code_param]);

  useEffect(() => {
    if (!loading && event) {
      // Animate modal in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, event]);

  async function loadEventDetails() {
    if (!event_id_param && !code_param) return;

    try {
      let query = supabase.from("events").select("*");

      if (event_id_param) {
        query = query.eq("event_id", event_id_param);
      } else if (code_param) {
        query = query.eq("short_code", code_param);
      }

      const { data: eventData, error: eventError } = await query.single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Check if user is registered for this event
      setCheckingRegistration(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && eventData.event_id) {
        const { data: registration } = await supabase
          .from("event_registrations")
          .select("*")
          .eq("event_id", eventData.event_id)
          .eq("user_id", user.id)
          .single();

        setIsRegistered(!!registration);
      }
      setCheckingRegistration(false);
    } catch (error) {
      console.error("Error loading event details:", error);
      setCheckingRegistration(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinEvent() {
    if (!event || joining) return;

    setJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // a) Check if event requires registration AND user is not registered
      if (event.requires_registration && !isRegistered) {
        Alert.alert(
          "Registration Required",
          "This event requires registration. Please register to join.",
          [{ text: "OK" }]
        );
        setJoining(false);
        setShowSignUpModal(true);
        return;
      }

      // b) Check if within entry time window
      // DISABLED FOR EXPO GO TESTING - Entry allowed anytime
      // const entryWindowCheck = await isWithinEntryWindow(event.event_id);
      // if (!entryWindowCheck.isValid) {
      //   Alert.alert(
      //     "Entry Time Restriction",
      //     entryWindowCheck.error || "You cannot join at this time",
      //     [{ text: "OK" }]
      //   );
      //   setJoining(false);
      //   return;
      // }

      // c) Check if user is at venue
      // DISABLED FOR EXPO GO TESTING - Geolocation doesn't work reliably in Expo Go
      // const venueCheck = await isUserAtVenue(event.event_id);
      // if (!venueCheck.isValid) {
      //   Alert.alert(
      //     "Location Verification Failed",
      //     venueCheck.error || "You must be at the venue to join",
      //     [{ text: "OK" }]
      //   );
      //   setJoining(false);
      //   return;
      // }

      // d) All checks passed - proceed with join logic
      // Get current location for storing coordinates
      // DISABLED FOR EXPO GO TESTING - Location fetching doesn't work reliably
      const location = null; // await getCurrentLocation();

      // Insert participant (permanent join) with venue verification data
      const { error: participantError } = await supabase
        .from("event_participants")
        .insert({
          event_id: event.event_id,
          user_id: user.id,
          verified_at_venue: false, // Disabled for Expo Go testing
          join_latitude: null, // location?.coords.latitude || null,
          join_longitude: null, // location?.coords.longitude || null,
        })
        .select()
        .single();

      if (participantError) {
        const msg = String(participantError.message || "");
        const isDuplicate = msg.includes("duplicate key value") || msg.includes("event_participants_pkey");
        if (!isDuplicate) throw participantError;
      }

      // If user is registered, update their check-in status
      if (isRegistered) {
        await supabase
          .from("event_registrations")
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
            check_in_latitude: null, // location?.coords.latitude || null,
            check_in_longitude: null, // location?.coords.longitude || null,
          })
          .eq("event_id", event.event_id)
          .eq("user_id", user.id);
      }

      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem("event_id", event.event_id);

      // Set flag to show Event Details modal when user returns from Movement Screen
      await AsyncStorage.setItem("shouldShowEventDetails", "true");
      console.log('✅ [EVENT-JOIN] Set shouldShowEventDetails flag to true');

      // Close modal with animation first, THEN navigate
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Navigate to Movement Screen after modal closes
        // Use replace to remove event-join from stack
        router.replace({
          pathname: "/move",
          params: { event_id: event.event_id },
        });
      });
    } catch (error: any) {
      console.error("Error joining event:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to join event. Please try again.",
        [{ text: "OK" }]
      );
      setJoining(false);
    }
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Dark Backdrop */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.xl,
        }}
        onPress={handleClose}
      >
        {loading ? (
          <View style={{ padding: Spacing.xl }}>
            <ActivityIndicator size="large" color={Colors.accent.purple.light} />
          </View>
        ) : !event ? (
          <View style={{ alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name="alert-circle" size={64} color={Colors.text.muted} />
            <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: "600" }}>
              Event not found
            </Text>
            <Pressable onPress={handleClose}>
              <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size.base }}>Go Back</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: '100%',
              maxWidth: 440,
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View
                style={{
                  borderRadius: BorderRadius['3xl'],
                  overflow: 'hidden',
                  backgroundColor: 'rgba(20, 20, 25, 0.95)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  ...Shadows.xl,
                  shadowColor: '#a855f7',
                  shadowOpacity: 0.3,
                  shadowRadius: 24,
                }}
              >
                {/* Close Button */}
                <Pressable
                  onPress={handleClose}
                  style={{
                    position: 'absolute',
                    top: Spacing.lg,
                    right: Spacing.lg,
                    zIndex: 10,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </Pressable>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: height * 0.75 }}
                  contentContainerStyle={{ padding: Spacing['2xl'] }}
                >
                  {/* Event Cover */}
                  <View
                    style={{
                      borderRadius: BorderRadius['2xl'],
                      overflow: 'hidden',
                      height: 200,
                      marginBottom: Spacing.xl,
                      ...Shadows.lg,
                    }}
                  >
                    {event.cover_image_url ? (
                      <Image
                        source={{ uri: event.cover_image_url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 60 }}>🎵</Text>
                      </LinearGradient>
                    )}

                    {/* Live Badge */}
                    <View
                      style={{
                        position: 'absolute',
                        top: Spacing.md,
                        right: Spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.xs,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.lg,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: Colors.status.live,
                        }}
                      />
                      <Text style={{ color: Colors.status.live, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold }}>
                        LIVE NOW
                      </Text>
                    </View>
                  </View>

                  {/* Event Title */}
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size['3xl'],
                      fontWeight: Typography.weight.bold,
                      lineHeight: 36,
                      marginBottom: Spacing.md,
                    }}
                  >
                    {event.title || event.name}
                  </Text>

                  {/* Event Location */}
                  {event.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xl }}>
                      <Ionicons name="location" size={20} color={Colors.accent.purple.light} />
                      <Text style={{ color: Colors.text.secondary, fontSize: Typography.size.base }}>
                        {event.location}
                      </Text>
                    </View>
                  )}

                  {/* Leaderboard Locked */}
                  <View
                    style={{
                      borderRadius: BorderRadius.xl,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      padding: Spacing.xl,
                      alignItems: 'center',
                      marginBottom: Spacing.xl,
                    }}
                  >
                    <Ionicons name="lock-closed" size={32} color={Colors.accent.purple.light} />
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.semibold,
                        marginTop: Spacing.sm,
                        textAlign: 'center',
                      }}
                    >
                      Join to See Leaderboard
                    </Text>
                  </View>

                  {/* JOIN Button */}
                  <Pressable onPress={handleJoinEvent} disabled={joining}>
                    {({ pressed }) => (
                      <View
                        style={{
                          paddingVertical: Spacing.lg + 2,
                          borderRadius: BorderRadius.xl,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: '#10b981',
                          opacity: joining ? 0.7 : pressed ? 0.85 : 1,
                          ...Shadows.lg,
                        }}
                      >
                        {joining ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text
                            style={{
                              color: "#ffffff",
                              fontWeight: Typography.weight.bold,
                              fontSize: Typography.size.lg,
                              letterSpacing: 0.5,
                            }}
                          >
                            {event.requires_registration && !isRegistered ? "Register to Join" : "Join Event"}
                          </Text>
                        )}
                      </View>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>

      <EventSignUpModal
        visible={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        eventId={event?.event_id || ''}
        eventName={event?.title || event?.name || ''}
        eventDate={event?.start_at || ''}
        onSuccess={() => {
          setIsRegistered(true);
          setShowSignUpModal(false);
        }}
      />
    </Modal>
  );
}
