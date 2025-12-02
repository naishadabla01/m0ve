// components/LeaderboardCards.tsx - Card components for leaderboard (Event Info + User Rank)
import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Typography, Shadows, Gradients } from '../../../constants/Design';
import { EventInfo } from '../types';
import { getRankEmoji } from '../utils';
import { normalizeScoreForDisplay } from '@/lib/scoreUtils';

// ========== Event Info Card ==========
interface EventInfoCardProps {
  eventInfo: EventInfo;
}

export function EventInfoCard({ eventInfo }: EventInfoCardProps) {
  return (
    <LinearGradient
      colors={Gradients.glass.medium}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.md,
      }}
    >
      <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "center" }}>
        {eventInfo.cover_image_url ? (
          <Image
            source={{ uri: eventInfo.cover_image_url }}
            style={{
              width: 60,
              height: 60,
              borderRadius: BorderRadius.lg,
              borderWidth: 2,
              borderColor: Colors.border.glass,
            }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
            style={{
              width: 60,
              height: 60,
              borderRadius: BorderRadius.lg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28 }}>🎵</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
            {eventInfo.name || eventInfo.title || "Event"}
          </Text>
          {eventInfo.artist_name && (
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 2 }}>
              by {eventInfo.artist_name}
            </Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

// ========== User Rank Card ==========
interface UserRankCardProps {
  rank: number;
  score: number;
}

export function UserRankCard({ rank, score }: UserRankCardProps) {
  return (
    <LinearGradient
      colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        borderRadius: BorderRadius.xl,
        borderWidth: 2,
        borderColor: Colors.accent.purple.light,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.lg,
      }}
    >
      <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: Spacing.xs, textAlign: "center", fontWeight: '600', letterSpacing: 1 }}>
        YOUR RANK
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
        <Text style={{ fontSize: 48 }}>{getRankEmoji(rank) || "🏅"}</Text>
        <View>
          <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['3xl'], fontWeight: '700' }}>
            #{rank}
          </Text>
          <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
            {normalizeScoreForDisplay(score).toLocaleString()} energy
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
