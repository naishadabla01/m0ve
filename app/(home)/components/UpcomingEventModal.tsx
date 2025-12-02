// components/UpcomingEventModal.tsx - Upcoming Event Details Modal
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
  ActivityIndicator,
  Image,
  PanResponder,
  Alert,
  Linking,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '@/lib/supabase/client';
import { Colors, BorderRadius, Spacing, Typography } from '../../../constants/Design';
import { Event } from '../types';
import { EventPostsFeed } from './EventPostsFeed';

interface UpcomingEventModalProps {
  event: Event;
  onClose: () => void;
}

export function UpcomingEventModal({ event, onClose }: UpcomingEventModalProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');

  // Check registration status on mount
  useEffect(() => {
    checkRegistrationStatus();
  }, [event.event_id]);

  async function checkRegistrationStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingRegistration(false);
        return;
      }

      const { data, error } = await supabase
        .from("event_participants")
        .select("user_id")
        .eq("event_id", event.event_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setIsRegistered(true);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
    } finally {
      setCheckingRegistration(false);
    }
  }

  async function handleSignUp() {
    setSigningUp(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to sign up");
        setSigningUp(false);
        return;
      }

      const { error } = await supabase
        .from("event_participants")
        .insert({
          event_id: event.event_id,
          user_id: user.id,
          joined_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert("Already Registered", "You're already signed up for this event!");
          setIsRegistered(true);
        } else {
          throw error;
        }
      } else {
        setIsRegistered(true);
        Alert.alert(
          "Success!",
          "You've successfully signed up for this event. You'll be able to join when it starts!",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      Alert.alert("Error", error.message || "Failed to sign up. Please try again.");
    } finally {
      setSigningUp(false);
    }
  }

  async function handleUnregister() {
    // Show confirmation alert before unregistering
    Alert.alert(
      "Cancel Registration",
      "Are you sure you want to cancel your registration for this event?",
      [
        {
          text: "No, Keep Registration",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setSigningUp(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert("Error", "You must be logged in");
                setSigningUp(false);
                return;
              }

              const { error } = await supabase
                .from("event_participants")
                .delete()
                .eq("event_id", event.event_id)
                .eq("user_id", user.id);

              if (error) {
                throw error;
              } else {
                setIsRegistered(false);
                Alert.alert(
                  "Registration Cancelled",
                  "You've been unregistered from this event.",
                  [{ text: "OK" }]
                );
              }
            } catch (error: any) {
              console.error("Error unregistering:", error);
              Alert.alert("Error", error.message || "Failed to cancel registration. Please try again.");
            } finally {
              setSigningUp(false);
            }
          }
        }
      ]
    );
  }

  // Calculate duration
  const calculateDuration = () => {
    if (!event.start_at || !event.end_at) return "TBA";
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  // Show action sheet with map options
  const showMapOptions = () => {
    if (!event.location) {
      Alert.alert('Location Unavailable', 'No location set for this event.');
      return;
    }

    const address = encodeURIComponent(event.location);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Open in Apple Maps', 'Open in Google Maps', 'Copy Address'],
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark',
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          // Apple Maps
          const url = `maps://maps.apple.com/?q=${address}`;
          try {
            await Linking.openURL(url);
          } catch (error) {
            console.error('Error opening Apple Maps:', error);
            Alert.alert('Error', 'Could not open Apple Maps.');
          }
        } else if (buttonIndex === 2) {
          // Google Maps
          const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
          try {
            await Linking.openURL(url);
          } catch (error) {
            console.error('Error opening Google Maps:', error);
            Alert.alert('Error', 'Could not open Google Maps.');
          }
        } else if (buttonIndex === 3) {
          // Copy Address
          Alert.alert('Address Copied', event.location);
        }
      }
    );
  };

  // Animation values
  const translateY = useRef(new Animated.Value(1000)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);

  // Entrance animation
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

  // Pan responder for swipe-to-close gesture
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          handleClose();
        } else {
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
            shadowColor: Colors.accent.purple.light,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 20,
            transform: [{ translateY }],
            opacity: modalOpacity,
            overflow: 'hidden',
            borderTopLeftRadius: BorderRadius['3xl'],
            borderTopRightRadius: BorderRadius['3xl'],
          }}
        >
          {/* Simple Background */}
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

          {/* Content Container */}
          <View style={{ flex: 1 }}>
            {/* Cover Image at Top - Entire area is draggable */}
            <View
              {...headerPanResponder.panHandlers}
              style={{ position: 'relative' }}
            >
              {event.cover_image_url ? (
                <Image
                  source={{ uri: event.cover_image_url }}
                  style={{
                    width: '100%',
                    height: 220,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[
                    'rgba(168, 85, 247, 0.4)',
                    'rgba(236, 72, 153, 0.4)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: 220,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 64 }}>🎵</Text>
                </LinearGradient>
              )}

              {/* UPCOMING Badge - Top Right of Cover */}
              <View
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.md,
                }}
              >
                <Ionicons name="calendar-outline" size={14} color="#60a5fa" />
                <Text
                  style={{
                    color: '#60a5fa',
                    fontSize: 12,
                    fontWeight: Typography.weight.bold,
                    letterSpacing: 0.5,
                  }}
                >
                  UPCOMING
                </Text>
              </View>

              {/* Handle Bar - Visual indicator for swipe gesture */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  paddingVertical: Spacing.md,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 6,
                    borderRadius: BorderRadius.full,
                    backgroundColor: '#fff',
                    opacity: 0.7,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                />
              </View>

              {/* Enhanced Gradient Fade at Bottom of Cover for smooth transition */}
              <LinearGradient
                colors={[
                  'rgba(0, 0, 0, 0)',
                  'rgba(0, 0, 0, 0.3)',
                  'rgba(0, 0, 0, 0.7)',
                  Colors.background.primary,
                ]}
                locations={[0, 0.3, 0.7, 1]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 120,
                  pointerEvents: 'none',
                }}
              />
            </View>

            {/* Event Title & Artist - Below Cover */}
            <View
              style={{
                paddingHorizontal: Spacing.xl,
                paddingTop: Spacing.lg,
                paddingBottom: Spacing.md,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size['3xl'],
                  fontWeight: Typography.weight.bold,
                  marginBottom: Spacing.xs,
                  letterSpacing: 0.3,
                }}
              >
                {event.name || event.title || 'Untitled Event'}
              </Text>

              {/* Artist Name with Verified Badge */}
              {event.artist_name && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: '#60a5fa',
                      fontSize: Typography.size.base,
                      fontWeight: Typography.weight.semibold,
                    }}
                  >
                    {event.artist_name}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#60a5fa" />
                </View>
              )}
            </View>

            {/* Tab Buttons */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: Spacing.xl,
                gap: Spacing.sm,
                marginBottom: Spacing.md,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                paddingVertical: Spacing.xs,
                borderRadius: BorderRadius.xl,
                marginHorizontal: Spacing.xl,
              }}
            >
              <Pressable
                onPress={() => setActiveTab('details')}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: activeTab === 'details' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  borderWidth: activeTab === 'details' ? 1 : 0,
                  borderColor: activeTab === 'details' ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: activeTab === 'details' ? Colors.text.primary : Colors.text.muted,
                    fontSize: Typography.size.base,
                    fontWeight: activeTab === 'details' ? Typography.weight.bold : Typography.weight.medium,
                    textAlign: 'center',
                  }}
                >
                  Details
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('updates')}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: activeTab === 'updates' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  borderWidth: activeTab === 'updates' ? 1 : 0,
                  borderColor: activeTab === 'updates' ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: activeTab === 'updates' ? Colors.text.primary : Colors.text.muted,
                    fontSize: Typography.size.base,
                    fontWeight: activeTab === 'updates' ? Typography.weight.bold : Typography.weight.medium,
                    textAlign: 'center',
                  }}
                >
                  Feed
                </Text>
              </Pressable>
            </View>

            {/* Scrollable Content */}
            {activeTab === 'details' ? (
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: Spacing.xl,
                paddingBottom: 120, // Space for sign up button
              }}
            >
              {/* Event Details Box - Venue, Times, Duration */}
              <View
                style={{
                  borderRadius: BorderRadius['2xl'],
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  padding: Spacing.xl,
                  marginBottom: Spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                {/* Venue */}
                <View style={{ marginBottom: Spacing.md, flexDirection: 'row', gap: 12 }}>
                  <Ionicons name="business-outline" size={28} color="#a855f7" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: 10,
                        fontWeight: Typography.weight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        marginBottom: 6,
                      }}
                    >
                      VENUE
                    </Text>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.medium,
                      }}
                    >
                      {event.location || 'TBA'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: Spacing.md }} />

                {/* Start Time */}
                <View style={{ marginBottom: Spacing.md, flexDirection: 'row', gap: 12 }}>
                  <Ionicons name="time-outline" size={28} color="#60a5fa" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: 10,
                        fontWeight: Typography.weight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        marginBottom: 6,
                      }}
                    >
                      START TIME
                    </Text>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.medium,
                      }}
                    >
                      {event.start_at ? new Date(event.start_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : 'TBA'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: Spacing.md }} />

                {/* End Time */}
                <View style={{ marginBottom: Spacing.md, flexDirection: 'row', gap: 12 }}>
                  <Ionicons name="alarm-outline" size={28} color="#ec4899" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: 10,
                        fontWeight: Typography.weight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        marginBottom: 6,
                      }}
                    >
                      END TIME
                    </Text>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.medium,
                      }}
                    >
                      {event.end_at ? new Date(event.end_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : 'TBA'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: Spacing.md }} />

                {/* Duration */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Ionicons name="hourglass-outline" size={28} color="#10b981" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: 10,
                        fontWeight: Typography.weight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                        marginBottom: 6,
                      }}
                    >
                      DURATION
                    </Text>
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.medium,
                      }}
                    >
                      {calculateDuration()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Location Box - Separate with Map */}
              {event.location && (
                <View
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    padding: Spacing.xl,
                    marginBottom: Spacing.lg,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 10,
                  }}
                >
                  {/* Location Header */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: Spacing.md }}>
                    <Ionicons name="location-sharp" size={24} color="#a855f7" />
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.lg,
                        fontWeight: Typography.weight.bold,
                      }}
                    >
                      Location
                    </Text>
                  </View>

                  {/* Map Preview */}
                  <Pressable onPress={showMapOptions}>
                    <View
                      style={{
                        height: 160,
                        borderRadius: BorderRadius.xl,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      <MapView
                        style={{ flex: 1 }}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={{
                          latitude: 34.0522,
                          longitude: -118.2437,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                      >
                        <Marker
                          coordinate={{
                            latitude: 34.0522,
                            longitude: -118.2437,
                          }}
                          pinColor="#a855f7"
                        />
                      </MapView>
                      {/* Tap hint overlay */}
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          right: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.75)',
                          borderRadius: BorderRadius.md,
                        }}
                      >
                        <Ionicons name="map" size={16} color="#fff" />
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: Typography.weight.semibold,
                          }}
                        >
                          Tap to open in Maps
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              )}
            </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <EventPostsFeed eventId={event.event_id} />
              </View>
            )}
          </View>

          {/* Floating Sign Up Button at Bottom - Only show in Details tab */}
          {activeTab === 'details' && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: Spacing.xl,
              paddingVertical: Spacing.lg,
              paddingBottom: Spacing['2xl'],
            }}
          >
            <Pressable
              onPress={isRegistered ? handleUnregister : handleSignUp}
              disabled={signingUp}
            >
              {({ pressed }) => (
                <LinearGradient
                  colors={isRegistered
                    ? ['#f97316', '#ea580c', '#c2410c']  // Orange gradient for cancel
                    : ['#8B5CF6', '#7C3AED', '#6D28D9']  // Purple gradient for sign up
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: Spacing.lg,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: BorderRadius.xl,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: Spacing.sm,
                    opacity: signingUp ? 0.7 : pressed ? 0.9 : 1,
                    shadowColor: isRegistered ? '#f97316' : '#8B5CF6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  {signingUp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name={isRegistered ? "close-circle" : "calendar"}
                        size={24}
                        color="#ffffff"
                      />
                      <Text
                        style={{
                          color: "#ffffff",
                          fontWeight: Typography.weight.bold,
                          fontSize: Typography.size.lg,
                        }}
                      >
                        {isRegistered ? "Cancel Registration" : "Sign Up for Event"}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              )}
            </Pressable>

            {isRegistered && (
              <Text
                style={{
                  marginTop: Spacing.sm,
                  color: Colors.text.muted,
                  fontSize: Typography.size.xs,
                  textAlign: "center",
                }}
              >
                You're registered · Tap to cancel registration
              </Text>
            )}
          </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
