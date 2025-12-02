// components/EnergyLevelCard.tsx - Energy level selection card with badge preview
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../../constants/Design';

interface EnergyLevelCardProps {
  emoji: string;
  label: string;
  description: string;
  points: number;
  gradient: string[];
  selected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EnergyLevelCard({
  emoji,
  label,
  description,
  points,
  gradient,
  selected,
  onPress,
}: EnergyLevelCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, { marginBottom: Spacing.lg }]}
    >
      <LinearGradient
        colors={
          selected
            ? gradient as [string, string]
            : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: BorderRadius['2xl'],
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? gradient[0] : 'rgba(255, 255, 255, 0.2)',
          padding: Spacing.xl,
          ...Shadows.xl,
        }}
      >
        {/* Badge Preview */}
        <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: BorderRadius.full,
              backgroundColor: selected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: selected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)',
              ...Shadows.lg,
            }}
          >
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>
        </View>

        {/* Level Info */}
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size['2xl'],
            fontWeight: Typography.weight.bold,
            textAlign: 'center',
            marginBottom: Spacing.xs,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            color: selected ? Colors.text.primary : Colors.text.muted,
            fontSize: Typography.size.sm,
            textAlign: 'center',
            marginBottom: Spacing.md,
            opacity: 0.9,
          }}
        >
          {description}
        </Text>

        {/* Points Goal */}
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: BorderRadius.lg,
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.xs,
              marginBottom: 2,
            }}
          >
            Goal
          </Text>
          <Text
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size.xl,
              fontWeight: Typography.weight.bold,
            }}
          >
            {points.toLocaleString()} pts
          </Text>
        </View>

        {/* Selected Indicator */}
        {selected && (
          <View
            style={{
              position: 'absolute',
              top: Spacing.md,
              right: Spacing.md,
              width: 32,
              height: 32,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>✓</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}
