// app/(home)/leaderboard.tsx - Dynamic Leaderboard with iOS 26 Aesthetic
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
  ScrollView,
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

      // Get top 100 from leaderboard
      const { data: topScores } = await supabase
        .from("scores")
        .select(`
          user_id,
          score,
          profiles:user_id (
            name,
            profile_picture_url
          )
        `)
        .eq("event_id", eventId)
        .order("score", { ascending: false })
        .limit(100);

      if (topScores) {
        const formattedLeaderboard: LeaderboardEntry[] = topScores.map((entry, idx) => ({
          user_id: entry.user_id,
          name: (entry.profiles as any)?.name || "Unknown",
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
    return "🏅";
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#fbbf24"; // Gold
    if (rank === 2) return "#94a3b8"; // Silver
    if (rank === 3) return "#cd7f32"; // Bronze
    return Colors.text.muted;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => {
    const { data: { user } } = supabase.auth.getUser();
    const isCurrentUser = user && item.user_id === (user as any).id;

    return (
      <LinearGradient
        colors={isCurrentUser
          ? ['rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']
          : Gradients.glass.light}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: Spacing.md,
          borderRadius: BorderRadius.lg,
          borderWidth: isCurrentUser ? 2 : 1,
          borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
          marginBottom: Spacing.sm,
          ...Shadows.sm,
        }}
      >
        {/* Rank */}
        <View style={{ width: 50, alignItems: "center" }}>
          <Text style={{ fontSize: 24 }}>{getRankEmoji(item.rank)}</Text>
          <Text style={{
            color: getRankColor(item.rank),
            fontSize: Typography.size.sm,
            fontWeight: Typography.weight.bold,
          }}>
            #{item.rank}
          </Text>
        </View>

        {/* Profile Picture */}
        {item.profile_picture_url ? (
          <Image
            source={{ uri: item.profile_picture_url }}
            style={{
              width: 44,
              height: 44,
              borderRadius: BorderRadius.full,
              borderWidth: 2,
              borderColor: isCurrentUser ? Colors.accent.purple.light : Colors.border.glass,
              marginRight: Spacing.md,
            }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: BorderRadius.full,
              backgroundColor: isCurrentUser ? Colors.accent.purple.light : Colors.background.elevated,
              borderWidth: 2,
              borderColor: isCurrentUser ? Colors.accent.pink.light : Colors.border.glass,
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
            fontWeight: Typography.weight.bold,
          }}>
            {item.name} {isCurrentUser && "⭐"}
          </Text>
          <Text style={{
            color: Colors.text.muted,
            fontSize: Typography.size.sm,
          }}>
            {Math.round(item.score).toLocaleString()} energy
          </Text>
        </View>

        {/* Trophy for top 3 */}
        {item.rank <= 3 && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.full,
              backgroundColor: `${getRankColor(item.rank)}20`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🏆</Text>
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
          <Text style={{ color: Colors.text.muted, marginTop: Spacing.md }}>
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
              fontWeight: '300',
              letterSpacing: 2,
              fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
            }}>
              Leaderboard
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

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLeaderboard(true)}
              tintColor={Colors.accent.purple.light}
            />
          }
        >
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
                    <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
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
              colors={['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)']}
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
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: Spacing.xs, textAlign: "center" }}>
                YOUR RANK
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
                <Text style={{ fontSize: 48 }}>{getRankEmoji(currentUserRank)}</Text>
                <View>
                  <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold }}>
                    #{currentUserRank}
                  </Text>
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }}>
                    {Math.round(currentUserScore).toLocaleString()} energy
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Leaderboard Title */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.md }}>
            <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
              🏆 Top Movers
            </Text>
            <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs }}>
              {leaderboard.length} dancers
            </Text>
          </View>

          {/* Leaderboard List */}
          {leaderboard.length > 0 ? (
            <View>
              {leaderboard.map((item) => (
                <View key={item.user_id}>
                  {renderLeaderboardItem({ item })}
                </View>
              ))}
            </View>
          ) : (
            <LinearGradient
              colors={Gradients.glass.light}
              style={{
                borderRadius: BorderRadius.xl,
                padding: Spacing.xl,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎵</Text>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base, textAlign: "center" }}>
                No one's moving yet!{'\n'}Be the first to start dancing 💃
              </Text>
            </LinearGradient>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
