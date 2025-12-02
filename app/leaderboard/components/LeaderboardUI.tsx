// components/LeaderboardUI.tsx - UI components for leaderboard (Header + Title + Empty State)
import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, BorderRadius, Spacing, Typography, Shadows, Gradients } from '../../../constants/Design';

// ========== Leaderboard Header ==========
interface LeaderboardHeaderProps {
  title?: string;
}

export function LeaderboardHeader({ title = "LEADERBOARD" }: LeaderboardHeaderProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          color: Colors.text.primary,
          fontSize: Typography.size['2xl'],
          fontWeight: '600',
          letterSpacing: 2,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
        }}
      >
        {title}
      </Text>
      <Pressable onPress={() => router.back()} style={{ position: 'absolute', right: 0 }}>
        {({ pressed }) => (
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: BorderRadius.full,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
              borderWidth: 1,
              borderColor: Colors.border.glass,
              ...Shadows.md,
            }}
          >
            <Text style={{ fontSize: 20, color: Colors.text.muted }}>✕</Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
}

// ========== Top Performers Title ==========
interface TopPerformersTitleProps {
  count: number;
}

export function TopPerformersTitle({ count }: TopPerformersTitleProps) {
  return (
    <LinearGradient
      colors={Gradients.glass.dark}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        ...Shadows.lg,
      }}
    >
      <Text
        style={{
          color: Colors.text.primary,
          fontSize: Typography.size.lg,
          fontWeight: '600',
          textAlign: "center",
          letterSpacing: 1,
        }}
      >
        Top Performers
      </Text>
      <Text
        style={{
          color: Colors.text.muted,
          fontSize: Typography.size.xs,
          textAlign: "center",
          marginTop: Spacing.xs,
        }}
      >
        {count} dancers competing
      </Text>
    </LinearGradient>
  );
}

// ========== Leaderboard Empty State ==========
export function LeaderboardEmptyState() {
  return (
    <LinearGradient
      colors={Gradients.glass.light}
      style={{
        borderRadius: BorderRadius.xl,
        padding: Spacing['2xl'],
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎵</Text>
      <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base, textAlign: "center" }}>
        No one's moving yet!{'\n'}Be the first to start dancing 💃
      </Text>
    </LinearGradient>
  );
}
