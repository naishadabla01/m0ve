// app/event-details.tsx - iOS 26 Event Details Page
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";

interface Event {
  event_id: string;
  artist_id: string;
  name: string | null;
  title?: string | null;
  short_code?: string | null;
  location?: string | null;
  cover_image_url?: string | null;
  start_at: string | null;
  end_at: string | null;
  ended_at: string | null;
  status: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  score: number;
  rank?: number;
}

export default function EventDetailsScreen() {
  const { event_id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadEventDetails();
  }, [event_id]);

  async function loadEventDetails() {
    if (!event_id) return;

    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", event_id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch top 5 leaderboard entries
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from("leaderboard_cache")
        .select("user_id, display_name, score, rank")
        .eq("event_id", event_id)
        .order("rank", { ascending: true })
        .limit(5);

      if (!leaderboardError && leaderboardData) {
        setLeaderboard(leaderboardData);
      }
    } catch (error) {
      console.error("Error loading event details:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinEvent() {
    if (!event) return;

    setJoining(true);
    try {
      // Save event_id to AsyncStorage
      await AsyncStorage.setItem("event_id", event.event_id);

      // Navigate to movement tracker
      router.push(`/move?event_id=${event.event_id}`);
    } catch (error) {
      console.error("Error joining event:", error);
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: Colors.text.muted }}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: Spacing.xl,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border.glass,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.accent.purple.light} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: Colors.text.primary,
            fontSize: Typography.size.xl,
            fontWeight: Typography.weight.bold,
            marginRight: 28, // Balance the back button
          }}
        >
          Event Details
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl,
          paddingBottom: 120, // Space for join button
        }}
      >
        {/* Event Cover Image */}
        <View
          style={{
            marginTop: Spacing.xl,
            borderRadius: BorderRadius['2xl'],
            overflow: "hidden",
            ...Shadows.xl,
          }}
        >
          {event.cover_image_url ? (
            <Image
              source={{ uri: event.cover_image_url }}
              style={{
                width: "100%",
                height: 300,
              }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: "100%",
                height: 300,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 80 }}>🎵</Text>
            </LinearGradient>
          )}

          {/* Live Badge */}
          <View
            style={{
              position: "absolute",
              top: Spacing.md,
              right: Spacing.md,
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.xs,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderRadius: BorderRadius.lg,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.status.live,
              }}
            />
            <Text
              style={{
                color: Colors.status.live,
                fontSize: Typography.size.sm,
                fontWeight: Typography.weight.bold,
              }}
            >
              LIVE NOW
            </Text>
          </View>
        </View>

        {/* Event Title */}
        <Text
          style={{
            marginTop: Spacing.xl,
            color: Colors.text.primary,
            fontSize: Typography.size['3xl'],
            fontWeight: Typography.weight.bold,
            lineHeight: 40,
          }}
        >
          {event.title || event.name}
        </Text>

        {/* Event Code */}
        {event.short_code && (
          <View
            style={{
              marginTop: Spacing.md,
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
            }}
          >
            <Ionicons name="key-outline" size={18} color={Colors.text.muted} />
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.base,
              }}
            >
              Code: <Text style={{ color: Colors.accent.purple.light, fontWeight: Typography.weight.bold }}>{event.short_code}</Text>
            </Text>
          </View>
        )}

        {/* Location */}
        {event.location && (
          <View
            style={{
              marginTop: Spacing.sm,
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
            }}
          >
            <Ionicons name="location-outline" size={18} color={Colors.text.muted} />
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.base,
              }}
            >
              {event.location}
            </Text>
          </View>
        )}

        {/* Leaderboard Preview */}
        {leaderboard.length > 0 && (
          <View style={{ marginTop: Spacing['2xl'] }}>
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size.xl,
                fontWeight: Typography.weight.bold,
                marginBottom: Spacing.md,
              }}
            >
              Top Participants
            </Text>

            <LinearGradient
              colors={Gradients.glass.medium}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius.xl,
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing.lg,
                ...Shadows.md,
              }}
            >
              {leaderboard.map((entry, index) => (
                <View
                  key={entry.user_id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                    borderBottomWidth: index < leaderboard.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.border.glass,
                  }}
                >
                  <Text
                    style={{
                      width: 30,
                      color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : Colors.text.muted,
                      fontSize: Typography.size.lg,
                      fontWeight: Typography.weight.bold,
                    }}
                  >
                    {index + 1}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: Colors.text.primary,
                      fontSize: Typography.size.base,
                      fontWeight: Typography.weight.semibold,
                    }}
                  >
                    {entry.display_name}
                  </Text>
                  <Text
                    style={{
                      color: Colors.accent.purple.light,
                      fontSize: Typography.size.base,
                      fontWeight: Typography.weight.bold,
                    }}
                  >
                    {normalizeScoreForDisplay(entry.score)}
                  </Text>
                </View>
              ))}
            </LinearGradient>

            <Pressable
              onPress={() => router.push(`/leaderboard?eventId=${event.event_id}`)}
              style={{ marginTop: Spacing.md }}
            >
              <Text
                style={{
                  color: Colors.accent.purple.light,
                  fontSize: Typography.size.sm,
                  fontWeight: Typography.weight.semibold,
                  textAlign: "center",
                }}
              >
                View Full Leaderboard →
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Fixed Join Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: Spacing.xl,
          backgroundColor: Colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: Colors.border.glass,
        }}
      >
        <Pressable onPress={handleJoinEvent} disabled={joining}>
          {({ pressed }) => (
            <LinearGradient
              colors={["#007AFF", "#0051D5"]} // iOS blue
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: Spacing.lg,
                borderRadius: BorderRadius.lg,
                alignItems: "center",
                justifyContent: "center",
                opacity: joining ? 0.6 : pressed ? 0.85 : 1,
                ...Shadows.lg,
              }}
            >
              {joining ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                  <Ionicons name="arrow-forward-circle-outline" size={24} color="#ffffff" />
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: Typography.weight.bold,
                      fontSize: Typography.size.lg,
                    }}
                  >
                    Join Event
                  </Text>
                </View>
              )}
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
