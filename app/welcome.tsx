// app/welcome.tsx - Sign In/Sign Up Selection
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../constants/Design";

export default function Welcome() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar barStyle="light-content" />

      {/* iOS 26 Background Blobs - Purple/Pink */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.light,
            opacity: 0.15,
            filter: Platform.OS === "web" ? "blur(60px)" : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -80,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.pink.light,
            opacity: 0.10,
            filter: Platform.OS === "web" ? "blur(70px)" : undefined,
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          paddingHorizontal: Spacing['2xl'],
          paddingTop: Spacing.md,
          paddingBottom: Spacing.sm,
          borderBottomColor: Colors.border.glass,
          borderBottomWidth: 1,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: Colors.text.muted, fontSize: Typography.size.xs, letterSpacing: 1.1 }}
        >
          WELCOME TO
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
          {/* Logo with purple/pink gradient */}
          <LinearGradient
            colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: BorderRadius.sm,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: Colors.text.primary, fontWeight: Typography.weight.bold }}>M</Text>
          </LinearGradient>
          <Text
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size['3xl'],
              fontWeight: Typography.weight.bold,
              letterSpacing: 0.5,
            }}
          >
            Move
          </Text>
        </View>
      </View>

      {/* Body */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: Spacing['2xl'],
          paddingTop: Spacing['4xl'],
          justifyContent: "center",
          gap: Spacing['2xl'],
        }}
      >
        <Text
          style={{
            color: Colors.text.secondary,
            fontSize: Typography.size.lg,
            lineHeight: 26,
            textAlign: "center",
          }}
        >
          Track movement. Power the crowd. Compete on live leaderboards.
        </Text>

        <View style={{ gap: Spacing.md }}>
          <PrimaryButton
            title="Sign in"
            onPress={() => router.push("/(auth)/signin")}
          />
          <SecondaryButton
            title="Sign up"
            onPress={() => router.push("/(auth)/signup")}
          />
        </View>
      </View>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: Spacing['2xl'],
          paddingVertical: Spacing.lg,
          borderTopColor: Colors.border.glass,
          borderTopWidth: 1,
          opacity: 0.85,
        }}
      >
        <Text
          style={{
            color: Colors.text.muted,
            fontSize: Typography.size.xs,
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Move • Built for motion-powered events
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** iOS 26 Gradient Buttons */

function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
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
              fontSize: Typography.size.base
            }}
          >
            {title}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={Gradients.glass.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: Spacing.lg,
            borderRadius: BorderRadius.lg,
            alignItems: "center",
            borderWidth: 1,
            borderColor: Colors.border.glass,
            opacity: pressed ? 0.8 : 1,
          }}
        >
          <Text
            style={{
              color: Colors.text.secondary,
              fontWeight: Typography.weight.semibold,
              fontSize: Typography.size.base
            }}
          >
            {title}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}
