// components/LiveEventCard.tsx - Live Event Card Component
import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../../constants/Design';
import { Event } from '../types';
import { LiveEventDetailsModal } from './LiveEventDetailsModal';

interface LiveEventCardProps {
  event: Event;
  onJoin: () => void;
  activeEvent: Event | null;
  setActiveEvent: (event: Event | null) => void;
  isJoining: boolean;
  setIsJoining: (joining: boolean) => void;
}

export function LiveEventCard({
  event,
  onJoin,
  activeEvent,
  setActiveEvent,
  isJoining,
  setIsJoining,
}: LiveEventCardProps) {
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
          event={event}
          onClose={() => {
            setShowDetailsModal(false);
            // Don't close parent JoinEventModal - just close details modal
          }}
          onCloseParent={() => {
            // Close both details modal and parent JoinEventModal
            setShowDetailsModal(false);
            onJoin();
          }}
          showJoinButton={true}
          isJoining={isJoining}
          setIsJoining={setIsJoining}
        />
      )}
    </>
  );
}
