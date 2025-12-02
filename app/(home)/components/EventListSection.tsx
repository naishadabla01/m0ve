// components/EventListSection.tsx - Reusable Event List with Horizontal Scroll & Modal
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Image,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Gradients, BorderRadius, Spacing, Typography } from '../../../constants/Design';

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
  actualStatus?: 'live' | 'ended' | 'scheduled';
}

interface EventListSectionProps {
  title: string;
  events: Event[];
  onShowDetails: (event: Event) => void;
  isPast?: boolean;
  emptyIcon?: string;
  emptyMessage?: string;
}

export function EventListSection({
  title,
  events,
  onShowDetails,
  isPast = false,
  emptyIcon = '🎉',
  emptyMessage = 'No events right now'
}: EventListSectionProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;

  // Dynamic constants based on screen width
  const CONTAINER_MARGIN = 64;
  const CONTAINER_WIDTH = screenWidth - CONTAINER_MARGIN;
  const PAGE_SPACING = 16;
  const SNAP_INTERVAL = CONTAINER_WIDTH + PAGE_SPACING;
  const IMAGE_SIZE = 80;
  const IMAGE_MARGIN = 12;
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
          setMenuVisible(null);
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
              padding: IMAGE_MARGIN - 2,
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
                {!isPast && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: event.actualStatus === 'live' ? '#10b981' : '#3b82f6',
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

                {/* Artist Name with Verified Badge */}
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

              {/* Bottom section: Location */}
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

          {/* Popup Menu */}
          {menuVisible === event.event_id && (
            <>
              {/* Backdrop to close menu */}
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

                {/* Divider */}
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

      {/* Separator line */}
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
      {/* Title with > arrow */}
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

          {/* Pagination Dots */}
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
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setShowAllEvents(false)}
        >
          <View style={{ flex: 1, backgroundColor: Colors.background.primary }}>
            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.xl,
                  paddingTop: 60,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border.glass,
                  backgroundColor: Colors.background.primary,
                }}
              >
                <Pressable
                  onPress={() => {
                    console.log('📱 [HOME] Closing All Events modal');
                    setShowAllEvents(false);
                  }}
                  style={{
                    padding: Spacing.sm,
                    marginLeft: -Spacing.sm,
                    marginRight: Spacing.md,
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

              {/* Scrollable list */}
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
                        {/* Event Cover Image */}
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
                                  backgroundColor: event.actualStatus === 'live' ? '#10b981' : '#3b82f6',
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

                        {/* LIVE indicator */}
                        {!isPast && event.actualStatus === 'live' && (
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
