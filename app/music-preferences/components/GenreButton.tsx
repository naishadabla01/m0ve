// components/GenreButton.tsx - Floating circular genre button with glassmorphic design
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../../constants/Design';

interface GenreButtonProps {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GenreButton({ label, emoji, selected, onPress }: GenreButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, { margin: Spacing.sm }]}
    >
      <LinearGradient
        colors={
          selected
            ? [Colors.accent.purple.light, Colors.accent.pink.light]
            : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 88,
          height: 88,
          borderRadius: BorderRadius.full,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? Colors.accent.purple.light : 'rgba(192, 192, 192, 0.3)',
          ...Shadows.md,
        }}
      >
        <Text style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</Text>
        <Text
          style={{
            color: selected ? Colors.text.primary : Colors.text.muted,
            fontSize: Typography.size.xs,
            fontWeight: selected ? Typography.weight.bold : Typography.weight.semibold,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}
