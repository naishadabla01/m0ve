// app/call.tsx - Video Call Screen with LiveKit
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/Design';
import {
  LiveKitRoom,
  VideoTrack,
  useParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

export default function CallScreen() {
  const { callSessionId, roomName } = useLocalSearchParams<{ callSessionId: string; roomName: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCallToken();
  }, [callSessionId, roomName]);

  const fetchCallToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Fetch LiveKit URL from env or database
      // For now, you'll need to set this in your environment
      const url = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://your-project.livekit.cloud';
      setLivekitUrl(url);

      // Call your backend API to get LiveKit token
      // You'll need to create this API endpoint
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || ''}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          participantName: user.email || user.id,
          participantId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get call token');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err: any) {
      console.error('Error fetching call token:', err);
      setError(err.message || 'Failed to join call');
      Alert.alert('Error', err.message || 'Failed to join call');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update participant status
      await supabase
        .from('call_participants')
        .update({
          left_at: new Date().toISOString(),
        })
        .eq('call_session_id', callSessionId)
        .eq('user_id', user.id);

      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error ending call:', error);
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: Spacing.lg,
          }}
        >
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
          <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base }}>
            Connecting to call...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !token || !livekitUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: Spacing.xl,
            gap: Spacing.lg,
          }}
        >
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size.xl,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Unable to join call
          </Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              textAlign: 'center',
            }}
          >
            {error || 'Failed to connect'}
          </Text>
          <Pressable onPress={() => router.back()}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              style={{
                paddingHorizontal: Spacing.xl,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.base,
                  fontWeight: '600',
                }}
              >
                Go Back
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      audio={true}
      video={true}
    >
      <CallRoomContent onEndCall={handleEndCall} />
    </LiveKitRoom>
  );
}

function CallRoomContent({ onEndCall }: { onEndCall: () => void }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const toggleMute = () => {
    room.localParticipant.setMicrophoneEnabled(isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    room.localParticipant.setCameraEnabled(isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video Area */}
      <View style={{ flex: 1 }}>
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <VideoTrack
              key={track.participant.identity}
              trackRef={track}
              style={{ flex: 1 }}
            />
          ))
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: Colors.background.primary,
            }}
          >
            <Ionicons name="videocam-off" size={64} color={Colors.text.muted} />
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.base,
                marginTop: Spacing.md,
              }}
            >
              Waiting for video...
            </Text>
          </View>
        )}
      </View>

      {/* Participant Count */}
      <View
        style={{
          position: 'absolute',
          top: 60,
          right: Spacing.lg,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderRadius: BorderRadius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.xs,
        }}
      >
        <Ionicons name="people" size={16} color={Colors.text.primary} />
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size.sm,
            fontWeight: '600',
          }}
        >
          {participants.length}
        </Text>
      </View>

      {/* Control Bar */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 40,
          paddingTop: 60,
          paddingHorizontal: Spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: Spacing.xl,
          }}
        >
          {/* Mute Button */}
          <Pressable onPress={toggleMute}>
            {({ pressed }) => (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: 2,
                  borderColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={28}
                  color="white"
                />
              </View>
            )}
          </Pressable>

          {/* End Call Button */}
          <Pressable onPress={onEndCall}>
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
                  ...Shadows.xl,
                }}
              >
                <Ionicons name="call" size={32} color="white" />
              </View>
            )}
          </Pressable>

          {/* Video Toggle Button */}
          <Pressable onPress={toggleVideo}>
            {({ pressed }) => (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: 2,
                  borderColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <Ionicons
                  name={isVideoOff ? 'videocam-off' : 'videocam'}
                  size={28}
                  color="white"
                />
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
