// app/leaderboard/index.tsx - Leaderboard Screen (Refactored)
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay } from "@/lib/scoreUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography } from "../../constants/Design";

// Import component types
import { LeaderboardEntry as LeaderboardEntryType, EventInfo } from './types';

// Import components
import { EventInfoCard, UserRankCard } from './components/LeaderboardCards';
import { LeaderboardHeader, TopPerformersTitle, LeaderboardEmptyState } from './components/LeaderboardUI';
import { LeaderboardEntry } from './components/LeaderboardEntry';

export default function LeaderboardScreen() {
  const { event_id: eventIdParam } = useLocalSearchParams<{ event_id?: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryType[]>([]);
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
        const formattedLeaderboard: LeaderboardEntryType[] = topScores.map((entry) => {
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
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
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
          <LeaderboardHeader title="LEADERBOARD" />
        </View>

        <FlatList
          data={leaderboard}
          renderItem={({ item }) => (
            <LeaderboardEntry entry={item} currentUserId={currentUserId} />
          )}
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
              {eventInfo && <EventInfoCard eventInfo={eventInfo} />}

              {/* Current User Stats */}
              {currentUserRank && (
                <UserRankCard rank={currentUserRank} score={currentUserScore} />
              )}

              {/* Leaderboard Title */}
              <TopPerformersTitle count={leaderboard.length} />
            </>
          }
          ListEmptyComponent={<LeaderboardEmptyState />}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}
