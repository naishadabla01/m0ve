// app/energy-level/index.tsx - Energy Level Selection Screen (Compact & Polished)
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { ENERGY_LEVELS, EnergyLevel } from '../../constants/MusicPersonalization';

export default function EnergyLevelScreen() {
  const [selectedLevel, setSelectedLevel] = useState<EnergyLevel>('chill');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEnergyGoal();
  }, []);

  const loadEnergyGoal = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('energy_goal_level')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.energy_goal_level) {
        setSelectedLevel(data.energy_goal_level as EnergyLevel);
      }
    } catch (error) {
      console.error('Failed to load energy goal:', error);
    } finally {
      setLoading(false);
    }
  };

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

      router.replace('/(home)');
    } catch (error: any) {
      console.error('Failed to save energy goal:', error);
      alert(error.message || 'Failed to save energy goal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient colors={[Colors.background.primary, Colors.background.secondary]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[Colors.background.primary, Colors.background.secondary]} style={{ flex: 1 }}>
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: Spacing.md,
            left: Spacing.md,
            zIndex: 10,
            padding: Spacing.sm,
          }}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.text.primary} />
        </Pressable>

        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 120 }}>
          {/* Compact Header */}
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>⚡</Text>
            <Text style={{ color: Colors.text.primary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, textAlign: 'center' }}>
              Your Energy Goal
            </Text>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center', marginTop: Spacing.xs }}>
              Choose your challenge
            </Text>
          </View>

          {/* Compact Level Cards */}
          {ENERGY_LEVELS.map(level => {
            const isSelected = selectedLevel === level.id;
            return (
              <Pressable key={level.id} onPress={() => setSelectedLevel(level.id)} style={{ marginBottom: Spacing.md }}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={isSelected ? level.gradient as [string, string] : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: BorderRadius.xl,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? level.color : 'rgba(192, 192, 192, 0.3)',
                      padding: Spacing.lg,
                      opacity: pressed ? 0.9 : 1,
                      ...Shadows.md,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      {/* Badge */}
                      <View style={{ width: 56, height: 56, borderRadius: BorderRadius.full, backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)' }}>
                        <Text style={{ fontSize: 28 }}>{level.emoji}</Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
                          {level.label}
                        </Text>
                        <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 2 }}>
                          {level.points.toLocaleString()} pts
                        </Text>
                      </View>

                      {/* Checkmark */}
                      {isSelected && (
                        <View style={{ width: 24, height: 24, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 14 }}>✓</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: Spacing['2xl'] }}>
          <Pressable onPress={saveEnergyGoal} disabled={saving}>
            {({ pressed }) => (
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.xl,
                  alignItems: 'center',
                  opacity: pressed ? 0.9 : 1,
                  ...Shadows.lg,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.text.primary} />
                ) : (
                  <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
                    Let's Go! 🚀
                  </Text>
                )}
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
