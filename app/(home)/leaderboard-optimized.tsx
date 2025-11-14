// app/(home)/leaderboard.tsx - iOS 26 Themed Leaderboard (OPTIMIZED with Materialized View)
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

type LeaderboardEntry = {
  user_id: string;
  name: string;
  score: number;
  rank: number;
  profile_picture_url?: string;
};

type EventInfo = {
  event_id: string;
  name?: string;
  title?: string;
  artist_name?: string;
  cover_image_url?: string;
};

export default function LeaderboardScreen() {
  const { event_id } = useLocalSearchParams<{ event_id: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserScore, setCurrentUserScore] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get event_id from params or AsyncStorage
    (async () => {
      let id = event_id;
      if (!id) {
        id = await AsyncStorage.getItem("event_id");
      }
      setEventId(id || null);
    })();

    // Get current user ID on mount for synchronous comparison
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    })();
  }, [event_id]);

  const fetchLeaderboard = async () => {
    if (!eventId) return;

    try {
      // Get event info
      const { data: event } = await supabase
        .from("events")
        .select("event_id, name, title, artist_name, cover_image_url")
        .eq("event_id", eventId)
        .maybeSingle();

      if (event) {
        setEventInfo(event);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // ============================================================
      // OPTIMIZED: Query materialized view instead of scores table
      // ============================================================
      // This is 10-100x faster because ranks are pre-calculated
      // and the view refreshes every 10 seconds in the background
      const { data: topScores, error } = await supabase
        .from("leaderboard_cache")
        .select("*")
        .eq("event_id", eventId)
        .lte("rank", 100)  // Only get top 100
        .order("rank", { ascending: true });

      console.log("Leaderboard query result (from cache):", { topScores, error, eventId });

      if (topScores && topScores.length > 0) {
        const formattedLeaderboard: LeaderboardEntry[] = topScores.map((entry) => {
          // Data is already formatted in materialized view
          const displayName = entry.display_name ||
            [entry.first_name, entry.last_name].filter(Boolean).join(" ") ||
            "Anonymous";

          return {
            user_id: entry.user_id,
            name: displayName,
            score: entry.score || 0,
            rank: entry.rank,  // Pre-calculated rank!
            profile_picture_url: entry.avatar_url,
          };
        });

        setLeaderboard(formattedLeaderboard);

        // Find current user's rank and score
        if (user) {
          const userEntry = formattedLeaderboard.find(e => e.user_id === user.id);
          if (userEntry) {
            setCurrentUserRank(userEntry.rank);
            setCurrentUserScore(userEntry.score);
          } else {
            // User not in top 100, query their rank from cache
            const { data: userRank } = await supabase
              .from("leaderboard_cache")
              .select("rank, score")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle();

            if (userRank) {
              setCurrentUserRank(userRank.rank);
              setCurrentUserScore(userRank.score || 0);
            }
          }
        }
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [eventId]);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#ffd700"; // Gold
    if (rank === 2) return "#c0c0c0"; // Silver
    if (rank === 3) return "#cd7f32"; // Bronze
    return Colors.accent.purple.light;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = currentUserId === item.user_id;
    const isTop3 = item.rank <= 3;

    return (
      <LinearGradient
        colors={isCurrentUser
          ? ['rgba(168, 85, 247, 0.15)', 'rgba(236, 72, 153, 0.15)']
          : Gradients.glass.medium}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: Spacing.md,
          marginHorizontal: Spacing.lg,
          marginVertical: Spacing.xs,
          borderRadius: BorderRadius.xl,
          borderWidth: isCurrentUser ? 2 : 1,
          borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
          ...Shadows.sm,
        }}
      >
        {/* Rank Badge */}
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isTop3 ? getRankColor(item.rank) : 'rgba(255, 255, 255, 0.1)',
          alignItems: "center",
          justifyContent: "center",
          marginRight: Spacing.md,
        }}>
          <Text style={{
            color: isTop3 ? '#000' : Colors.text.primary,
            fontSize: Typography.size.base,
            fontWeight: Typography.weight.bold,
          }}>
            {getRankEmoji(item.rank) || `#${item.rank}`}
          </Text>
        </View>

        {/* Profile Picture */}
        {item.profile_picture_url && (
          <Image
            source={{ uri: item.profile_picture_url }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: Spacing.md,
              borderWidth: 2,
              borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
            }}
          />
        )}

        {/* Name and Score */}
        <View style={{ flex: 1 }}>
          <Text style={{
            color: Colors.text.primary,
            fontSize: Typography.size.base,
            fontWeight: '700',
          }}>
            {item.name} {isCurrentUser && "⭐"}
          </Text>
          <Text style={{
            color: Colors.text.muted,
            fontSize: Typography.size.sm,
            marginTop: 2,
          }}>
            {normalizeScoreForDisplay(item.score).toLocaleString()} energy
          </Text>
        </View>

        {/* Badge for top 3 */}
        {isTop3 && (
          <View style={{
            backgroundColor: getRankColor(item.rank),
            paddingHorizontal: Spacing.sm,
            paddingVertical: Spacing.xs,
            borderRadius: BorderRadius.md,
          }}>
            <Text style={{ color: '#000', fontSize: Typography.size.xs, fontWeight: '700' }}>
              TOP {item.rank}
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
          <Text style={{ color: Colors.text.muted, marginTop: Spacing.md }}>
            Loading leaderboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
      }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size.lg }}>
            ← Back
          </Text>
        </Pressable>
        <Text style={{
          color: Colors.text.primary,
          fontSize: Typography.size.xl,
          fontWeight: Typography.weight.bold,
        }}>
          Leaderboard
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Event Info */}
      {eventInfo && (
        <View style={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
        }}>
          <Text style={{
            color: Colors.text.primary,
            fontSize: Typography.size.lg,
            fontWeight: Typography.weight.bold,
          }}>
            {eventInfo.title || eventInfo.name}
          </Text>
          {eventInfo.artist_name && (
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 4 }}>
              by {eventInfo.artist_name}
            </Text>
          )}
        </View>
      )}

      {/* Your Rank Card */}
      {currentUserRank && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: Spacing.lg,
              borderRadius: BorderRadius.xl,
              borderWidth: 2,
              borderColor: Colors.accent.purple.light,
              ...Shadows.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: 4 }}>
                YOUR RANK
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View>
                  <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['3xl'], fontWeight: '700' }}>
                    #{currentUserRank}
                  </Text>
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                    {normalizeScoreForDisplay(currentUserScore).toLocaleString()} energy
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl }}>
          <Text style={{
            color: Colors.text.muted,
            fontSize: Typography.size.lg,
            textAlign: "center",
          }}>
            No one's moving yet.{'\n'}Be the first! 🚀
          </Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.user_id}
          renderItem={renderLeaderboardItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLeaderboard();
              }}
              tintColor={Colors.accent.purple.light}
            />
          }
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
        />
      )}
    </SafeAreaView>
  );
}
