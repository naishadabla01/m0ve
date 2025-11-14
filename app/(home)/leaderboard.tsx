// app/(home)/leaderboard.tsx - iOS 26 Glossy Silver Leaderboard
import { supabase } from "@/lib/supabase/client";
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
import { Colors, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

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
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserScore, setCurrentUserScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // Get top 100 from leaderboard with proper join
      const { data: topScores, error } = await supabase
        .from("scores")
        .select(`
          user_id,
          score,
          profiles (
            name,
            profile_picture_url
          )
        `)
        .eq("event_id", eventId)
        .order("score", { ascending: false })
        .limit(100);

      console.log("Leaderboard query result:", { topScores, error, eventId });

      if (topScores && topScores.length > 0) {
        const formattedLeaderboard: LeaderboardEntry[] = topScores.map((entry, idx) => ({
          user_id: entry.user_id,
          name: (entry.profiles as any)?.name || "Anonymous",
          score: entry.score || 0,
          rank: idx + 1,
          profile_picture_url: (entry.profiles as any)?.profile_picture_url,
        }));

        setLeaderboard(formattedLeaderboard);

        // Find current user's rank and score
        if (user) {
          const userEntry = formattedLeaderboard.find(e => e.user_id === user.id);
          if (userEntry) {
            setCurrentUserRank(userEntry.rank);
            setCurrentUserScore(userEntry.score);
          } else {
            // User not in top 100, get their actual rank
            const { data: userScore } = await supabase
              .from("scores")
              .select("score")
              .eq("event_id", eventId)
              .eq("user_id", user.id)
              .maybeSingle();

            if (userScore) {
              setCurrentUserScore(userScore.score || 0);

              // Calculate rank
              const { count } = await supabase
                .from("scores")
                .select("*", { count: "exact", head: true })
                .eq("event_id", eventId)
                .gt("score", userScore.score || 0);

              setCurrentUserRank((count || 0) + 1);
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
    return "#e5e7eb";
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.user_id === supabase.auth.getUser().then(({data}) => data.user?.id);
    const isTop3 = item.rank <= 3;

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: Spacing.md,
          paddingVertical: Spacing.lg,
          borderRadius: BorderRadius.xl,
          marginBottom: Spacing.sm,
          backgroundColor: isTop3 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
          borderWidth: 1,
          borderColor: isTop3 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
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
              color: "#9ca3af",
              fontSize: Typography.size.xl,
              fontWeight: '600',
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
              borderColor: 'rgba(255, 255, 255, 0.2)',
              marginRight: Spacing.md,
            }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.15)',
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
            color: "#ffffff",
            fontSize: Typography.size.base,
            fontWeight: '600',
          }}>
            {item.name}
          </Text>
          <Text style={{
            color: "#9ca3af",
            fontSize: Typography.size.sm,
            marginTop: 2,
          }}>
            {Math.round(item.score).toLocaleString()} pts
          </Text>
        </View>

        {/* Trophy for top 3 */}
        {isTop3 && (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: `${getRankColor(item.rank)}20`,
            }}
          >
            <Text style={{ color: getRankColor(item.rank), fontSize: 12, fontWeight: '700' }}>
              TOP {item.rank}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: "#9ca3af", marginTop: Spacing.md, fontSize: Typography.size.sm }}>
            Loading leaderboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            paddingTop: Spacing.md,
            paddingBottom: Spacing.lg,
            paddingHorizontal: Spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            marginBottom: Spacing.md,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Text style={{
              color: "#ffffff",
              fontSize: Typography.size['2xl'],
              fontWeight: '600',
              letterSpacing: 2,
              fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
            }}>
              LEADERBOARD
            </Text>
            <Pressable onPress={() => router.back()} style={{ position: 'absolute', right: 0 }}>
              {({ pressed }) => (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: BorderRadius.full,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <Text style={{ fontSize: 20, color: "#9ca3af" }}>✕</Text>
                </View>
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
              tintColor="#ffffff"
            />
          }
          ListHeaderComponent={
            <>
              {/* Event Info */}
              {eventInfo && (
                <View
                  style={{
                    borderRadius: BorderRadius['2xl'],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    padding: Spacing.lg,
                    marginBottom: Spacing.lg,
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
                          borderColor: 'rgba(255, 255, 255, 0.15)',
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: BorderRadius.lg,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>🎵</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#ffffff", fontSize: Typography.size.lg, fontWeight: '600' }}>
                        {eventInfo.name || eventInfo.title || "Event"}
                      </Text>
                      {eventInfo.artist_name && (
                        <Text style={{ color: "#9ca3af", fontSize: Typography.size.sm, marginTop: 2 }}>
                          by {eventInfo.artist_name}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Current User Stats */}
              {currentUserRank && (
                <View
                  style={{
                    borderRadius: BorderRadius.xl,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    padding: Spacing.lg,
                    marginBottom: Spacing.lg,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <Text style={{ color: "#9ca3af", fontSize: Typography.size.xs, marginBottom: Spacing.xs, textAlign: "center", fontWeight: '600' }}>
                    YOUR RANK
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
                    <Text style={{ fontSize: 48 }}>{getRankEmoji(currentUserRank) || "🏅"}</Text>
                    <View>
                      <Text style={{ color: "#ffffff", fontSize: Typography.size['3xl'], fontWeight: '700' }}>
                        #{currentUserRank}
                      </Text>
                      <Text style={{ color: "#9ca3af", fontSize: Typography.size.sm }}>
                        {Math.round(currentUserScore).toLocaleString()} pts
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Leaderboard Title */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md, paddingHorizontal: Spacing.xs }}>
                <Text style={{ color: "#ffffff", fontSize: Typography.size.base, fontWeight: '600' }}>
                  Top Performers
                </Text>
                <Text style={{ color: "#6b7280", fontSize: Typography.size.xs }}>
                  {leaderboard.length} dancers
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View
              style={{
                borderRadius: BorderRadius.xl,
                padding: Spacing['2xl'],
                alignItems: "center",
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎵</Text>
              <Text style={{ color: "#9ca3af", fontSize: Typography.size.base, textAlign: "center" }}>
                No one's moving yet!{'\n'}Be the first to start dancing 💃
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
