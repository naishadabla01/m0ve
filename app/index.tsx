// app/index.tsx - Animated Welcome/Splash Screen
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";

const { width, height } = Dimensions.get("window");

export default function SplashWelcome() {
  // Animation values for flowing gradients
  const flowAnim1 = useRef(new Animated.Value(0)).current;
  const flowAnim2 = useRef(new Animated.Value(0)).current;
  const flowAnim3 = useRef(new Animated.Value(0)).current;
  const flowAnim4 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start flowing animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim3, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim3, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flowAnim4, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(flowAnim4, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Fade in modal
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Interpolate positions for flowing lines
  const translateY1 = flowAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-height * 0.3, height * 0.3],
  });

  const translateX1 = flowAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.2, width * 0.2],
  });

  const translateY2 = flowAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.4, -height * 0.4],
  });

  const translateX2 = flowAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.3, -width * 0.3],
  });

  const translateY3 = flowAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [-height * 0.2, height * 0.5],
  });

  const rotate3 = flowAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const translateY4 = flowAnim4.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.5, -height * 0.3],
  });

  const translateX4 = flowAnim4.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.4, width * 0.4],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 2, width * 2],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Animated Flowing Gradient Lines */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* Flow Line 1 - Purple diagonal */}
        <Animated.View
          style={{
            position: "absolute",
            top: "20%",
            left: "-20%",
            width: width * 1.5,
            height: 200,
            transform: [
              { translateY: translateY1 },
              { translateX: translateX1 },
              { rotate: '45deg' },
            ],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(168, 85, 247, 0.0)',
              'rgba(168, 85, 247, 0.3)',
              'rgba(168, 85, 247, 0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, filter: Platform.OS === 'web' ? 'blur(40px)' : undefined }}
          />
        </Animated.View>

        {/* Flow Line 2 - Pink diagonal */}
        <Animated.View
          style={{
            position: "absolute",
            top: "60%",
            right: "-20%",
            width: width * 1.5,
            height: 180,
            transform: [
              { translateY: translateY2 },
              { translateX: translateX2 },
              { rotate: '-45deg' },
            ],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(236, 72, 153, 0.0)',
              'rgba(236, 72, 153, 0.25)',
              'rgba(236, 72, 153, 0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, filter: Platform.OS === 'web' ? 'blur(40px)' : undefined }}
          />
        </Animated.View>

        {/* Flow Line 3 - Purple/Pink blend */}
        <Animated.View
          style={{
            position: "absolute",
            top: "40%",
            left: "10%",
            width: width * 0.8,
            height: 150,
            transform: [
              { translateY: translateY3 },
              { rotate: rotate3 },
            ],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(147, 51, 234, 0.0)',
              'rgba(168, 85, 247, 0.2)',
              'rgba(236, 72, 153, 0.2)',
              'rgba(219, 39, 119, 0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, borderRadius: BorderRadius.full, filter: Platform.OS === 'web' ? 'blur(50px)' : undefined }}
          />
        </Animated.View>

        {/* Flow Line 4 - Horizontal wave */}
        <Animated.View
          style={{
            position: "absolute",
            top: "30%",
            left: "-40%",
            width: width * 1.8,
            height: 120,
            transform: [
              { translateY: translateY4 },
              { translateX: translateX4 },
            ],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(168, 85, 247, 0.0)',
              'rgba(219, 39, 119, 0.2)',
              'rgba(168, 85, 247, 0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, filter: Platform.OS === 'web' ? 'blur(30px)' : undefined }}
          />
        </Animated.View>

        {/* Pulsing Orbs */}
        <Animated.View
          style={{
            position: "absolute",
            top: "15%",
            left: "20%",
            width: 150,
            height: 150,
            borderRadius: BorderRadius.full,
            transform: [{ scale: pulseAnim }],
          }}
        >
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.25)', 'rgba(168, 85, 247, 0.0)']}
            style={{
              flex: 1,
              borderRadius: BorderRadius.full,
              filter: Platform.OS === 'web' ? 'blur(40px)' : undefined,
            }}
          />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",
            bottom: "20%",
            right: "25%",
            width: 120,
            height: 120,
            borderRadius: BorderRadius.full,
            transform: [{ scale: pulseAnim }],
          }}
        >
          <LinearGradient
            colors={['rgba(236, 72, 153, 0.25)', 'rgba(236, 72, 153, 0.0)']}
            style={{
              flex: 1,
              borderRadius: BorderRadius.full,
              filter: Platform.OS === 'web' ? 'blur(35px)' : undefined,
            }}
          />
        </Animated.View>

        {/* Static ambient blobs - enhanced */}
        <View
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.light,
            opacity: 0.1,
            filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.pink.light,
            opacity: 0.08,
            filter: Platform.OS === 'web' ? 'blur(90px)' : undefined,
          }}
        />

        {/* Additional corner blobs */}
        <View
          style={{
            position: "absolute",
            top: "50%",
            right: -40,
            width: 180,
            height: 180,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.DEFAULT,
            opacity: 0.12,
            filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "30%",
            left: -50,
            width: 200,
            height: 200,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.pink.DEFAULT,
            opacity: 0.1,
            filter: Platform.OS === 'web' ? 'blur(70px)' : undefined,
          }}
        />
      </View>

      {/* Center Modal - Glassmorphism Card */}
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: Spacing['2xl'],
          opacity: fadeIn,
          transform: [{ scale: scaleIn }],
        }}
      >
        <View style={{ width: "100%", maxWidth: 400, position: "relative" }}>
          {/* Shimmer overlay */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: BorderRadius['2xl'],
              overflow: "hidden",
              opacity: 0.3,
            }}
            pointerEvents="none"
          >
            <Animated.View
              style={{
                width: "50%",
                height: "100%",
                transform: [{ translateX: shimmerTranslate }],
              }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </Animated.View>

          <LinearGradient
            colors={Gradients.glass.medium}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              borderRadius: BorderRadius['2xl'],
              borderWidth: 1,
              borderColor: Colors.border.glass,
              padding: Spacing['4xl'],
              alignItems: "center",
              gap: Spacing['2xl'],
              ...Shadows.xl,
            }}
          >
          {/* Logo */}
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: BorderRadius.xl,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.md,
              ...Shadows.lg,
            }}
          >
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size['4xl'],
                fontWeight: Typography.weight.extrabold,
              }}
            >
              M
            </Text>
          </LinearGradient>

          {/* Welcome Text */}
          <View style={{ gap: Spacing.md, alignItems: "center" }}>
            <Text
              style={{
                color: Colors.text.primary,
                fontSize: Typography.size['4xl'],
                fontWeight: Typography.weight.bold,
                textAlign: "center",
              }}
            >
              Welcome to m0ve
            </Text>
            <Text
              style={{
                color: Colors.text.muted,
                fontSize: Typography.size.base,
                textAlign: "center",
                lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
                paddingHorizontal: Spacing.md,
              }}
            >
              Transform your energy into unforgettable moments. Track your movement, compete with the crowd, and power live events.
            </Text>
          </View>

          {/* Enter Button */}
          <Pressable
            onPress={() => router.push("/welcome")}
            style={{ width: "100%", marginTop: Spacing.lg }}
          >
            {({ pressed }) => (
              <LinearGradient
                colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: Spacing.lg,
                  borderRadius: BorderRadius.lg,
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                  ...Shadows.lg,
                }}
              >
                <Text
                  style={{
                    color: Colors.text.primary,
                    fontWeight: Typography.weight.bold,
                    fontSize: Typography.size.lg,
                    letterSpacing: 0.5,
                  }}
                >
                  Enter
                </Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Tagline */}
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.xs,
              textAlign: "center",
              marginTop: Spacing.sm,
              opacity: 0.7,
            }}
          >
            Are you ready to move?
          </Text>
        </LinearGradient>
        </View>
      </Animated.View>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: Spacing['2xl'],
          paddingVertical: Spacing.lg,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: Colors.text.muted,
            fontSize: Typography.size.xs,
            opacity: 0.5,
          }}
        >
          © {new Date().getFullYear()} Move Platform
        </Text>
      </View>
    </SafeAreaView>
  );
}
