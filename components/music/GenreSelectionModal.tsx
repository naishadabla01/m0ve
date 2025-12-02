// components/music/GenreSelectionModal.tsx - Compact modal for genre selection
import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, PanResponder, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';
import { MUSIC_GENRES, MusicGenre } from '../../constants/MusicPersonalization';
import { supabase } from '@/lib/supabase/client';

interface GenreSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function GenreSelectionModal({ visible, onClose, onSave }: GenreSelectionModalProps) {
  const [selectedGenres, setSelectedGenres] = useState<MusicGenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

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

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      alert(error.message || 'Failed to save preferences');
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
                minHeight: 500,
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
                <Text style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.xl,
                  fontWeight: Typography.weight.bold,
                  textAlign: 'center'
                }}>
                  Music Preferences
                </Text>
              </View>

            {loading ? (
              <View style={{ paddingVertical: Spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Colors.accent.purple.light} />
              </View>
            ) : (
              <>
                {/* Genre Grid */}
                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: Spacing.sm
                }}>
                  {MUSIC_GENRES.map(genre => {
                    const isSelected = selectedGenres.includes(genre.id);
                    return (
                      <Pressable
                        key={genre.id}
                        onPress={() => toggleGenre(genre.id)}
                      >
                        {({ pressed }) => (
                          <LinearGradient
                            colors={
                              isSelected
                                ? genre.gradient as [string, string]
                                : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: BorderRadius.full,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? genre.color : 'rgba(192, 192, 192, 0.3)',
                              opacity: pressed ? 0.8 : 1,
                              shadowColor: isSelected ? genre.color : 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.6,
                              shadowRadius: 8,
                              elevation: isSelected ? 8 : 0,
                            }}
                          >
                            <MaterialCommunityIcons
                              name={genre.icon as any}
                              size={28}
                              color={isSelected ? Colors.text.primary : 'rgba(235, 235, 245, 0.6)'}
                              style={{ marginBottom: 4 }}
                            />
                            <Text
                              style={{
                                color: isSelected ? Colors.text.primary : Colors.text.muted,
                                fontSize: 10,
                                fontWeight: isSelected ? Typography.weight.bold : Typography.weight.semibold,
                                textAlign: 'center',
                              }}
                            >
                              {genre.label}
                            </Text>
                          </LinearGradient>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Selection Count */}
                {selectedGenres.length > 0 && (
                  <View style={{
                    backgroundColor: 'rgba(99, 99, 102, 0.15)',
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1,
                    borderColor: 'rgba(142, 142, 147, 0.2)',
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.md,
                    marginTop: Spacing.md,
                    marginBottom: Spacing.md,
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      color: Colors.text.primary,
                      fontSize: 13,
                      fontWeight: '600'
                    }}>
                      {selectedGenres.length} {selectedGenres.length === 1 ? 'genre' : 'genres'} selected
                    </Text>
                  </View>
                )}

                {/* Save Button */}
                <Pressable
                  onPress={savePreferences}
                  disabled={saving || selectedGenres.length === 0}
                  style={{ marginTop: Spacing.sm }}
                >
                  {({ pressed }) => (
                    <View style={{
                      backgroundColor: selectedGenres.length === 0 ? 'rgba(99, 99, 102, 0.3)' : Colors.accent.purple.light,
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
                          Save Preferences
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>
              </>
            )}
            </LinearGradient>
          </BlurView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
