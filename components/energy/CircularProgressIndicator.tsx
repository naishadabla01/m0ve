// components/energy/CircularProgressIndicator.tsx - Compact circular progress for header
import React from 'react';
import { Pressable, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../constants/Design';

interface CircularProgressIndicatorProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
}

export function CircularProgressIndicator({
  progress,
  size = 52,
  strokeWidth = 5,
  onPress
}: CircularProgressIndicatorProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  // Color based on progress
  const getProgressColor = () => {
    if (progress < 33) return '#ef4444'; // Red for low
    if (progress < 66) return '#f59e0b'; // Orange for medium
    return '#10b981'; // Green for high
  };

  const progressColor = getProgressColor();

  return (
    <Pressable onPress={onPress}>
      <View style={{
        width: size,
        height: size,
        position: 'relative',
        shadowColor: progressColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 8,
      }}>
        {/* Outer glow */}
        <View style={{
          position: 'absolute',
          width: size + 4,
          height: size + 4,
          left: -2,
          top: -2,
          borderRadius: (size + 4) / 2,
          backgroundColor: progressColor,
          opacity: 0.15,
        }} />

        {/* Background circle with depth */}
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(28, 28, 30, 0.8)',
          borderWidth: 2,
          borderColor: 'rgba(99, 99, 102, 0.3)',
          position: 'absolute',
        }} />

        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(99, 99, 102, 0.25)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Percentage text in center */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Text style={{
            color: Colors.text.primary,
            fontSize: 11,
            fontWeight: '700',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
