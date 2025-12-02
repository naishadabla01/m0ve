// components/energy/EnergyGoalManagementModal.tsx - Full energy management modal for profile
import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { getEnergyLevel, ENERGY_LEVELS, EnergyLevel } from '../../constants/MusicPersonalization';
import { supabase } from '@/lib/supabase/client';

interface EnergyGoalManagementModalProps {
  visible: boolean;
  onClose: () => void;
  currentPoints: number;
  currentGoalLevel: string;
  onSave?: () => void;
}

export function EnergyGoalManagementModal({
  visible,
  onClose,
  currentPoints,
  currentGoalLevel,
  onSave
}: EnergyGoalManagementModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<EnergyLevel>(currentGoalLevel as EnergyLevel);
  const [saving, setSaving] = useState(false);
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedLevel(currentGoalLevel as EnergyLevel);
    }
  }, [visible, currentGoalLevel]);

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

  const currentLevel = getEnergyLevel(currentGoalLevel);
  const progress = Math.min((currentPoints / currentLevel.points) * 100, 100);
  const pointsRemaining = Math.max(currentLevel.points - currentPoints, 0);
  const isUnlocked = currentPoints >= currentLevel.points;

  const saveEnergyGoal = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save your energy goal');
        return;
      }

      const selectedLevelData = ENERGY_LEVELS.find(l => l.id === selectedLevel);
      if (!selectedLevelData) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          energy_goal_level: selectedLevel,
          energy_goal_points: selectedLevelData.points,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save energy goal:', error);
      alert(error.message || 'Failed to save energy goal');
    } finally {
      setSaving(false);
    }
  };

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

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                style={{ maxHeight: 700 }}
              >
              {/* Compact Header */}
              <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${currentLevel.color}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: Spacing.sm,
                  borderWidth: 1,
                  borderColor: `${currentLevel.color}40`,
                }}>
                  <MaterialCommunityIcons
                    name={currentLevel.icon as any}
                    size={36}
                    color={currentLevel.color}
                  />
                </View>
                <Text style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.xl,
                  fontWeight: Typography.weight.bold
                }}>
                  {currentLevel.label}
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
                  <Text style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 13 }}>Energy</Text>
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
                    colors={currentLevel.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${progress}%` }}
                  />
                </View>

                {isUnlocked ? (
                  <Text style={{ color: '#30d158', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    ✓ Achieved
                  </Text>
                ) : (
                  <Text style={{ color: 'rgba(235, 235, 245, 0.6)', fontSize: 12, textAlign: 'center' }}>
                    {pointsRemaining.toLocaleString()} to go
                  </Text>
                )}
              </View>

              {/* Select Goal */}
              <Text style={{
                color: 'rgba(235, 235, 245, 0.6)',
                fontSize: 13,
                fontWeight: '600',
                marginBottom: Spacing.lg,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textAlign: 'center',
              }}>
                Select Your Goal
              </Text>

              {/* Circular Level Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: Spacing.sm }}>
                {ENERGY_LEVELS.map(level => {
                  const isSelected = selectedLevel === level.id;
                  return (
                    <Pressable
                      key={level.id}
                      onPress={() => setSelectedLevel(level.id)}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      {({ pressed }) => (
                        <View style={{ alignItems: 'center', opacity: pressed ? 0.7 : 1 }}>
                          {/* Circular button */}
                          <View
                            style={{
                              width: 90,
                              height: 90,
                              borderRadius: 45,
                              backgroundColor: isSelected ? `${level.color}30` : `${level.color}15`,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 2,
                              borderColor: isSelected ? level.color : `${level.color}40`,
                              marginBottom: Spacing.sm,
                              shadowColor: isSelected ? level.color : 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.5,
                              shadowRadius: 10,
                              elevation: isSelected ? 8 : 0,
                            }}
                          >
                            <MaterialCommunityIcons
                              name={level.icon as any}
                              size={isSelected ? 40 : 36}
                              color={level.color}
                            />
                          </View>

                          {/* Label */}
                          <Text
                            style={{
                              color: isSelected ? Colors.text.primary : Colors.text.muted,
                              fontSize: 13,
                              fontWeight: isSelected ? '700' : '600',
                              textAlign: 'center',
                              marginBottom: 2,
                            }}
                          >
                            {level.label}
                          </Text>

                          {/* Points */}
                          <Text
                            style={{
                              color: 'rgba(235, 235, 245, 0.5)',
                              fontSize: 11,
                              textAlign: 'center',
                            }}
                          >
                            {level.points.toLocaleString()} pts
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Save Button */}
              <Pressable
                onPress={selectedLevel === currentGoalLevel ? onClose : saveEnergyGoal}
                disabled={saving}
                style={{ marginTop: Spacing.lg }}
              >
                {({ pressed }) => (
                  <View style={{
                    backgroundColor: selectedLevel === currentGoalLevel ? 'rgba(99, 99, 102, 0.3)' : Colors.accent.purple.light,
                    paddingVertical: 14,
                    borderRadius: BorderRadius.lg,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  }}>
                    {saving ? (
                      <ActivityIndicator color={Colors.text.primary} />
                    ) : (
                      <Text style={{
                        color: Colors.text.primary,
                        fontSize: 16,
                        fontWeight: '600'
                      }}>
                        {selectedLevel === currentGoalLevel ? 'Close' : 'Save Goal'}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
              </ScrollView>
            </LinearGradient>
            </BlurView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
