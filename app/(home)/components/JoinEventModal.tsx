// components/JoinEventModal.tsx - Modal for joining events
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase/client';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../../constants/Design';
import { Event } from '../types';

interface JoinEventModalProps {
  visible: boolean;
  onClose: () => void;
  showCodeInput: boolean;
  setShowCodeInput: (show: boolean) => void;
  eventCode: string;
  setEventCode: (code: string) => void;
  liveEvents: Event[];
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
  LiveEventCard: React.ComponentType<any>;
}

export function JoinEventModal({
  visible,
  onClose,
  showCodeInput,
  setShowCodeInput,
  eventCode,
  setEventCode,
  liveEvents,
  activeEvent,
  setActiveEvent,
  LiveEventCard,
}: JoinEventModalProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  // Trigger animation when modal becomes visible
  useEffect(() => {
    if (visible) {
      setIsJoining(false);
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      blurAnim.setValue(0);

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

      if (actualStatus === 'ended') {
        setErrorMessage("This event has already ended");
        setIsJoining(false);
        return;
      }

      await AsyncStorage.setItem("event_id", event.event_id);

      // Set flag to show Event Details modal when user returns from Movement Screen
      await AsyncStorage.setItem("shouldShowEventDetails", "true");
      console.log('✅ [JOIN-MODAL] Set shouldShowEventDetails flag to true');

      setActiveEvent(event);
      onClose();
      router.push(`/move?event_id=${event.event_id}`);
    } catch (err) {
      console.error("Error joining event:", err);
      setErrorMessage("An unexpected error occurred");
      setIsJoining(false);
    }
  };

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
          <Animated.View
            style={{
              width: "90%",
              maxWidth: 500,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={{ position: 'relative', borderRadius: BorderRadius['2xl'] }}>
                {/* Gloss effect */}
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

                  {/* Scan QR Code Button */}
                  <View style={{ overflow: 'hidden', borderRadius: BorderRadius.xl, marginBottom: Spacing.md }}>
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

                  {/* Enter Code Button */}
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
                            backgroundColor: "rgba(120, 120, 128, 0.16)",
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
                            setErrorMessage("");
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

                  {/* Live Events */}
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
                            isJoining={isJoining}
                            setIsJoining={setIsJoining}
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
