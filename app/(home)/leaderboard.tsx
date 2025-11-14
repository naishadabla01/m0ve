// app/(home)/leaderboard.tsx - iOS 26 Themed Leaderboard
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
  const { event_id: eventIdParam } = useLocalSearchParams<{ event_id?: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserScore, setCurrentUserScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get current user ID on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    })();
  }, []);

  // Resolve event_id
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const fromParam = (eventIdParam || "").trim();
      if (fromParam) {
        if (isMounted) setEventId(fromParam);
        try {
          await AsyncStorage.setItem("event_id", fromParam);
        } catch {}
        return;
      }

      try {
        const saved = (await AsyncStorage.getItem("event_id")) || "";
        if (isMounted) setEventId(saved || null);
      } catch {
        if (isMounted) setEventId(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [eventIdParam]);

  // Fetch leaderboard data
  const fetchLeaderboard = async (isRefresh = false) => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

      // Get top 100 from materialized view (10-20x faster than querying scores table)
      const { data: topScores, error } = await supabase
        .from("leaderboard_cache")
        .select("*")
        .eq("event_id", eventId)
        .lte("rank", 100)
        .order("rank", { ascending: true });

      console.log("Leaderboard query result (from materialized view):", { topScores, error, eventId });

      if (topScores && topScores.length > 0) {
        const formattedLeaderboard: LeaderboardEntry[] = topScores.map((entry) => {
          // Data is already formatted in materialized view with profile info joined
          const displayName = entry.display_name ||
            [entry.first_name, entry.last_name].filter(Boolean).join(" ") ||
            "Anonymous";

          return {
            user_id: entry.user_id,
            name: displayName,
            score: entry.score || 0,
            rank: entry.rank,  // Pre-calculated rank from materialized view!
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
            // User not in top 100, query their rank from materialized view cache
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

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = currentUserId && item.user_id === currentUserId;
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
          padding: Spacing.lg,
          borderRadius: BorderRadius.xl,
          marginBottom: Spacing.sm,
          borderWidth: isCurrentUser ? 2 : 1,
          borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
          ...Shadows.sm,
        }}
      >
        {/* Rank */}
        <View style={{ width: 60, alignItems: "center" }}>
          {getRankEmoji(item.rank) ? (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 32 }}>{getRankEmoji(item.rank)}</Text>
            </View>
          ) : (
            <Text style={{
              color: isCurrentUser ? Colors.accent.purple.light : Colors.text.muted,
              fontSize: Typography.size.xl,
              fontWeight: '700',
            }}>
              #{item.rank}
            </Text>
          )}
        </View>

        {/* Profile Picture */}
        {item.profile_picture_url ? (
          <Image
            source={{ uri: item.profile_picture_url }}
            style={{
              width: 48,
              height: 48,
              borderRadius: BorderRadius.full,
              borderWidth: 2,
              borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
              marginRight: Spacing.md,
            }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: BorderRadius.full,
              backgroundColor: isCurrentUser ? 'rgba(168, 85, 247, 0.2)' : Colors.background.elevated,
              borderWidth: 2,
              borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
              alignItems: "center",
              justifyContent: "center",
              marginRight: Spacing.md,
            }}
          >
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        )}

        {/* Name and Score */}
        <View style={{ flex: 1 }}>
          <Text style={{
            color: isCurrentUser ? Colors.accent.purple.light : Colors.text.primary,
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
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: `${getRankColor(item.rank)}20`,
              borderWidth: 1,
              borderColor: `${getRankColor(item.rank)}40`,
            }}
          >
            <Text style={{ color: getRankColor(item.rank), fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
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
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.accent.purple.light} />
          <Text style={{ color: Colors.text.muted, marginTop: Spacing.md, fontSize: Typography.size.sm }}>
            Loading leaderboard...
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: Spacing.md,
            paddingBottom: Spacing.lg,
            paddingHorizontal: Spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border.subtle,
            marginBottom: Spacing.md,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Text style={{
              color: Colors.text.primary,
              fontSize: Typography.size['2xl'],
              fontWeight: '600',
              letterSpacing: 2,
              fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
            }}>
              LEADERBOARD
            </Text>
            <Pressable onPress={() => router.back()} style={{ position: 'absolute', right: 0 }}>
              {({ pressed }) => (
                <LinearGradient
                  colors={Gradients.glass.medium}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.full,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                    borderWidth: 1,
                    borderColor: Colors.border.glass,
                    ...Shadows.md,
                  }}
                >
                  <Text style={{ fontSize: 20, color: Colors.text.muted }}>✕</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>

        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLeaderboard(true)}
              tintColor={Colors.accent.purple.light}
            />
          }
          ListHeaderComponent={
            <>
              {/* Event Info */}
              {eventInfo && (
                <LinearGradient
                  colors={Gradients.glass.medium}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1,
                    borderColor: Colors.border.glass,
                    padding: Spacing.lg,
                    marginBottom: Spacing.lg,
                    ...Shadows.md,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "center" }}>
                    {eventInfo.cover_image_url ? (
                      <Image
                        source={{ uri: eventInfo.cover_image_url }}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: BorderRadius.lg,
                          borderWidth: 2,
                          borderColor: Colors.border.glass,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: BorderRadius.lg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>🎵</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
                        {eventInfo.name || eventInfo.title || "Event"}
                      </Text>
                      {eventInfo.artist_name && (
                        <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 2 }}>
                          by {eventInfo.artist_name}
                        </Text>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Current User Stats */}
              {currentUserRank && (
                <LinearGradient
                  colors={['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: BorderRadius.xl,
                    borderWidth: 2,
                    borderColor: Colors.accent.purple.light,
                    padding: Spacing.lg,
                    marginBottom: Spacing.lg,
                    ...Shadows.lg,
                  }}
                >
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: Spacing.xs, textAlign: "center", fontWeight: '600', letterSpacing: 1 }}>
                    YOUR RANK
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
                    <Text style={{ fontSize: 48 }}>{getRankEmoji(currentUserRank) || "🏅"}</Text>
                    <View>
                      <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['3xl'], fontWeight: '700' }}>
                        #{currentUserRank}
                      </Text>
                      <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                        {normalizeScoreForDisplay(currentUserScore).toLocaleString()} energy
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Leaderboard Title - Centered in 3D iOS 26 Card */}
              <LinearGradient
                colors={Gradients.glass.dark}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: BorderRadius.xl,
                  borderWidth: 1,
                  borderColor: Colors.border.glass,
                  padding: Spacing.lg,
                  marginBottom: Spacing.md,
                  ...Shadows.lg,
                }}
              >
                <Text style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.lg,
                  fontWeight: '600',
                  textAlign: "center",
                  letterSpacing: 1,
                }}>
                  Top Performers
                </Text>
                <Text style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.xs,
                  textAlign: "center",
                  marginTop: Spacing.xs,
                }}>
                  {leaderboard.length} dancers competing
                </Text>
              </LinearGradient>
            </>
          }
          ListEmptyComponent={
            <LinearGradient
              colors={Gradients.glass.light}
              style={{
                borderRadius: BorderRadius.xl,
                padding: Spacing['2xl'],
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors.border.glass,
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎵</Text>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base, textAlign: "center" }}>
                No one's moving yet!{'\n'}Be the first to start dancing 💃
              </Text>
            </LinearGradient>
          }
        />
      </LinearGradient>
    </SafeAreaView>
  );
}
