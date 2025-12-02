// components/energy/EnergyProgressBar.tsx - Energy goal progress bar with badge preview
import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, BorderRadius, Spacing, Typography, Shadows, Gradients } from '../../constants/Design';
import { getEnergyLevel } from '../../constants/MusicPersonalization';

interface EnergyProgressBarProps {
  currentPoints: number;
  goalLevel: string;
  onPress?: () => void;
}

export function EnergyProgressBar({ currentPoints, goalLevel, onPress }: EnergyProgressBarProps) {
  const level = getEnergyLevel(goalLevel);
  const progress = Math.min((currentPoints / level.points) * 100, 100);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const isComplete = currentPoints >= level.points;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={Gradients.glass.medium}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: Colors.border.glass,
            padding: Spacing.lg,
            opacity: pressed ? 0.9 : 1,
            ...Shadows.md,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Text style={{ fontSize: 24 }}>{level.emoji}</Text>
              <View>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs }}>
                  Energy Goal
                </Text>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.bold }}>
                  {level.label}
                </Text>
              </View>
            </View>

            {isComplete && (
              <View
                style={{
                  backgroundColor: level.color + '30',
                  paddingHorizontal: Spacing.sm,
                  paddingVertical: 4,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: level.color + '60',
                }}
              >
                <Text style={{ color: level.color, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold }}>
                  ✓ UNLOCKED
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: BorderRadius.full,
              overflow: 'hidden',
              marginBottom: Spacing.sm,
            }}
          >
            <Animated.View style={[animatedProgressStyle]}>
              <LinearGradient
                colors={level.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%' }}
              />
            </Animated.View>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
              {currentPoints.toLocaleString()} / {level.points.toLocaleString()} pts
            </Text>
            <Text style={{ color: level.color, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold }}>
              {progress.toFixed(0)}%
            </Text>
          </View>

          {/* Next Level Hint */}
          {!isComplete && (
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: Spacing.xs, textAlign: 'center' }}>
              {(level.points - currentPoints).toLocaleString()} pts to unlock badge
            </Text>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}
