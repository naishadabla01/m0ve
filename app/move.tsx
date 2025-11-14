// app/move.tsx - Dynamic & Artistic Movement Tracker
import { apiBase } from "@/lib/apiBase";
import { startMotionStream, StreamHandle } from "@/lib/motionStream";
import { supabase } from "@/lib/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";

const { width, height } = Dimensions.get("window");

type EventInfo = {
  event_id: string;
  name?: string;
  title?: string;
  artist_name?: string;
  artist_id?: string;
  short_code?: string;
};

export default function MoveScreen() {
  const { event_id: eventIdParam } = useLocalSearchParams<{ event_id?: string }>();
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Motion tracking
  const [mag, setMag] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [totalEnergy, setTotalEnergy] = useState<number>(0);
  const [percentComplete, setPercentComplete] = useState<number>(0);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [movementIntensity, setMovementIntensity] = useState<'idle' | 'low' | 'medium' | 'high' | 'extreme'>('idle');

  const streamRef = useRef<StreamHandle | null>(null);
  const accelSubRef = useRef<{ remove?: () => void } | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const energyRingAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Rotation animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Glow animation when running
  useEffect(() => {
    if (running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [running]);

  // Energy ring animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(energyRingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(energyRingAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const energyRingScale = energyRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const energyRingOpacity = energyRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

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

  // Fetch event info and rank
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);

        // Get event details
        const { data: event } = await supabase
          .from("events")
          .select("event_id, name, title, short_code, artist_id")
          .eq("event_id", eventId)
          .maybeSingle();

        if (!isMounted) return;

        let artistName = "Unknown Artist";

        // Get artist info
        if (event?.artist_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, first_name, last_name")
            .eq("user_id", event.artist_id)
            .maybeSingle();

          if (profile) {
            artistName =
              profile.display_name ||
              [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
              "Unknown Artist";
          }
        }

        if (!isMounted) return;

        setEventInfo({
          event_id: eventId,
          name: event?.name || event?.title || null,
          artist_name: artistName,
          artist_id: event?.artist_id,
          short_code: event?.short_code,
        });

        // Fetch current energy and rank
        try {
          const { data: { user } } = await supabase.auth.getUser();

          // Get user's score
          const { data: userScore } = await supabase
            .from("scores")
            .select("score")
            .eq("event_id", eventId)
            .eq("user_id", user?.id)
            .maybeSingle();

          if (userScore) {
            setTotalEnergy(userScore.score || 0);
          }

          // Get user's rank
          const { data: allScores } = await supabase
            .from("scores")
            .select("user_id, score")
            .eq("event_id", eventId)
            .order("score", { ascending: false });

          if (allScores && user) {
            const rank = allScores.findIndex(s => s.user_id === user.id) + 1;
            if (rank > 0) setCurrentRank(rank);
          }

          // Calculate percentage (goal: 10000)
          const goal = 10000;
          setPercentComplete(Math.min(100, Math.round(((userScore?.score || 0) / goal) * 100)));
        } catch (e) {
          console.error("Failed to fetch energy:", e);
        }
      } catch (err) {
        console.error("Failed to load event info:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Accelerometer with intensity detection
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;

      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) return;

        Accelerometer.setUpdateInterval(100);
        const sub = Accelerometer.addListener(({ x = 0, y = 0, z = 0 }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          setMag(magnitude);

          // Determine movement intensity
          if (magnitude < 1.05) {
            setMovementIntensity('idle');
          } else if (magnitude < 1.2) {
            setMovementIntensity('low');
          } else if (magnitude < 1.5) {
            setMovementIntensity('medium');
          } else if (magnitude < 2) {
            setMovementIntensity('high');
          } else {
            setMovementIntensity('extreme');
          }

          // Shake animation on movement
          if (running && magnitude > 1.2) {
            Animated.sequence([
              Animated.timing(shakeAnim, {
                toValue: 5,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: -5,
                duration: 50,
                useNativeDriver: true,
              }),
              Animated.timing(shakeAnim, {
                toValue: 0,
                duration: 50,
                useNativeDriver: true,
              }),
            ]).start();
          }
        });
        accelSubRef.current = sub;
      } catch {}
    })();

    return () => {
      try {
        accelSubRef.current?.remove?.();
      } catch {}
      accelSubRef.current = null;
    };
  }, [running]);

  // Cleanup stream
  useEffect(() => {
    return () => {
      try {
        streamRef.current?.stop?.();
      } catch {}
      streamRef.current = null;
    };
  }, []);

  // Poll for energy updates while tracking
  useEffect(() => {
    if (!running || !eventId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userScore } = await supabase
          .from("scores")
          .select("score")
          .eq("event_id", eventId)
          .eq("user_id", user?.id)
          .maybeSingle();

        if (userScore) {
          setTotalEnergy(userScore.score || 0);
          const goal = 10000;
          setPercentComplete(Math.min(100, Math.round(((userScore.score || 0) / goal) * 100)));
        }
      } catch (e) {
        console.error("Failed to poll energy:", e);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [running, eventId]);

  const start = () => {
    if (running) return;

    if (Platform.OS === "web") {
      const userChoice = window.confirm(
        "📱 Motion Tracking Not Available on Web\n\n" +
        "Motion tracking requires device sensors and only works in the native Android/iOS app.\n\n" +
        "Would you like to return to the home screen?"
      );

      if (userChoice) {
        router.push("/(home)");
      }
      return;
    }

    streamRef.current = startMotionStream(eventId!, 1000);
    setRunning(true);

    console.log("✅ Motion tracking started for event:", eventId);
  };

  const stop = () => {
    try {
      streamRef.current?.stop?.();
    } catch {}
    streamRef.current = null;
    setRunning(false);
    Alert.alert("Movement Stopped", "Great job! Your energy has been saved.");
  };

  const openLeaderboard = () => {
    router.push({
      pathname: "/(home)/leaderboard",
      params: { event_id: eventId! },
    });
  };

  const getIntensityColor = () => {
    switch (movementIntensity) {
      case 'extreme': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#eab308';
      case 'low': return '#84cc16';
      default: return Colors.text.muted;
    }
  };

  const getIntensityText = () => {
    switch (movementIntensity) {
      case 'extreme': return '🔥 EXTREME!';
      case 'high': return '⚡ HIGH';
      case 'medium': return '💫 MEDIUM';
      case 'low': return '✨ LOW';
      default: return '💤 IDLE';
    }
  };

  const getMotivationalText = () => {
    if (percentComplete >= 100) return "🎉 Goal Smashed!";
    if (percentComplete >= 75) return "🔥 Almost There!";
    if (percentComplete >= 50) return "💪 Halfway Hero!";
    if (percentComplete >= 25) return "⚡ Keep Going!";
    return "🚀 Let's Move!";
  };

  if (!eventId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.lg }}>🎵</Text>
          <Text style={{ color: Colors.text.secondary, fontSize: Typography.size.xl, marginBottom: Spacing.lg, textAlign: "center", fontWeight: Typography.weight.bold }}>
            No Event Selected
          </Text>
          <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base, marginBottom: Spacing['2xl'], textAlign: "center" }}>
            Please select an event to start tracking your movement
          </Text>
          <Pressable onPress={() => router.replace("/(home)")}>
            {({ pressed }) => (
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.lg,
                  paddingHorizontal: Spacing['2xl'],
                  borderRadius: BorderRadius.xl,
                  opacity: pressed ? 0.9 : 1,
                  ...Shadows.lg,
                }}
              >
                <Text style={{ color: Colors.text.primary, fontWeight: Typography.weight.bold, fontSize: Typography.size.lg }}>
                  Go to Home
                </Text>
              </LinearGradient>
            )}
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: BorderRadius.full,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Spacing.lg,
              }}
            >
              <ActivityIndicator size="large" color={Colors.text.primary} />
            </LinearGradient>
          </Animated.View>
          <Text style={{ color: Colors.text.secondary, fontSize: Typography.size.lg, fontWeight: Typography.weight.semibold }}>
            Loading Event...
          </Text>
          <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: Spacing.sm }}>
            Preparing your movement experience
          </Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const eventName = eventInfo?.name || `Event ${eventInfo?.short_code || eventId.slice(0, 8)}`;
  const artistName = eventInfo?.artist_name || "Unknown Artist";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
          {/* Header with Glassmorphism */}
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginHorizontal: -Spacing.lg,
              marginTop: -Spacing.lg,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.xl,
              marginBottom: Spacing.xl,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border.glass,
              ...Shadows.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <Pressable onPress={() => router.back()}>
                {({ pressed }) => (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: BorderRadius.full,
                      backgroundColor: Colors.background.elevated,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: 1,
                      borderColor: Colors.border.glass,
                      ...Shadows.sm,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>←</Text>
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold, textShadowColor: Colors.accent.purple.light, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }}>
                  Movement
                </Text>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, marginTop: 2 }}>
                  Track your energy
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: Spacing.lg }}>

          {/* Event Info Card */}
          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing.lg,
              marginBottom: Spacing.xl,
              ...Shadows.md,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, letterSpacing: 1, marginBottom: Spacing.xs }}>
                  EVENT
                </Text>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }} numberOfLines={1}>
                  {eventName}
                </Text>
              </View>
              {currentRank && (
                <View
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    borderColor: Colors.accent.purple.light,
                  }}
                >
                  <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold }}>
                    #{currentRank}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
              <Text style={{ color: Colors.accent.pink.light, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold }}>
                {artistName}
              </Text>
            </View>
          </LinearGradient>

          {/* Central Energy Container with Glassmorphism */}
          <LinearGradient
            colors={Gradients.glass.dark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: BorderRadius['3xl'],
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing['2xl'],
              marginBottom: Spacing.xl,
              alignItems: "center",
              ...Shadows.xl,
            }}
          >
            {/* Energy Orb Container */}
            <View style={{ width: 280, height: 280, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg }}>
              {/* Outer energy rings */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 280,
                  height: 280,
                  borderRadius: 140,
                  opacity: running ? energyRingOpacity : 0,
                  transform: [{ scale: energyRingScale }],
                }}
              >
                <LinearGradient
                  colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 140,
                  }}
                />
              </Animated.View>

              {/* Rotating ring */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 260,
                  height: 260,
                  transform: [{ rotate: spin }],
                }}
              >
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 130,
                    borderWidth: 2,
                    borderColor: 'transparent',
                    borderTopColor: running ? Colors.accent.purple.light : Colors.border.subtle,
                    borderRightColor: running ? Colors.accent.pink.light : Colors.border.subtle,
                  }}
                />
              </Animated.View>

              {/* Main energy orb */}
              <Animated.View
                style={{
                  width: 240,
                  height: 240,
                  transform: [{ scale: pulseAnim }, { translateX: shakeAnim }],
                }}
              >
                <LinearGradient
                  colors={running
                    ? [Colors.accent.purple.light, Colors.accent.pink.light]
                    : ['rgba(168, 85, 247, 0.3)', 'rgba(236, 72, 153, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 120,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: running ? Colors.accent.purple.light : Colors.border.glass,
                    ...Shadows.xl,
                  }}
                >
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 64, marginBottom: Spacing.sm }}>
                      {running ? '⚡' : '💤'}
                    </Text>
                    <Text style={{ color: Colors.text.primary, fontSize: Typography.size['4xl'], fontWeight: Typography.weight.bold }}>
                      {Math.round(totalEnergy)}
                    </Text>
                    <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, marginTop: Spacing.xs, fontWeight: Typography.weight.semibold, opacity: 0.8 }}>
                      energy points
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Motivational Text inside container */}
            <Text
              style={{
                color: Colors.accent.purple.light,
                fontSize: Typography.size.xl,
                fontWeight: Typography.weight.bold,
                textAlign: "center",
                textShadowColor: Colors.accent.purple.light,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              }}
            >
              {getMotivationalText()}
            </Text>
          </LinearGradient>

          {/* Progress Stats Row */}
          <View style={{ flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl }}>
            {/* Progress Card */}
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
                ...Shadows.sm,
              }}
            >
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: Spacing.xs }}>
                PROGRESS
              </Text>
              <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['3xl'], fontWeight: Typography.weight.bold }}>
                {percentComplete}%
              </Text>
              <View style={{ height: 4, backgroundColor: Colors.background.elevated, borderRadius: BorderRadius.full, marginTop: Spacing.sm, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: `${percentComplete}%`,
                    height: '100%',
                  }}
                />
              </View>
            </LinearGradient>

            {/* Intensity Card */}
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
                ...Shadows.sm,
              }}
            >
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, marginBottom: Spacing.xs }}>
                INTENSITY
              </Text>
              <Text style={{ color: getIntensityColor(), fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }}>
                {getIntensityText()}
              </Text>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, marginTop: Spacing.xs }}>
                {mag.toFixed(2)}
              </Text>
            </LinearGradient>
          </View>

          {/* Start/Stop Button */}
          <Pressable onPress={running ? stop : start}>
            {({ pressed }) => (
              <LinearGradient
                colors={running
                  ? ['#dc2626', '#991b1b']
                  : [Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.xl,
                  borderRadius: BorderRadius['2xl'],
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: Spacing.lg,
                  opacity: pressed ? 0.9 : 1,
                  ...Shadows.xl,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }}
              >
                <View style={{ alignItems: "center", gap: Spacing.sm }}>
                  <Text style={{ fontSize: 40 }}>
                    {running ? '⏹' : '▶️'}
                  </Text>
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size.xl,
                      fontWeight: Typography.weight.bold,
                      letterSpacing: 1,
                    }}
                  >
                    {running ? "STOP TRACKING" : "START MOVING"}
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: Typography.size.sm }}>
                    {running ? "Tap to save your energy" : "Tap to begin tracking"}
                  </Text>
                </View>
              </LinearGradient>
            )}
          </Pressable>

          {/* Leaderboard Button */}
          <Pressable onPress={openLeaderboard}>
            {({ pressed }) => (
              <LinearGradient
                colors={Gradients.glass.medium}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.xl,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.border.glass,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: Spacing.md,
                  marginBottom: Spacing.lg,
                  opacity: pressed ? 0.8 : 1,
                  ...Shadows.md,
                }}
              >
                <Text style={{ fontSize: 24 }}>🏆</Text>
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.lg,
                    fontWeight: Typography.weight.bold,
                  }}
                >
                  View Leaderboard
                </Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Tips Card */}
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              padding: Spacing.lg,
              borderRadius: BorderRadius.xl,
              borderLeftWidth: 3,
              borderLeftColor: Colors.accent.purple.light,
              marginBottom: Spacing.xl,
            }}
          >
            <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" }}>
              <Text style={{ fontSize: 24 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, marginBottom: Spacing.xs }}>
                  Pro Tips
                </Text>
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, lineHeight: 20 }}>
                  • Keep your phone in hand while moving{'\n'}
                  • Dance, jump, or run for maximum energy{'\n'}
                  • The more you move, the higher you climb{'\n'}
                  • Stay safe and have fun!
                </Text>
              </View>
            </View>
          </LinearGradient>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
