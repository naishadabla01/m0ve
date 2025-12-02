// components/LiveEventDetailsModal.tsx - Live Event Details Modal with Leaderboard
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
  Linking,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '@/lib/supabase/client';
import { normalizeScoreForDisplay } from '@/lib/scoreUtils';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../../constants/Design';
import { Event } from '../types';
import { EventPostsFeed } from './EventPostsFeed';

interface EventDetailsModalProps {
  event: Event;
  onClose: () => void;
  onCloseParent?: () => void;
  showJoinButton?: boolean;
  isJoining?: boolean;
  setIsJoining?: (joining: boolean) => void;
}

export function LiveEventDetailsModal({
  event,
  onClose,
  onCloseParent,
  showJoinButton = false,
  isJoining = false,
  setIsJoining = () => {}
}: EventDetailsModalProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [eventStats, setEventStats] = useState<{ totalEnergy: number; participantCount: number } | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');

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

  // Calculate event duration
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
          // We'll use Clipboard API
          Alert.alert('Address Copied', event.location);
        }
      }
    );
  };

  // Open location in Maps app (quick action from Navigate button)
  const openLocationInMaps = async () => {
    if (!event.location) {
      Alert.alert('Location Unavailable', 'No location set for this event.');
      return;
    }

    const address = encodeURIComponent(event.location);

    // Platform-specific Maps URLs
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${address}`,
      android: `geo:0,0?q=${address}`,
      default: `https://www.google.com/maps/search/?api=1&query=${address}`,
    });

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Google Maps web URL
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Could not open maps application.');
    }
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

              {/* LIVE NOW Badge - Top Right of Cover */}
              {event.actualStatus === 'live' && (
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
                      fontSize: 12,
                      fontWeight: Typography.weight.bold,
                      letterSpacing: 0.5,
                    }}
                  >
                    LIVE NOW
                  </Text>
                </View>
              )}

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
                {event.name || event.title || event.short_code || 'Untitled Event'}
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
                paddingBottom: Spacing['3xl'],
              }}
              onScroll={(e) => {
                const offsetY = e.nativeEvent.contentOffset.y;
                setIsScrolledToTop(offsetY <= 0);
              }}
              scrollEventThrottle={16}
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

              {/* Event Stats - Collapsible */}
              {eventStats && (
                <View
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    marginBottom: Spacing.lg,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 10,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header - Clickable */}
                  <Pressable
                    onPress={() => setIsStatsExpanded(!isStatsExpanded)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: Spacing.lg,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="stats-chart" size={20} color={Colors.accent.purple.light} />
                      <Text
                        style={{
                          color: Colors.text.primary,
                          fontSize: Typography.size.base,
                          fontWeight: Typography.weight.bold,
                        }}
                      >
                        Event Stats
                      </Text>
                    </View>
                    <Ionicons
                      name={isStatsExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={Colors.text.muted}
                    />
                  </Pressable>

                  {/* Expanded Content */}
                  {isStatsExpanded && (
                    <>
                      <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <View
                        style={{
                          padding: Spacing.md,
                          flexDirection: "row",
                          gap: Spacing.sm,
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
                    </>
                  )}
                </View>
              )}

              {/* Leaderboard - Collapsible with Top 3 */}
              <View
                style={{
                  borderRadius: BorderRadius['2xl'],
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                {/* Header - Clickable */}
                <Pressable
                  onPress={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: Spacing.lg,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="trophy" size={20} color="#FFD700" />
                    <Text
                      style={{
                        color: Colors.text.primary,
                        fontSize: Typography.size.base,
                        fontWeight: Typography.weight.bold,
                      }}
                    >
                      Leaderboard
                    </Text>
                  </View>
                  <Ionicons
                    name={isLeaderboardExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={Colors.text.muted}
                  />
                </Pressable>

                {loadingLeaderboard ? (
                  <View style={{ alignItems: "center", paddingVertical: Spacing['2xl'] }}>
                    <ActivityIndicator color={Colors.accent.purple.light} size="large" />
                  </View>
                ) : isLeaderboardExpanded ? (
                  leaderboard.length > 0 ? (
                    <View style={{ padding: Spacing.lg }}>
                      {/* Top 10 - Shown when expanded */}
                      <View style={{ gap: Spacing.xs, marginBottom: Spacing.md }}>
                        {leaderboard.slice(0, 10).map((entry, index) => {
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

                    {/* View All Button */}
                    <Pressable
                      onPress={() => {
                        // Navigate to full leaderboard screen with slide animation
                        router.push(`/leaderboard?event_id=${event.event_id}`);
                      }}
                      style={({ pressed }) => ({
                        paddingVertical: Spacing.md,
                        paddingHorizontal: Spacing.lg,
                        borderRadius: BorderRadius.xl,
                        backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.3)',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: Colors.accent.purple.light,
                          fontSize: Typography.size.sm,
                          fontWeight: Typography.weight.bold,
                        }}
                      >
                        View All
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={Colors.accent.purple.light} />
                    </Pressable>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", paddingVertical: Spacing['3xl'], padding: Spacing.lg }}>
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
                  )
                ) : null}
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
                        const eventId = event.event_id;

                        // Close modals and navigate simultaneously
                        if (onCloseParent) {
                          onCloseParent();
                        } else {
                          onClose();
                        }

                        // Do DB operations and set flag BEFORE navigation
                        try {
                          await AsyncStorage.setItem("event_id", eventId);

                          // Set flag to show Event Details modal when user returns from Movement Screen
                          await AsyncStorage.setItem("shouldShowEventDetails", "true");
                          console.log('✅ [EVENT-DETAILS] Set shouldShowEventDetails flag to true');

                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          await supabase
                            .from("event_participants")
                            .upsert({
                              event_id: eventId,
                              user_id: user.id,
                              joined_at: new Date().toISOString(),
                            }, {
                              onConflict: 'event_id,user_id'
                            });

                          // Navigate AFTER saving everything
                          router.push({
                            pathname: '/move',
                            params: { event_id: eventId }
                          });
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
            ) : (
              /* Updates Tab - Event Posts Feed */
              <View style={{ flex: 1 }}>
                <EventPostsFeed eventId={event.event_id} />
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>

    </Modal>
  );
}
