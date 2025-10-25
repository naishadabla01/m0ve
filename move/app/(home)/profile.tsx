// app/(home)/profile.tsx
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

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
  eventsJoined?: number;    // ← ADD THIS
  totalEnergy?: number;     // ← ADD THIS
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

      // Load profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Profile load error:", error);
        throw error;
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
      eventsJoined: eventsJoined || 0,      // ← ADD THIS
      totalEnergy: Math.round(totalEnergy),  // ← ADD THIS
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
  // Removed display_name - it's auto-generated from first_name + last_name
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
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
  let shouldSignOut = false;

  // Different confirm dialogs for web vs native
  if (Platform.OS === 'web') {
    // Web: Use window.confirm
    shouldSignOut = window.confirm("Are you sure you want to sign out?");
  } else {
    // Native: Use Alert.alert with Promise
    shouldSignOut = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { 
            text: "Cancel", 
            style: "cancel", 
            onPress: () => resolve(false) 
          },
          { 
            text: "Sign Out", 
            style: "destructive", 
            onPress: () => resolve(true) 
          },
        ],
        { cancelable: false }
      );
    });
  }

  if (shouldSignOut) {
    try {
      await supabase.auth.signOut();
      router.replace("/(auth)/signin");
    } catch (error) {
      console.error("Sign out error:", error);
      
      if (Platform.OS === 'web') {
        window.alert("Failed to sign out. Please try again.");
      } else {
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    }
  }
}

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#9ca3af", fontSize: 16, marginBottom: 16 }}>
            Profile not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: "#10b981", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}
          >
            <Text style={{ color: "#000", fontWeight: "700" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isArtist = profile.role === "artist";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ color: "#22d3ee", fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Profile</Text>
          <Pressable onPress={signOut} style={{ padding: 8 }}>
            <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "600" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Profile Card */}
        <View
          style={{
            backgroundColor: "#0b1920",
            borderColor: "#1a2e3a",
            borderWidth: 1,
            padding: 20,
            borderRadius: 14,
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Avatar */}
          <View style={{ position: "relative" }}>
            {profile.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: isArtist ? "#7c3aed" : "#10b981",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 40, color: "#fff" }}>
                  {(displayName || firstName || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Artist Badge */}
            {isArtist && (
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "#7c3aed",
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 2,
                  borderColor: "#0b1920",
                }}
              >
                <Text style={{ fontSize: 16 }}>✨</Text>
              </View>
            )}
          </View>

          {/* Name */}
          {!editing && (
            <>
              <Text style={{ color: "#e5e7eb", fontSize: 24, fontWeight: "700", textAlign: "center" }}>
                {profile.display_name || 
                 `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                 "Anonymous User"}
              </Text>

              {isArtist && (
                <View
                  style={{
                    backgroundColor: "#581c87",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: "#e9d5ff", fontSize: 12, fontWeight: "700" }}>
                    ✨ ARTIST
                  </Text>
                </View>
              )}

              {profile.email && (
                <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                  {profile.email}
                </Text>
              )}

              {profile.bio && (
                <Text
                  style={{
                    color: "#d1d5db",
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 20,
                  }}
                >
                  {profile.bio}
                </Text>
              )}

              <Pressable
                onPress={() => setEditing(true)}
                style={{
                  backgroundColor: "#0ea5e9",
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 999,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: "#000", fontWeight: "700" }}>Edit Profile</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Edit Form */}
        {editing && (
          <View
            style={{
              backgroundColor: "#0b1920",
              borderColor: "#1a2e3a",
              borderWidth: 1,
              padding: 20,
              borderRadius: 14,
              gap: 16,
            }}
          >
            <Text style={{ color: "#e5e7eb", fontSize: 18, fontWeight: "700" }}>
              Edit Profile
            </Text>

            {/* First Name */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600" }}>
                First Name
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your first name"
                placeholderTextColor="#4b5563"
                style={{
                  backgroundColor: "#060f14",
                  borderColor: "#1f2937",
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </View>

            {/* Last Name */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600" }}>
                Last Name
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Your last name"
                placeholderTextColor="#4b5563"
                style={{
                  backgroundColor: "#060f14",
                  borderColor: "#1f2937",
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </View>

            {/* Bio */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600" }}>
                Bio
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#4b5563"
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: "#060f14",
                  borderColor: "#1f2937",
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  color: "#e5e7eb",
                  fontSize: 14,
                  height: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  // Reset form
                  setDisplayName(profile.display_name || "");
                  setFirstName(profile.first_name || "");
                  setLastName(profile.last_name || "");
                  setBio(profile.bio || "");
                }}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: "#374151",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#9ca3af", fontWeight: "700" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={saveProfile}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? "#065f46" : "#10b981",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#000", fontWeight: "700" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Stats Card (for future features) */}
        <View
          style={{
            backgroundColor: "#0b1920",
            borderColor: "#1a2e3a",
            borderWidth: 1,
            padding: 20,
            borderRadius: 14,
            gap: 12,
          }}
        >
          <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "700" }}>
            Stats
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
  <View style={{ alignItems: "center" }}>
    <Text style={{ color: "#10b981", fontSize: 24, fontWeight: "700" }}>
      {profile?.eventsJoined || 0}
    </Text>
    <Text style={{ color: "#9ca3af", fontSize: 12 }}>Events Joined</Text>
  </View>
  <View style={{ alignItems: "center" }}>
    <Text style={{ color: "#22d3ee", fontSize: 24, fontWeight: "700" }}>
      {profile?.totalEnergy || 0}
    </Text>
    <Text style={{ color: "#9ca3af", fontSize: 12 }}>Total Energy</Text>
  </View>
</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}