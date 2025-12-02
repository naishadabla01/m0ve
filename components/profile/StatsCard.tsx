// components/profile/StatsCard.tsx - Modern stats card with icons
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';

interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  gradient: [string, string];
  iconColor: string;
  onPress?: () => void;
}

export function StatsCard({ icon, value, label, gradient, iconColor, onPress }: StatsCardProps) {
  const content = (
    <LinearGradient
      colors={[
        'rgba(28, 28, 30, 0.6)',
        'rgba(18, 18, 20, 0.8)',
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: Spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 110,
      }}
    >
      {/* Colored glow in corner */}
      <View
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: iconColor,
          opacity: 0.15,
        }}
      />

      {/* Icon container */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${iconColor}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.sm,
          borderWidth: 1,
          borderColor: `${iconColor}40`,
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
      </View>

      {/* Value */}
      <Text
        style={{
          fontSize: Typography.size['3xl'],
          fontWeight: Typography.weight.bold,
          color: Colors.text.primary,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>

      {/* Label */}
      <Text
        style={{
          fontSize: Typography.size.xs,
          color: Colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        {({ pressed }) => (
          <View style={{ flex: 1, opacity: pressed ? 0.8 : 1 }}>
            {content}
          </View>
        )}
      </Pressable>
    );
  }

  return <View style={{ flex: 1 }}>{content}</View>;
}
