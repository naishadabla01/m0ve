// app/(home)/profile.tsx - iOS Redesigned Profile with Futuristic Apple Aesthetic
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, BorderRadius, Spacing, Typography } from "../../constants/Design";
import { getEnergyLevel, MusicGenre, MUSIC_GENRES } from "../../constants/MusicPersonalization";
import { EnergyGoalManagementModal } from "../../components/energy/EnergyGoalManagementModal";
import { GenreSelectionModal } from "../../components/music/GenreSelectionModal";
import { AnimatedAvatar } from "../../components/profile/AnimatedAvatar";

import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

type Profile = {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
  eventsJoined?: number;
  totalEnergy?: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  // Music personalization state
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [userEnergyGoalLevel, setUserEnergyGoalLevel] = useState<string>('chill');
  const [userGenres, setUserGenres] = useState<MusicGenre[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        Alert.alert("Error", "Not signed in");
        router.replace("/(auth)/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile load error:", error);
        throw error;
      }

      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            email: user?.email,
            display_name: user?.user_metadata?.display_name || null,
            first_name: user?.user_metadata?.first_name || null,
            last_name: user?.user_metadata?.last_name || null,
          })
          .select()
          .single();

        if (createError) {
          console.error("Failed to create profile:", createError);
          throw createError;
        }

        setProfile({
          ...newProfile,
          eventsJoined: 0,
          totalEnergy: 0,
        });
        setDisplayName(newProfile.display_name || "");
        setFirstName(newProfile.first_name || "");
        setLastName(newProfile.last_name || "");
        setBio(newProfile.bio || "");
        setLoading(false);
        return;
      }

      const { count: eventsJoined } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { data: scoresData } = await supabase
        .from("scores")
        .select("score")
        .eq("user_id", userId);

      const totalEnergy = scoresData?.reduce((sum, row) => sum + (row.score || 0), 0) || 0;

      setProfile({
        ...data,
        eventsJoined: eventsJoined || 0,
        totalEnergy: Math.round(totalEnergy),
      });

      setDisplayName(data.display_name || "");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setBio(data.bio || "");
      setUserEnergyGoalLevel(data.energy_goal_level || 'chill');

      const { data: musicPrefs } = await supabase
        .from("user_music_preferences")
        .select("genres")
        .eq("user_id", userId)
        .maybeSingle();

      if (musicPrefs && musicPrefs.genres) {
        setUserGenres(musicPrefs.genres as MusicGenre[]);
      }

    } catch (err: any) {
      console.error("Failed to load profile:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    if (!displayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    try {
      setSaving(true);

      const updates = {
        display_name: displayName.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        bio: bio.trim() || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (error) throw error;

      await loadProfile();
      setEditing(false);
      Alert.alert("Success", "Profile updated!");
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      Alert.alert("Error", "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (!confirmed) return;
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: async () => {
              await doSignOut();
            },
          },
        ]
      );
      return;
    }
    await doSignOut();
  }

  async function doSignOut() {
    try {
      await AsyncStorage.removeItem("event_id");
      await supabase.auth.signOut();
      router.replace("/(auth)/signin");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
          <Text style={{ color: Colors.text.muted, marginTop: Spacing.lg, fontSize: Typography.size.base }}>
            Loading your profile...
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl }}
        >
          <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold }}>
            Profile Not Found
          </Text>
          <Pressable onPress={loadProfile} style={{ marginTop: Spacing.lg }}>
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: Spacing.xl,
                paddingVertical: Spacing.md,
                borderRadius: BorderRadius.xl,
              }}
            >
              <Text style={{ color: Colors.text.primary, fontWeight: Typography.weight.bold }}>
                Retry
              </Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const displayFullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ") || profile.display_name || "Anonymous";

  const initials = displayFullName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentLevel = getEnergyLevel(userEnergyGoalLevel);
  const energyProgress = profile.totalEnergy && currentLevel.points
    ? Math.min((profile.totalEnergy / currentLevel.points) * 100, 100)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={{ flex: 1 }}
      >
        {/* Background glow effects */}
        <View style={{ position: 'absolute', top: 100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(168, 85, 247, 0.1)', opacity: 0.5 }} />
        <View style={{ position: 'absolute', top: 300, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(236, 72, 153, 0.1)', opacity: 0.5 }} />
        <View style={{ position: 'absolute', bottom: 200, left: 50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(96, 165, 250, 0.1)', opacity: 0.5 }} />

        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }} // Extra padding for navbar
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header with Animated Avatar */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
            <AnimatedAvatar
              initials={initials}
              size={130}
              avatarUrl={profile.avatar_url}
              energyLevel={userEnergyGoalLevel as any}
            />

            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size['3xl'],
                fontWeight: Typography.weight.bold,
                marginTop: Spacing.lg,
                marginBottom: Spacing.xs,
                textAlign: "center",
              }}
            >
              {displayFullName}
            </Text>

            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.sm,
                marginBottom: Spacing.sm,
              }}
            >
              {profile.email}
            </Text>

            {profile.role && profile.role !== "user" && (
              <View
                style={{
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.xs,
                  borderRadius: BorderRadius.full,
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  marginBottom: Spacing.sm,
                }}
              >
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {profile.role}
                </Text>
              </View>
            )}

            {/* Genre Pills Below Avatar */}
            {userGenres.length > 0 && (
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: Spacing.sm,
                marginTop: Spacing.md,
                justifyContent: 'center',
                paddingHorizontal: Spacing.xl,
              }}>
                {userGenres.slice(0, 5).map(genreId => {
                  const genre = MUSIC_GENRES.find(g => g.id === genreId);
                  if (!genre) return null;
                  return (
                    <View
                      key={genreId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.xs,
                        paddingLeft: Spacing.sm,
                        paddingRight: Spacing.md,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.full,
                        backgroundColor: `${genre.color}15`,
                        borderWidth: 1.5,
                        borderColor: `${genre.color}60`,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={genre.icon as any}
                        size={20}
                        color={genre.color}
                      />
                      <Text style={{
                        color: genre.color,
                        fontSize: Typography.size.sm,
                        fontWeight: Typography.weight.semibold,
                      }}>
                        {genre.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Single Stats Card - Linear Layout */}
          <LinearGradient
            colors={['rgba(28, 28, 30, 0.6)', 'rgba(18, 18, 20, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius.xl,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              padding: Spacing.lg,
              marginBottom: Spacing.lg,
            }}
          >
            {/* Events Joined */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${Colors.accent.purple.light}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: Spacing.md,
                  borderWidth: 1,
                  borderColor: `${Colors.accent.purple.light}40`,
                }}
              >
                <MaterialCommunityIcons name="calendar-check" size={20} color={Colors.accent.purple.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Events Joined
                </Text>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold }}>
                  {profile.eventsJoined || 0}
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: Spacing.xs }} />

            {/* Total Energy */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${Colors.accent.pink.light}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: Spacing.md,
                  borderWidth: 1,
                  borderColor: `${Colors.accent.pink.light}40`,
                }}
              >
                <MaterialCommunityIcons name="flash" size={20} color={Colors.accent.pink.light} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Energy
                </Text>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold }}>
                  {normalizeScoreForDisplay(profile.totalEnergy || 0)}
                </Text>
              </View>
            </View>

          </LinearGradient>

          {/* Bio Section */}
          {!editing && profile.bio && (
            <LinearGradient
              colors={['rgba(28, 28, 30, 0.6)', 'rgba(18, 18, 20, 0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                padding: Spacing.lg,
                marginBottom: Spacing.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.text.muted} />
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginLeft: Spacing.xs,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  About
                </Text>
              </View>
              <Text
                style={{
                  color: Colors.text.secondary,
                  fontSize: Typography.size.base,
                  lineHeight: Typography.size.base * 1.5,
                }}
              >
                {profile.bio}
              </Text>
            </LinearGradient>
          )}

          {/* Personalization Section */}
          {!editing && (
            <>
              {/* Energy Goal Card */}
              <Pressable onPress={() => setShowEnergyModal(true)} style={{ marginBottom: Spacing.md }}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={['rgba(28, 28, 30, 0.6)', 'rgba(18, 18, 20, 0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: BorderRadius.xl,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      padding: Spacing.lg,
                      opacity: pressed ? 0.8 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                        <MaterialCommunityIcons
                          name={currentLevel.icon as any}
                          size={18}
                          color={Colors.text.muted}
                        />
                        <Text
                          style={{
                            color: Colors.text.muted,
                            fontSize: Typography.size.xs,
                            fontWeight: Typography.weight.semibold,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Energy Goal
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={Colors.text.muted}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${currentLevel.color}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: `${currentLevel.color}40`,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={currentLevel.icon as any}
                          size={18}
                          color={currentLevel.color}
                        />
                      </View>
                      <Text
                        style={{
                          color: currentLevel.color,
                          fontSize: Typography.size.sm,
                          fontWeight: Typography.weight.bold,
                        }}
                      >
                        {currentLevel.label}
                      </Text>
                      <Text
                        style={{
                          color: Colors.text.muted,
                          fontSize: Typography.size.xs,
                        }}
                      >
                        • {currentLevel.points.toLocaleString()} pts
                      </Text>
                    </View>
                  </LinearGradient>
                )}
              </Pressable>

              {/* Music Preferences Card */}
              <Pressable onPress={() => setShowGenreModal(true)} style={{ marginBottom: Spacing.lg }}>
                {({ pressed }) => (
                  <LinearGradient
                    colors={['rgba(28, 28, 30, 0.6)', 'rgba(18, 18, 20, 0.8)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: BorderRadius.xl,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      padding: Spacing.lg,
                      opacity: pressed ? 0.8 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                        <MaterialCommunityIcons name="music-circle" size={18} color={Colors.text.muted} />
                        <Text
                          style={{
                            color: Colors.text.muted,
                            fontSize: Typography.size.xs,
                            fontWeight: Typography.weight.semibold,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Music Preferences
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={Colors.text.muted}
                      />
                    </View>

                    {userGenres.length > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                        {userGenres.map(genreId => {
                          const genre = MUSIC_GENRES.find(g => g.id === genreId);
                          if (!genre) return null;
                          return (
                            <View
                              key={genreId}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: Spacing.xs,
                                paddingHorizontal: Spacing.sm,
                                paddingVertical: Spacing.xs,
                                borderRadius: BorderRadius.lg,
                                backgroundColor: `${genre.color}20`,
                                borderWidth: 1,
                                borderColor: `${genre.color}40`,
                              }}
                            >
                              <MaterialCommunityIcons
                                name={genre.icon as any}
                                size={14}
                                color={genre.color}
                              />
                              <Text
                                style={{
                                  color: genre.color,
                                  fontSize: Typography.size.xs,
                                  fontWeight: Typography.weight.semibold,
                                }}
                              >
                                {genre.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text
                        style={{
                          color: Colors.text.muted,
                          fontSize: Typography.size.sm,
                        }}
                      >
                        Tap to select your favorite genres
                      </Text>
                    )}
                  </LinearGradient>
                )}
              </Pressable>
            </>
          )}

          {/* Edit Profile Form */}
          {editing ? (
            <LinearGradient
              colors={['rgba(28, 28, 30, 0.6)', 'rgba(18, 18, 20, 0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                padding: Spacing.lg,
                marginBottom: Spacing.lg,
              }}
            >
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.xl,
                  fontWeight: Typography.weight.bold,
                  marginBottom: Spacing.lg,
                }}
              >
                Edit Profile
              </Text>

              {/* Display Name */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginBottom: Spacing.xs,
                    textTransform: "uppercase",
                  }}
                >
                  Display Name *
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderRadius: BorderRadius.lg,
                    overflow: "hidden",
                  }}
                >
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your display name"
                    placeholderTextColor={Colors.text.tertiary}
                    style={{
                      padding: Spacing.md,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                    }}
                  />
                </View>
              </View>

              {/* First Name */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginBottom: Spacing.xs,
                    textTransform: "uppercase",
                  }}
                >
                  First Name
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderRadius: BorderRadius.lg,
                    overflow: "hidden",
                  }}
                >
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Your first name"
                    placeholderTextColor={Colors.text.tertiary}
                    style={{
                      padding: Spacing.md,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                    }}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginBottom: Spacing.xs,
                    textTransform: "uppercase",
                  }}
                >
                  Last Name
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderRadius: BorderRadius.lg,
                    overflow: "hidden",
                  }}
                >
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Your last name"
                    placeholderTextColor={Colors.text.tertiary}
                    style={{
                      padding: Spacing.md,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                    }}
                  />
                </View>
              </View>

              {/* Bio */}
              <View style={{ marginBottom: Spacing.lg }}>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.semibold,
                    marginBottom: Spacing.xs,
                    textTransform: "uppercase",
                  }}
                >
                  Bio
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderRadius: BorderRadius.lg,
                    overflow: "hidden",
                  }}
                >
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor={Colors.text.tertiary}
                    multiline
                    numberOfLines={4}
                    style={{
                      padding: Spacing.md,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                      height: 100,
                      textAlignVertical: "top",
                    }}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: Spacing.md }}>
                <Pressable
                  onPress={() => {
                    setEditing(false);
                    setDisplayName(profile.display_name || "");
                    setFirstName(profile.first_name || "");
                    setLastName(profile.last_name || "");
                    setBio(profile.bio || "");
                  }}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {({ pressed }) => (
                    <View
                      style={{
                        paddingVertical: Spacing.md,
                        borderRadius: BorderRadius.lg,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        alignItems: "center",
                        opacity: pressed ? 0.6 : saving ? 0.5 : 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.text.secondary,
                          fontWeight: Typography.weight.bold,
                          fontSize: Typography.size.base,
                        }}
                      >
                        Cancel
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {({ pressed }) => (
                    <LinearGradient
                      colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: Spacing.md,
                        borderRadius: BorderRadius.lg,
                        alignItems: "center",
                        opacity: pressed ? 0.8 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.text.primary,
                          fontWeight: Typography.weight.bold,
                          fontSize: Typography.size.base,
                        }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            </LinearGradient>
          ) : (
            /* Edit Profile Button */
            <Pressable onPress={() => setEditing(true)} style={{ marginBottom: Spacing.md }}>
              {({ pressed }) => (
                <View
                  style={{
                    paddingVertical: Spacing.lg,
                    borderRadius: BorderRadius.xl,
                    borderWidth: 1,
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <MaterialCommunityIcons name="pencil" size={20} color={Colors.accent.purple.light} />
                    <Text
                      style={{
                        color: Colors.accent.purple.light,
                        fontWeight: Typography.weight.bold,
                        fontSize: Typography.size.base,
                      }}
                    >
                      Edit Profile
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          )}

          {/* Sign Out Button */}
          <Pressable onPress={signOut}>
            {({ pressed }) => (
              <View
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <MaterialCommunityIcons name="logout" size={20} color={Colors.status.error} />
                  <Text
                    style={{
                      color: Colors.status.error,
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.base,
                    }}
                  >
                    Sign Out
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        </ScrollView>

        {/* Energy Goal Management Modal */}
        <EnergyGoalManagementModal
          visible={showEnergyModal}
          onClose={() => setShowEnergyModal(false)}
          currentPoints={profile?.totalEnergy || 0}
          currentGoalLevel={userEnergyGoalLevel}
          onSave={() => {
            loadProfile();
          }}
        />

        {/* Genre Selection Modal */}
        <GenreSelectionModal
          visible={showGenreModal}
          onClose={() => setShowGenreModal(false)}
          onSave={() => {
            loadProfile();
          }}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}
