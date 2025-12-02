// components/events/EventSignUpModal.tsx - Modal for event registration
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/Design';
import { supabase } from '@/lib/supabase/client';

interface EventSignUpModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: string;
  onSuccess?: () => void;
}

interface RegistrationStats {
  total_registered: number;
  max_participants: number | null;
  slots_available: number | null;
  registration_open: boolean;
}

export function EventSignUpModal({
  visible,
  onClose,
  eventId,
  eventName,
  eventDate,
  onSuccess,
}: EventSignUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadRegistrationStats();
      checkIfRegistered();
    }
  }, [visible, eventId]);

  const loadRegistrationStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_event_registration_stats', { p_event_id: eventId });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Failed to load registration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfRegistered = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsRegistered(!!data);
    } catch (error) {
      console.error('Failed to check registration status:', error);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to register for this event');
        return;
      }

      // Check if registration is still open and has slots
      if (!stats?.registration_open) {
        alert('Registration for this event is closed');
        return;
      }

      if (stats.slots_available !== null && stats.slots_available <= 0) {
        alert('This event is full. You will be added to the waitlist.');
      }

      // Determine registration status
      const status =
        stats.slots_available !== null && stats.slots_available <= 0
          ? 'waitlist'
          : 'registered';

      const { error } = await supabase.from('event_registrations').insert({
        event_id: eventId,
        user_id: user.id,
        registration_status: status,
      });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          alert('You are already registered for this event');
        } else {
          throw error;
        }
        return;
      }

      setIsRegistered(true);
      onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to register for event:', error);
      alert(error.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={{
              width: '100%',
              transform: [{ translateY: panY }],
            }}
            {...panResponder.panHandlers}
          >
            <BlurView
              intensity={100}
              tint="dark"
              style={{
                width: '100%',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={['rgba(28, 28, 30, 0.95)', 'rgba(18, 18, 20, 0.98)']}
                style={{
                  paddingHorizontal: Spacing.xl,
                  paddingTop: Spacing.lg,
                  paddingBottom: 40,
                  minHeight: 400,
                }}
              >
                {/* Handle Bar */}
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: Spacing.lg,
                    marginBottom: Spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 6,
                      borderRadius: BorderRadius.full,
                      backgroundColor: 'rgba(142, 142, 147, 0.5)',
                    }}
                  />
                </View>

                {/* Header */}
                <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: `${Colors.accent.purple.light}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: Spacing.sm,
                      borderWidth: 1,
                      borderColor: `${Colors.accent.purple.light}40`,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="calendar-check"
                      size={36}
                      color={Colors.accent.purple.light}
                    />
                  </View>
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size.xl,
                      fontWeight: Typography.weight.bold,
                      textAlign: 'center',
                    }}
                  >
                    {isRegistered ? 'Already Registered' : 'Register for Event'}
                  </Text>
                </View>

                {/* Event Info */}
                <View
                  style={{
                    backgroundColor: 'rgba(99, 99, 102, 0.15)',
                    borderRadius: BorderRadius.lg,
                    padding: Spacing.md,
                    marginBottom: Spacing.lg,
                    borderWidth: 1,
                    borderColor: 'rgba(142, 142, 147, 0.2)',
                  }}
                >
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size.lg,
                      fontWeight: Typography.weight.semibold,
                      marginBottom: Spacing.xs,
                    }}
                  >
                    {eventName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={16}
                      color={Colors.text.muted}
                    />
                    <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                      {formatDate(eventDate)}
                    </Text>
                  </View>
                </View>

                {loading ? (
                  <View style={{ paddingVertical: Spacing.xl, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.accent.purple.light} />
                  </View>
                ) : (
                  <>
                    {/* Registration Stats */}
                    {stats && (
                      <View
                        style={{
                          backgroundColor: 'rgba(99, 99, 102, 0.15)',
                          borderRadius: BorderRadius.lg,
                          padding: Spacing.md,
                          marginBottom: Spacing.lg,
                          borderWidth: 1,
                          borderColor: 'rgba(142, 142, 147, 0.2)',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: Spacing.xs,
                          }}
                        >
                          <Text
                            style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}
                          >
                            Registered
                          </Text>
                          <Text
                            style={{
                              color: Colors.text.primary,
                              fontSize: Typography.size.sm,
                              fontWeight: Typography.weight.semibold,
                            }}
                          >
                            {stats.total_registered}
                            {stats.max_participants && ` / ${stats.max_participants}`}
                          </Text>
                        </View>

                        {stats.slots_available !== null && (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text
                              style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}
                            >
                              Spots Available
                            </Text>
                            <Text
                              style={{
                                color:
                                  stats.slots_available > 0
                                    ? '#30d158'
                                    : Colors.accent.pink.light,
                                fontSize: Typography.size.sm,
                                fontWeight: Typography.weight.semibold,
                              }}
                            >
                              {stats.slots_available > 0
                                ? stats.slots_available
                                : 'Waitlist Only'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action Buttons */}
                    {isRegistered ? (
                      <View
                        style={{
                          backgroundColor: 'rgba(48, 209, 88, 0.15)',
                          paddingVertical: 14,
                          borderRadius: BorderRadius.lg,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: 'rgba(48, 209, 88, 0.3)',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.xs,
                          }}
                        >
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={20}
                            color="#30d158"
                          />
                          <Text
                            style={{
                              color: '#30d158',
                              fontSize: Typography.size.md,
                              fontWeight: Typography.weight.semibold,
                            }}
                          >
                            You're Registered!
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        onPress={handleRegister}
                        disabled={registering || !stats?.registration_open}
                      >
                        {({ pressed }) => (
                          <View
                            style={{
                              backgroundColor:
                                !stats?.registration_open
                                  ? 'rgba(99, 99, 102, 0.3)'
                                  : Colors.accent.purple.light,
                              paddingVertical: 14,
                              borderRadius: BorderRadius.lg,
                              alignItems: 'center',
                              opacity: pressed ? 0.7 : 1,
                            }}
                          >
                            {registering ? (
                              <ActivityIndicator color={Colors.text.primary} />
                            ) : (
                              <Text
                                style={{
                                  color: Colors.text.primary,
                                  fontSize: Typography.size.md,
                                  fontWeight: Typography.weight.semibold,
                                }}
                              >
                                {!stats?.registration_open
                                  ? 'Registration Closed'
                                  : stats?.slots_available === 0
                                  ? 'Join Waitlist'
                                  : 'Register Now'}
                              </Text>
                            )}
                          </View>
                        )}
                      </Pressable>
                    )}

                    {/* Info Text */}
                    <Text
                      style={{
                        color: Colors.text.muted,
                        fontSize: Typography.size.xs,
                        textAlign: 'center',
                        marginTop: Spacing.md,
                      }}
                    >
                      You must be at the venue to join the event
                    </Text>
                  </>
                )}
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
