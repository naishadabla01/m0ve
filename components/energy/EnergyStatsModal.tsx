// components/energy/EnergyStatsModal.tsx - Modal showing energy stats
import React, { useRef } from 'react';
import { Modal, View, Text, Pressable, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { getEnergyLevel } from '../../constants/MusicPersonalization';

interface EnergyStatsModalProps {
  visible: boolean;
  onClose: () => void;
  currentPoints: number;
  goalLevel: string;
  onChangeGoal: () => void;
}

export function EnergyStatsModal({
  visible,
  onClose,
  currentPoints,
  goalLevel,
  onChangeGoal
}: EnergyStatsModalProps) {
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const level = getEnergyLevel(goalLevel);
  const progress = Math.min((currentPoints / level.points) * 100, 100);
  const pointsRemaining = Math.max(level.points - currentPoints, 0);
  const isUnlocked = currentPoints >= level.points;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={{
              width: '100%',
              transform: [{ translateY: panY }],
            }}
            {...panResponder.panHandlers}
          >
            <BlurView
            intensity={100}
            tint="dark"
            style={{
              width: '100%',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(28, 28, 30, 0.95)', 'rgba(18, 18, 20, 0.98)']}
              style={{
                paddingHorizontal: Spacing.xl,
                paddingTop: Spacing.lg,
                paddingBottom: 40,
                minHeight: 400,
              }}
            >
              {/* Handle Bar */}
              <View style={{ alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.md }}>
                <View style={{
                  width: 60,
                  height: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: 'rgba(142, 142, 147, 0.5)',
                }} />
              </View>

              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${level.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: Spacing.sm,
                  borderWidth: 1,
                  borderColor: `${level.color}40`,
                }}>
                  <MaterialCommunityIcons
                    name={level.icon as any}
                    size={36}
                    color={level.color}
                  />
                </View>
                <Text style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.xl,
                  fontWeight: Typography.weight.bold
                }}>
                  {level.label}
                </Text>
              </View>

              {/* Compact Stats Card */}
              <View style={{
                backgroundColor: 'rgba(99, 99, 102, 0.15)',
                borderRadius: BorderRadius.lg,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
                borderWidth: 1,
                borderColor: 'rgba(142, 142, 147, 0.2)',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                  <Text style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 13 }}>Your Energy</Text>
                  <Text style={{ color: Colors.text.primary, fontSize: 13, fontWeight: '600' }}>
                    {currentPoints.toLocaleString()} pts
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={{
                  height: 6,
                  backgroundColor: 'rgba(99, 99, 102, 0.3)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: Spacing.xs
                }}>
                  <LinearGradient
                    colors={level.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${progress}%` }}
                  />
                </View>

                {isUnlocked ? (
                  <Text style={{ color: '#30d158', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    ✓ Goal Achieved!
                  </Text>
                ) : (
                  <Text style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 12, textAlign: 'center' }}>
                    {pointsRemaining.toLocaleString()} to goal ({level.points.toLocaleString()} pts)
                  </Text>
                )}
              </View>

              {/* Change Goal Link */}
              <Pressable onPress={onChangeGoal} style={{ alignItems: 'center', marginTop: Spacing.md }}>
                {({ pressed }) => (
                  <Text style={{
                    color: Colors.accent.purple.light,
                    fontSize: 15,
                    fontWeight: '600',
                    opacity: pressed ? 0.6 : 1,
                  }}>
                    Manage Energy Goal →
                  </Text>
                )}
              </Pressable>
            </LinearGradient>
          </BlurView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
