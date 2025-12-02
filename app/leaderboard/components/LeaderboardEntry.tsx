// components/LeaderboardEntry.tsx - Individual leaderboard entry row
import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, Typography, Shadows, Gradients } from '../../../constants/Design';
import { LeaderboardEntry as LeaderboardEntryType } from '../types';
import { getRankEmoji, getRankColor } from '../utils';
import { normalizeScoreForDisplay } from '@/lib/scoreUtils';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  currentUserId: string | null;
}

export function LeaderboardEntry({ entry, currentUserId }: LeaderboardEntryProps) {
  const isCurrentUser = currentUserId && entry.user_id === currentUserId;
  const isTop3 = entry.rank <= 3;

  return (
    <LinearGradient
      colors={
        isCurrentUser
          ? ['rgba(168, 85, 247, 0.15)', 'rgba(236, 72, 153, 0.15)']
          : Gradients.glass.medium
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.sm,
        borderWidth: isCurrentUser ? 2 : 1,
        borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
        ...Shadows.sm,
      }}
    >
      {/* Rank */}
      <View style={{ width: 60, alignItems: "center" }}>
        {getRankEmoji(entry.rank) ? (
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 32 }}>{getRankEmoji(entry.rank)}</Text>
          </View>
        ) : (
          <Text
            style={{
              color: isCurrentUser ? Colors.accent.purple.light : Colors.text.muted,
              fontSize: Typography.size.xl,
              fontWeight: '700',
            }}
          >
            #{entry.rank}
          </Text>
        )}
      </View>

      {/* Profile Picture */}
      {entry.profile_picture_url ? (
        <Image
          source={{ uri: entry.profile_picture_url }}
          style={{
            width: 48,
            height: 48,
            borderRadius: BorderRadius.full,
            borderWidth: 2,
            borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
            marginRight: Spacing.md,
          }}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: BorderRadius.full,
            backgroundColor: isCurrentUser ? 'rgba(168, 85, 247, 0.2)' : Colors.background.elevated,
            borderWidth: 2,
            borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
            alignItems: "center",
            justifyContent: "center",
            marginRight: Spacing.md,
          }}
        >
          <Text style={{ fontSize: 20 }}>👤</Text>
        </View>
      )}

      {/* Name and Score */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: isCurrentUser ? Colors.accent.purple.light : Colors.text.primary,
            fontSize: Typography.size.base,
            fontWeight: '700',
          }}
        >
          {entry.name} {isCurrentUser && "⭐"}
        </Text>
        <Text
          style={{
            color: Colors.text.muted,
            fontSize: Typography.size.sm,
            marginTop: 2,
          }}
        >
          {normalizeScoreForDisplay(entry.score).toLocaleString()} energy
        </Text>
      </View>

      {/* Badge for top 3 */}
      {isTop3 && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: BorderRadius.full,
            backgroundColor: `${getRankColor(entry.rank)}20`,
            borderWidth: 1,
            borderColor: `${getRankColor(entry.rank)}40`,
          }}
        >
          <Text style={{ color: getRankColor(entry.rank), fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
            TOP {entry.rank}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}
