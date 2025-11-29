// components/IncomingCallModal.tsx - Global incoming call popup
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Image,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Design';
import ENV from '../config/env';

interface IncomingCall {
  callSessionId: string;
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  roomName: string;
  eventName: string;
}

export function IncomingCallModal() {
  console.log('🆕 [v2] IncomingCallModal LOADED - New version with correct key');

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Pulse animation for incoming call
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    console.log('🔌 [IncomingCallModal] Setting up Realtime subscription...');
    console.log('🔌 [IncomingCallModal] User ID:', userId);
    console.log('🔌 [IncomingCallModal] Supabase URL:', ENV.SUPABASE_URL);

    const channel = supabase
      .channel(`incoming-calls:${userId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_participants',
          filter: `user_id=eq.${userId}`,  // Filter at subscription level
        },
        async (payload) => {
          console.log('🔥 [IncomingCallModal] RAW INSERT EVENT RECEIVED');
          console.log('🔥 [IncomingCallModal] Payload:', JSON.stringify(payload.new, null, 2));
          console.log('📞 [IncomingCallModal] ========================================');
          console.log('📞 [IncomingCallModal] INCOMING CALL NOTIFICATION RECEIVED!!!');
          console.log('📞 [IncomingCallModal] ========================================');
          console.log('📞 [IncomingCallModal] Payload:', JSON.stringify(payload, null, 2));

          // Fetch call details
          console.log('📞 [IncomingCallModal] Fetching call session details for ID:', payload.new.call_session_id);
          const { data: callData, error: callDataError } = await supabase
            .from('call_sessions')
            .select(`
              id,
              room_name,
              event:events(name),
              artist:profiles!call_sessions_artist_id_fkey(display_name, avatar_url, user_id)
            `)
            .eq('id', payload.new.call_session_id)
            .eq('status', 'active')
            .single();

          if (callDataError) {
            console.error('❌ [IncomingCallModal] Error fetching call data:', callDataError);
            return;
          }

          console.log('📞 [IncomingCallModal] Call data:', JSON.stringify(callData, null, 2));

          if (callData) {
            // Type assertion for nested relations
            const artist = callData.artist as any;
            const event = callData.event as any;

            if (artist && event) {
              console.log('📞 [IncomingCallModal] Showing incoming call modal!');
              console.log('📞 [IncomingCallModal] Artist:', artist.display_name);
              console.log('📞 [IncomingCallModal] Event:', event.name);
              console.log('📞 [IncomingCallModal] Room:', callData.room_name);

              setIncomingCall({
                callSessionId: callData.id,
                artistId: artist.user_id,
                artistName: artist.display_name || 'Artist',
                artistAvatar: artist.avatar_url,
                roomName: callData.room_name,
                eventName: event.name || 'Event',
              });

              // Vibrate to alert user
              Vibration.vibrate([0, 400, 200, 400]);
            } else {
              console.error('❌ [IncomingCallModal] Missing artist or event data');
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('🔌 [IncomingCallModal] Subscription status changed:', status);
        if (err) {
          console.error('❌ [IncomingCallModal] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ [IncomingCallModal] Successfully subscribed to Realtime!');
          console.log('✅ [IncomingCallModal] Listening for INSERTs on call_participants table');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [IncomingCallModal] Channel error:', err || 'Unknown channel error');
          console.error('❌ [IncomingCallModal] Check if Realtime is enabled on call_participants table');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ [IncomingCallModal] Subscription timed out');
          console.error('❌ [IncomingCallModal] Possible causes: Network issue, Realtime not enabled, or RLS policies');
        } else if (status === 'CLOSED') {
          console.log('🔌 [IncomingCallModal] Channel closed');
        }
      });

    return () => {
      console.log('🔌 [IncomingCallModal] Cleaning up subscription...');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Pulse animation when call comes in
  useEffect(() => {
    if (incomingCall) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;

    // Navigate to call screen
    router.push({
      pathname: '/call',
      params: {
        callSessionId: incomingCall.callSessionId,
        roomName: incomingCall.roomName,
      },
    });

    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || !userId) return;

    // Update participant status to declined
    await supabase
      .from('call_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('call_session_id', incomingCall.callSessionId)
      .eq('user_id', userId);

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* Dark overlay */}
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing.xl,
        }}
      >
        {/* Call Card */}
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
            width: '100%',
            maxWidth: 400,
          }}
        >
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.15)', 'rgba(0, 0, 0, 0.5)', 'rgba(236, 72, 153, 0.15)']}
            style={{
              borderRadius: BorderRadius['3xl'],
              padding: Spacing['2xl'],
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              ...Shadows.xl,
            }}
          >
            {/* Incoming call text */}
            <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
              <Ionicons name="videocam" size={48} color={Colors.accent.purple.light} />
              <Text
                style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.sm,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginTop: Spacing.md,
                }}
              >
                Incoming Video Call
              </Text>
            </View>

            {/* Artist Avatar */}
            <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
              {incomingCall.artistAvatar ? (
                <Image
                  source={{ uri: incomingCall.artistAvatar }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    borderWidth: 3,
                    borderColor: Colors.accent.purple.light,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: Colors.accent.purple.light,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="person" size={50} color="white" />
                </View>
              )}
            </View>

            {/* Artist Name */}
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size['2xl'],
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: Spacing.xs,
              }}
            >
              {incomingCall.artistName}
            </Text>

            {/* Event Name */}
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.base,
                textAlign: 'center',
                marginBottom: Spacing['2xl'],
              }}
            >
              {incomingCall.eventName}
            </Text>

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.lg,
                justifyContent: 'center',
              }}
            >
              {/* Decline Button */}
              <Pressable onPress={handleDecline}>
                {({ pressed }) => (
                  <View
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: '#ef4444',
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                      ...Shadows.lg,
                    }}
                  >
                    <Ionicons name="close" size={36} color="white" />
                  </View>
                )}
              </Pressable>

              {/* Accept Button */}
              <Pressable onPress={handleAccept}>
                {({ pressed }) => (
                  <View
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      backgroundColor: '#10b981',
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                      ...Shadows.lg,
                    }}
                  >
                    <Ionicons name="videocam" size={32} color="white" />
                  </View>
                )}
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}
