// app/music-preferences/index.tsx - Music Genre Selection Screen (Polished)
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { MUSIC_GENRES, MusicGenre } from '../../constants/MusicPersonalization';
import { GenreButton } from './components/GenreButton';

export default function MusicPreferencesScreen() {
  const [selectedGenres, setSelectedGenres] = useState<MusicGenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_music_preferences')
        .select('genres')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.genres) {
        setSelectedGenres(data.genres as MusicGenre[]);
      }
    } catch (error) {
      console.error('Failed to load music preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genreId: MusicGenre) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(g => g !== genreId)
        : [...prev, genreId]
    );
  };

  const savePreferences = async () => {
    if (selectedGenres.length === 0) {
      alert('Please select at least one genre');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save preferences');
        return;
      }

      const { error } = await supabase
        .from('user_music_preferences')
        .upsert({
          user_id: user.id,
          genres: selectedGenres,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      router.push('/energy-level');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      alert(error.message || 'Failed to save preferences');
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
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 120 }}>
          {/* Compact Header */}
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>🎵</Text>
            <Text style={{ color: Colors.text.primary, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, textAlign: 'center' }}>
              Your Music Taste
            </Text>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, textAlign: 'center', marginTop: Spacing.xs, maxWidth: 260 }}>
              Select genres you vibe with
            </Text>
          </View>

          {/* Genre Grid - Compact */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
            {MUSIC_GENRES.map(genre => (
              <GenreButton
                key={genre.id}
                label={genre.label}
                emoji={genre.emoji}
                selected={selectedGenres.includes(genre.id)}
                onPress={() => toggleGenre(genre.id)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: Spacing['2xl'] }}>
          {/* Selection Indicator - Glassy Silver with Accent Border */}
          {selectedGenres.length > 0 && (
            <LinearGradient
              colors={['rgba(192, 192, 192, 0.12)', 'rgba(192, 192, 192, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: Colors.accent.purple.light + '40',
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.md,
                marginBottom: Spacing.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold }}>
                {selectedGenres.length} {selectedGenres.length === 1 ? 'genre' : 'genres'} selected ✨
              </Text>
            </LinearGradient>
          )}

          <Pressable onPress={savePreferences} disabled={saving || selectedGenres.length === 0}>
            {({ pressed }) => (
              <LinearGradient
                colors={
                  selectedGenres.length === 0
                    ? ['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)']
                    : [Colors.accent.purple.light, Colors.accent.pink.light]
                }
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
                    Continue →
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
