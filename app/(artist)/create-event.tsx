// app/(artist)/create-event.tsx - Artist Event Creation Screen with Genre Selection
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { MUSIC_GENRES, MusicGenre } from '../../constants/MusicPersonalization';

export default function CreateEventScreen() {
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<MusicGenre | null>(null);
  const [loading, setLoading] = useState(false);

  const createEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }
    if (!selectedGenre) {
      Alert.alert('Error', 'Please select a genre');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create an event');
        return;
      }

      // Generate a unique short code
      const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventName,
          title: eventName,
          location: location,
          genre: selectedGenre,
          short_code: shortCode,
          created_by: user.id,
          artist_id: user.id,
          status: 'live',
          start_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success!',
        `Event "${eventName}" created with code: ${shortCode}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border.subtle,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
            <Ionicons name="close" size={28} color={Colors.text.primary} />
          </Pressable>
          <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold }}>
            Create Event
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.xl,
            paddingTop: Spacing.xl,
            paddingBottom: 100,
          }}
        >
          {/* Event Name Input */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginBottom: Spacing.sm }}>
              Event Name
            </Text>
            <LinearGradient
              colors={Gradients.glass.light}
              style={{
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: Colors.border.glass,
              }}
            >
              <TextInput
                value={eventName}
                onChangeText={setEventName}
                placeholder="Summer Music Festival"
                placeholderTextColor={Colors.text.muted}
                style={{
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  color: Colors.text.primary,
                  fontSize: Typography.size.base,
                }}
              />
            </LinearGradient>
          </View>

          {/* Location Input */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginBottom: Spacing.sm }}>
              Location
            </Text>
            <LinearGradient
              colors={Gradients.glass.light}
              style={{
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: Colors.border.glass,
              }}
            >
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Madison Square Garden, NYC"
                placeholderTextColor={Colors.text.muted}
                style={{
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  color: Colors.text.primary,
                  fontSize: Typography.size.base,
                }}
              />
            </LinearGradient>
          </View>

          {/* Genre Selection */}
          <View style={{ marginBottom: Spacing['2xl'] }}>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginBottom: Spacing.md }}>
              Music Genre
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {MUSIC_GENRES.map(genre => {
                const isSelected = selectedGenre === genre.id;
                return (
                  <Pressable
                    key={genre.id}
                    onPress={() => setSelectedGenre(genre.id)}
                  >
                    {({ pressed }) => (
                      <LinearGradient
                        colors={
                          isSelected
                            ? [Colors.accent.purple.light, Colors.accent.pink.light]
                            : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          paddingHorizontal: Spacing.lg,
                          paddingVertical: Spacing.md,
                          borderRadius: BorderRadius.full,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? Colors.accent.purple.light : 'rgba(255, 255, 255, 0.2)',
                          opacity: pressed ? 0.8 : 1,
                          ...Shadows.md,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                          <Text style={{ fontSize: 20 }}>{genre.emoji}</Text>
                          <Text
                            style={{
                              color: isSelected ? Colors.text.primary : Colors.text.muted,
                              fontSize: Typography.size.base,
                              fontWeight: isSelected ? Typography.weight.bold : Typography.weight.semibold,
                            }}
                          >
                            {genre.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color={Colors.text.primary} />
                          )}
                        </View>
                      </LinearGradient>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Info Card */}
          <LinearGradient
            colors={Gradients.glass.medium}
            style={{
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing.lg,
              marginBottom: Spacing.xl,
            }}
          >
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Ionicons name="information-circle" size={24} color={Colors.accent.purple.light} />
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, flex: 1 }}>
                A unique event code will be automatically generated. Share it with participants to join!
              </Text>
            </View>
          </LinearGradient>

          {/* Create Button */}
          <Pressable onPress={createEvent} disabled={loading}>
            {({ pressed }) => (
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.9 : 1,
                  ...Shadows.lg,
                  minHeight: 56,
                }}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.text.primary} />
                ) : (
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size.lg,
                      fontWeight: Typography.weight.bold,
                    }}
                  >
                    Create Event 🎉
                  </Text>
                )}
              </LinearGradient>
            )}
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
