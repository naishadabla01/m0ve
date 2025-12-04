// app/move.tsx - Dynamic & Artistic Movement Tracker
import { apiBase } from "@/lib/apiBase";
import { startMotionStream, StreamHandle } from "@/lib/motionStream";
import { supabase } from "@/lib/supabase/client";
import { normalizeScoreForDisplay, calculateProgress } from "@/lib/scoreUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams, Stack } from "expo-router";
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
  Image,
  BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";

const { width, height } = Dimensions.get("window");

type EventInfo = {
  event_id: string;
  name?: string;
  title?: string;
  artist_name?: string;
  artist_id?: string;
  short_code?: string;
  cover_image_url?: string;
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

  // Clean up navigation flag if it exists
  useEffect(() => {
    AsyncStorage.removeItem("navigating_to_move");
  }, []);

  // Intercept hardware/gesture back button
  useEffect(() => {
    const handleBackPress = async () => {
      console.log('🔙 [MOVE] ========== NATIVE BACK GESTURE/BUTTON INTERCEPTED ==========');
      console.log('🔙 [MOVE] Current event_id:', eventId);
      console.log('🔙 [MOVE] Current eventInfo:', eventInfo);

      // Set flag to show Event Details modal when home screen loads
      await AsyncStorage.setItem("shouldShowEventDetails", "true");
      console.log('🔙 [MOVE] ✅ Set shouldShowEventDetails flag to true');

      // Verify it was saved
      const saved = await AsyncStorage.getItem("shouldShowEventDetails");
      console.log('🔙 [MOVE] ✅ Verified flag value:', saved);

      const savedEventId = await AsyncStorage.getItem("event_id");
      console.log('🔙 [MOVE] ✅ Saved event_id in AsyncStorage:', savedEventId);

      // Navigate to home (use replace to clear navigation stack)
      console.log('🔙 [MOVE] Navigating to /(home) with router.replace');
      router.replace("/(home)");
      console.log('🔙 [MOVE] ========================================');

      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => backHandler.remove();
  }, [eventId, eventInfo]);

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
          .select("event_id, name, title, short_code, artist_id, cover_image_url")
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
          cover_image_url: event?.cover_image_url,
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

          // Calculate percentage using normalized score (goal: 100 normalized points)
          setPercentComplete(calculateProgress(userScore?.score || 0));
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

      // Request Android motion permissions
      if (Platform.OS === "android") {
        try {
          const { PermissionsAndroid } = require('react-native');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
            {
              title: "Motion Tracking Permission",
              message: "m0ve needs access to your device's motion sensors to track your movement and award energy points.",
              buttonPositive: "Allow",
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              "Permission Required",
              "Motion tracking requires sensor access. Please enable it in Settings > Apps > m0ve > Permissions."
            );
            return;
          }
        } catch (err) {
          console.error("Permission error:", err);
          return;
        }
      }

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
          setPercentComplete(calculateProgress(userScore.score || 0));
        }
      } catch (e) {
        console.error("Failed to poll energy:", e);
      }
    }, 5000); // Poll every 5 seconds (reduced from 3s to lower database read load)

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

    // Batch motion data every 3 seconds instead of 1 second
    // This reduces database writes by 66% while maintaining data accuracy
    streamRef.current = startMotionStream(eventId!, 3000);
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
      pathname: "/leaderboard",
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
      case 'extreme': return 'EXTREME';
      case 'high': return 'HIGH';
      case 'medium': return 'MEDIUM';
      case 'low': return 'LOW';
      default: return 'IDLE';
    }
  };

  const getMotivationalText = () => {
    if (percentComplete >= 100) return "Goal Smashed!";
    if (percentComplete >= 75) return "Almost There!";
    if (percentComplete >= 50) return "Halfway There!";
    if (percentComplete >= 25) return "Keep Going!";
    return "Let's Move!";
  };

  if (!eventId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}
        >
          <View style={{ alignItems: "center", gap: Spacing.lg, maxWidth: 300 }}>
            {/* Icon */}
            <View style={{
              width: 100,
              height: 100,
              borderRadius: BorderRadius.full,
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
              borderWidth: 2,
              borderColor: 'rgba(168, 85, 247, 0.4)',
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="musical-notes-outline" size={50} color={Colors.accent.purple.light} />
            </View>

            {/* Text */}
            <View style={{ alignItems: "center", gap: Spacing.sm }}>
              <Text style={{ color: Colors.text.primary, fontSize: Typography.size['2xl'], fontWeight: '600', textAlign: "center" }}>
                No Event Selected
              </Text>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.base, textAlign: "center", lineHeight: 22 }}>
                Join an event to start tracking your movement and earning energy points
              </Text>
            </View>

            {/* Button */}
            <Pressable onPress={() => router.replace("/(home)")}>
              {({ pressed }) => (
                <LinearGradient
                  colors={['#10b981', '#34d399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    paddingVertical: Spacing.lg,
                    paddingHorizontal: Spacing['2xl'],
                    borderRadius: BorderRadius.full,
                    opacity: pressed ? 0.85 : 1,
                    ...Shadows.lg,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: Spacing.sm,
                  }}
                >
                  <Ionicons name="home" size={22} color="#ffffff" />
                  <Text style={{ color: Colors.text.primary, fontWeight: '700', fontSize: Typography.size.lg }}>
                    Go to Home
                  </Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Show loading screen during data loading
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {/* Minimal Loading Container */}
          <View style={{ alignItems: "center", gap: Spacing.lg }}>
            {/* Three Animated Dots - Minimal & Clean */}
            <Animated.View
              style={{
                flexDirection: "row",
                gap: 12,
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.1],
                  outputRange: [0.5, 1],
                }),
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.accent.purple.light,
                }}
              />
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.accent.pink.light,
                }}
              />
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#60a5fa', // Light blue
                }}
              />
            </Animated.View>

            {/* Loading Text - Clean Typography */}
            <View style={{ alignItems: "center", gap: Spacing.xs, marginTop: Spacing.sm }}>
              <Text
                style={{
                  color: Colors.text.primary,
                  fontSize: Typography.size.xl,
                  fontWeight: '300',
                  letterSpacing: 2,
                }}
              >
                Loading
              </Text>
              <Text
                style={{
                  color: Colors.text.muted,
                  fontSize: Typography.size.sm,
                  fontWeight: '300',
                  letterSpacing: 1,
                }}
              >
                Preparing your experience
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const eventName = eventInfo?.name || `Event ${eventInfo?.short_code || eventId.slice(0, 8)}`;
  const artistName = eventInfo?.artist_name || "Unknown Artist";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back gesture
          animation: 'slide_from_right',
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={{ flex: 1 }}
        >
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }} showsVerticalScrollIndicator={false}>
          {/* Header - Apple Music Style */}
          <View
            style={{
              paddingTop: Spacing.md,
              paddingBottom: Spacing.lg,
              paddingHorizontal: Spacing.lg,
              marginBottom: Spacing.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable
                onPress={async () => {
                  console.log('🔙 [MOVE] ========== BACK BUTTON PRESSED ==========');
                  console.log('🔙 [MOVE] Current event_id:', eventId);
                  console.log('🔙 [MOVE] Current eventInfo:', eventInfo);

                  // Set flag to show Event Details modal when home screen loads
                  await AsyncStorage.setItem("shouldShowEventDetails", "true");
                  console.log('🔙 [MOVE] ✅ Set shouldShowEventDetails flag to true');

                  // Verify it was saved
                  const saved = await AsyncStorage.getItem("shouldShowEventDetails");
                  console.log('🔙 [MOVE] ✅ Verified flag value:', saved);

                  const savedEventId = await AsyncStorage.getItem("event_id");
                  console.log('🔙 [MOVE] ✅ Saved event_id in AsyncStorage:', savedEventId);

                  // Navigate to home (use replace to clear navigation stack)
                  console.log('🔙 [MOVE] Navigating to /(home) with router.replace');
                  router.replace("/(home)");
                  console.log('🔙 [MOVE] ========================================');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Spacing.sm,
                  paddingRight: Spacing.md,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {({ pressed }) => (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: pressed ? 0.6 : 1,
                  }}>
                    <Ionicons name="chevron-back" size={32} color={Colors.accent.purple.light} />
                    <Text style={{
                      color: Colors.accent.purple.light,
                      fontSize: Typography.size.lg,
                      fontWeight: Typography.weight.semibold,
                      marginLeft: -4,
                    }}>
                      Home
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={{
                color: Colors.text.primary,
                fontSize: Typography.size['2xl'],
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                Movement
              </Text>

              <View style={{ width: 28 }} />
            </View>
          </View>

          <View style={{ paddingHorizontal: Spacing.lg }}>

          {/* Event Info - Clean Apple Music Style */}
          <View
            style={{
              padding: Spacing.lg,
              marginBottom: Spacing.xl,
            }}
          >
            <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "center" }}>
              {/* Event Cover Photo */}
              {eventInfo?.cover_image_url ? (
                <View
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: BorderRadius.md,
                    overflow: 'hidden',
                    ...Shadows.sm,
                  }}
                >
                  <Image
                    source={{ uri: eventInfo.cover_image_url }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <LinearGradient
                  colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: BorderRadius.md,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="musical-notes" size={32} color="#ffffff" />
                </LinearGradient>
              )}

              {/* Event Details */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>
                  {eventName}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                  <Ionicons name="person" size={14} color={Colors.text.muted} />
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm }} numberOfLines={1}>
                    {artistName}
                  </Text>
                </View>
              </View>

              {/* Rank Badge */}
              {currentRank && (
                <View
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm,
                    borderRadius: BorderRadius.lg,
                    borderWidth: 1.5,
                    borderColor: Colors.accent.purple.light,
                  }}
                >
                  <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size.sm, fontWeight: '700' }}>
                    #{currentRank}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Central Energy Display - Modern Minimal */}
          <View
            style={{
              paddingVertical: Spacing['2xl'],
              marginBottom: Spacing.lg,
              alignItems: "center",
            }}
          >
            {/* Energy Score - Large Display */}
            <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', marginBottom: Spacing.md }}>
                Energy Points
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text style={{ color: Colors.text.primary, fontSize: 72, fontWeight: '700', letterSpacing: -2 }}>
                  {normalizeScoreForDisplay(totalEnergy)}
                </Text>
              </Animated.View>
              <Text
                style={{
                  color: running ? Colors.accent.purple.light : Colors.text.muted,
                  fontSize: Typography.size.sm,
                  fontWeight: '600',
                  marginTop: Spacing.sm,
                }}
              >
                {getMotivationalText()}
              </Text>
            </View>

            {/* Flowing Energy Bars - Modern Visualization */}
            <View style={{ width: '80%', gap: Spacing.sm }}>
              {[0, 1, 2, 3, 4].map((index) => {
                const delay = index * 200;
                const barOpacity = running ? 0.8 : 0.2;
                const barWidth = running ? `${80 + (index * 4)}%` : '40%';

                return (
                  <Animated.View
                    key={index}
                    style={{
                      height: 4,
                      width: barWidth,
                      backgroundColor: index % 2 === 0 ? Colors.accent.purple.light : Colors.accent.pink.light,
                      borderRadius: 2,
                      opacity: barOpacity,
                      alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end',
                    }}
                  />
                );
              })}
            </View>

            {/* Status Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xl }}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: running ? '#10b981' : Colors.text.muted,
              }} />
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
                {running ? 'Tracking' : 'Idle'}
              </Text>
            </View>
          </View>

          {/* Progress Stats Row - Aligned */}
          <View style={{ flexDirection: "row", gap: Spacing['2xl'], marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg }}>
            {/* Progress */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.sm }}>
                <Ionicons name="trending-up" size={16} color={Colors.text.muted} />
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Progress
                </Text>
              </View>
              <Text style={{ color: Colors.accent.purple.light, fontSize: Typography.size['2xl'], fontWeight: '700', marginBottom: Spacing.sm }}>
                {percentComplete}%
              </Text>
              <View style={{ height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: BorderRadius.full, overflow: 'hidden' }}>
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
            </View>

            {/* Intensity */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.sm }}>
                <Ionicons name="speedometer" size={16} color={Colors.text.muted} />
                <Text style={{ color: Colors.text.muted, fontSize: Typography.size.xs, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Intensity
                </Text>
              </View>
              <Text style={{ color: getIntensityColor(), fontSize: Typography.size['2xl'], fontWeight: '700', marginBottom: Spacing.sm }}>
                {getIntensityText()}
              </Text>
              {/* Visual Intensity Indicator */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {['idle', 'low', 'medium', 'high', 'extreme'].map((level, index) => {
                  const intensityLevels = ['idle', 'low', 'medium', 'high', 'extreme'];
                  const currentLevel = intensityLevels.indexOf(movementIntensity);
                  const isActive = index <= currentLevel;

                  const getLevelColor = (lvl: string) => {
                    switch (lvl) {
                      case 'extreme': return '#ef4444';
                      case 'high': return '#f59e0b';
                      case 'medium': return '#eab308';
                      case 'low': return '#84cc16';
                      default: return Colors.text.muted;
                    }
                  };

                  return (
                    <View
                      key={level}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isActive ? getLevelColor(level) : 'rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Start/Stop Button - Minimal iOS Style */}
          <Pressable onPress={running ? stop : start}>
            {({ pressed }) => (
              <View
                style={{
                  paddingVertical: Spacing.xl,
                  borderRadius: BorderRadius['2xl'],
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: Spacing.md,
                  backgroundColor: running ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  borderWidth: 1.5,
                  borderColor: running ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                  <Ionicons
                    name={running ? "stop-circle-outline" : "play-circle-outline"}
                    size={28}
                    color={running ? '#ef4444' : '#10b981'}
                  />
                  <Text
                    style={{
                      color: running ? '#ef4444' : '#10b981',
                      fontSize: Typography.size.lg,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                    }}
                  >
                    {running ? "Stop Tracking" : "Start Moving"}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>

          {/* Leaderboard Button - Minimal */}
          <Pressable onPress={openLeaderboard}>
            {({ pressed }) => (
              <View
                style={{
                  paddingVertical: Spacing.md,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: Spacing.sm,
                  marginBottom: Spacing.xl,
                  opacity: pressed ? 0.6 : 1,
                }}
              >
                <Ionicons name="stats-chart-outline" size={20} color={Colors.accent.purple.light} />
                <Text
                  style={{
                    color: Colors.accent.purple.light,
                    fontSize: Typography.size.base,
                    fontWeight: '600',
                  }}
                >
                  View Leaderboard
                </Text>
              </View>
            )}
          </Pressable>

          {/* Movement Guide Cards */}
          <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.xs }}>
              <Ionicons name="information-circle" size={22} color={Colors.accent.purple.light} />
              <Text style={{ color: Colors.text.primary, fontSize: Typography.size.lg, fontWeight: '600' }}>
                How to Move
              </Text>
            </View>

            {/* Phone in Hand Guide */}
            <View
              style={{
                paddingVertical: Spacing.md,
              }}
            >
              <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "center" }}>
                {/* Icon */}
                <Ionicons name="phone-portrait" size={28} color={Colors.accent.purple.light} />

                {/* Description */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '600', marginBottom: 4 }}>
                    Phone in Hand
                  </Text>
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, lineHeight: 18 }}>
                    Hold your phone and move freely - dance, jump, shake!
                  </Text>
                </View>
              </View>
            </View>

            {/* Phone in Pocket Guide */}
            <View
              style={{
                paddingVertical: Spacing.md,
              }}
            >
              <View style={{ flexDirection: "row", gap: Spacing.md, alignItems: "center" }}>
                {/* Icon */}
                <Ionicons name="walk" size={28} color={Colors.accent.pink.light} />

                {/* Description */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text.primary, fontSize: Typography.size.base, fontWeight: '600', marginBottom: 4 }}>
                    Phone in Pocket
                  </Text>
                  <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, lineHeight: 18 }}>
                    Secure your phone and move freely to the beat!
                  </Text>
                </View>
              </View>
            </View>

            {/* Tip */}
            <View style={{
              paddingVertical: Spacing.md,
              paddingTop: Spacing.lg,
              flexDirection: "row",
              gap: Spacing.sm,
              alignItems: "center",
            }}>
              <Ionicons name="bulb" size={20} color="#10b981" />
              <Text style={{ color: Colors.text.muted, fontSize: Typography.size.sm, flex: 1, lineHeight: 18 }}>
                <Text style={{ color: '#10b981', fontWeight: '600' }}>Pro Tip:</Text> More intense movement = faster energy gain!
              </Text>
            </View>
          </View>
          </View>
        </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}
