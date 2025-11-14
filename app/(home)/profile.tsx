// app/(home)/profile.tsx - iOS 26 Redesigned Profile
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

import {
  ActivityIndicator,
  Image,
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

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        Alert.alert("Error", "Not signed in");
        router.replace("/(auth)/login");
        return;
      }

      // Load profile - use maybeSingle() to handle new users without profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Profile load error:", error);
        throw error;
      }

      // If profile doesn't exist, create a basic one for the user
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

        // Use the newly created profile
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

      // Initialize edit form
      setDisplayName(data.display_name || "");
    setFirstName(data.first_name || "");
    setLastName(data.last_name || "");
    setBio(data.bio || "");

    } catch (err: any) {
      console.error("Failed to load profile:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    try {
      setSaving(true);

      const updates = {
  first_name: firstName.trim() || null,
  last_name: lastName.trim() || null,
  bio: bio.trim() || null,
};

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (error) throw error;

      // Reload profile
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
          <Pressable
            onPress={loadProfile}
            style={{ marginTop: Spacing.lg }}
          >
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
    .join(" ") || "Anonymous";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing['4xl'] }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section with Avatar */}
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing.xl,
              marginBottom: Spacing.lg,
              ...Shadows.lg,
            }}
          >
            <View style={{ alignItems: "center" }}>
              {/* Avatar with Gradient Border */}
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 4,
                  borderRadius: BorderRadius.full,
                  marginBottom: Spacing.md,
                }}
              >
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: BorderRadius.full,
                    backgroundColor: Colors.background.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {profile.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={{ width: "100%", height: "100%", borderRadius: BorderRadius.full }}
                    />
                  ) : (
                    <Text style={{
                      fontSize: Typography.size['5xl'],
                      color: Colors.accent.purple.light,
                      fontWeight: Typography.weight.bold,
                    }}>
                      {displayFullName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </LinearGradient>

              {/* Name */}
              <Text style={{
                color: Colors.text.primary,
                fontSize: Typography.size['3xl'],
                fontWeight: Typography.weight.bold,
                marginBottom: Spacing.xs,
                textAlign: "center",
              }}>
                {displayFullName}
              </Text>

              {/* Email */}
              <Text style={{
                color: Colors.text.muted,
                fontSize: Typography.size.sm,
                marginBottom: Spacing.md,
              }}>
                {profile.email}
              </Text>

              {/* Role Badge */}
              {profile.role && profile.role !== "user" && (
                <LinearGradient
                  colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.xs,
                    borderRadius: BorderRadius.full,
                  }}
                >
                  <Text style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size.xs,
                    fontWeight: Typography.weight.bold,
                    textTransform: "uppercase",
                  }}>
                    {profile.role}
                  </Text>
                </LinearGradient>
              )}
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={{
            flexDirection: "row",
            gap: Spacing.md,
            marginBottom: Spacing.lg,
          }}>
            {/* Events Joined */}
            <LinearGradient
              colors={Gradients.glass.light}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing.lg,
                alignItems: "center",
                ...Shadows.sm,
              }}
            >
              <Text style={{
                fontSize: Typography.size['4xl'],
                fontWeight: Typography.weight.bold,
                color: Colors.accent.purple.light,
                marginBottom: Spacing.xs,
              }}>
                {profile.eventsJoined || 0}
              </Text>
              <Text style={{
                fontSize: Typography.size.xs,
                color: Colors.text.muted,
                textAlign: "center",
              }}>
                Events Joined
              </Text>
            </LinearGradient>

            {/* Total Energy */}
            <LinearGradient
              colors={Gradients.glass.light}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing.lg,
                alignItems: "center",
                ...Shadows.sm,
              }}
            >
              <Text style={{
                fontSize: Typography.size['4xl'],
                fontWeight: Typography.weight.bold,
                color: Colors.accent.pink.light,
                marginBottom: Spacing.xs,
              }}>
                {normalizeScoreForDisplay(profile.totalEnergy || 0)}
              </Text>
              <Text style={{
                fontSize: Typography.size.xs,
                color: Colors.text.muted,
                textAlign: "center",
              }}>
                Total Energy
              </Text>
            </LinearGradient>
          </View>

          {/* Bio Section */}
          {!editing && profile.bio && (
            <LinearGradient
              colors={Gradients.glass.light}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing.lg,
                marginBottom: Spacing.lg,
                ...Shadows.sm,
              }}
            >
              <Text style={{
                color: Colors.text.muted,
                fontSize: Typography.size.xs,
                fontWeight: Typography.weight.semibold,
                marginBottom: Spacing.sm,
                textTransform: "uppercase",
              }}>
                About
              </Text>
              <Text style={{
                color: Colors.text.secondary,
                fontSize: Typography.size.base,
                lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
              }}>
                {profile.bio}
              </Text>
            </LinearGradient>
          )}

          {/* Edit Profile Form */}
          {editing ? (
            <LinearGradient
              colors={Gradients.glass.medium}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing.lg,
                marginBottom: Spacing.lg,
                ...Shadows.md,
              }}
            >
              <Text style={{
                color: Colors.text.primary,
                fontSize: Typography.size.xl,
                fontWeight: Typography.weight.bold,
                marginBottom: Spacing.lg,
              }}>
                Edit Profile
              </Text>

              {/* First Name */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.semibold,
                  marginBottom: Spacing.xs,
                  textTransform: "uppercase",
                }}>
                  First Name
                </Text>
                <View style={{
                  backgroundColor: Colors.background.card,
                  borderColor: Colors.border.glass,
                  borderWidth: 1,
                  borderRadius: BorderRadius.lg,
                  overflow: "hidden",
                }}>
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
                <Text style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.semibold,
                  marginBottom: Spacing.xs,
                  textTransform: "uppercase",
                }}>
                  Last Name
                </Text>
                <View style={{
                  backgroundColor: Colors.background.card,
                  borderColor: Colors.border.glass,
                  borderWidth: 1,
                  borderRadius: BorderRadius.lg,
                  overflow: "hidden",
                }}>
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
                <Text style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.xs,
                  fontWeight: Typography.weight.semibold,
                  marginBottom: Spacing.xs,
                  textTransform: "uppercase",
                }}>
                  Bio
                </Text>
                <View style={{
                  backgroundColor: Colors.background.card,
                  borderColor: Colors.border.glass,
                  borderWidth: 1,
                  borderRadius: BorderRadius.lg,
                  overflow: "hidden",
                }}>
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
                    setFirstName(profile.first_name || "");
                    setLastName(profile.last_name || "");
                    setBio(profile.bio || "");
                  }}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={Gradients.glass.dark}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: Spacing.md,
                      borderRadius: BorderRadius.lg,
                      borderWidth: 1,
                      borderColor: Colors.border.glass,
                      alignItems: "center",
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <Text style={{
                      color: Colors.text.secondary,
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.base,
                    }}>
                      Cancel
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={saving
                      ? [Colors.accent.purple.dark, Colors.accent.pink.dark]
                      : [Colors.accent.purple.light, Colors.accent.pink.light]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: Spacing.md,
                      borderRadius: BorderRadius.lg,
                      alignItems: "center",
                      ...Shadows.md,
                    }}
                  >
                    <Text style={{
                      color: Colors.text.primary,
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.base,
                    }}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          ) : (
            /* Edit Profile Button */
            <Pressable onPress={() => setEditing(true)} style={{ marginBottom: Spacing.lg }}>
              <LinearGradient
                colors={Gradients.glass.medium}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1,
                  borderColor: Colors.border.glass,
                  alignItems: "center",
                  ...Shadows.sm,
                }}
              >
                <Text style={{
                  color: Colors.accent.purple.light,
                  fontWeight: Typography.weight.bold,
                  fontSize: Typography.size.lg,
                }}>
                  ✏️ Edit Profile
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Sign Out Button */}
          <Pressable onPress={signOut}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: Spacing.lg,
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                alignItems: "center",
                ...Shadows.sm,
              }}
            >
              <Text style={{
                color: Colors.status.error,
                fontWeight: Typography.weight.bold,
                fontSize: Typography.size.lg,
              }}>
                🚪 Sign Out
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
