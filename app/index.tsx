// app/index.tsx
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

const EVENT_REF = "c24f989e-3551-49d2-97c0-75bd54e7ac25"; // keep if you use later

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" />

      {/* Background drops */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: 9999,
            backgroundColor: "#10b981", // emerald
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
            borderRadius: 9999,
            backgroundColor: "#22d3ee", // cyan
            opacity: 0.10,
            filter: Platform.OS === "web" ? "blur(70px)" : undefined,
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 8,
          borderBottomColor: "#1f2937",
          borderBottomWidth: 1,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: "#a3a3a3", fontSize: 12, letterSpacing: 1.1 }}
        >
          WELCOME TO
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Simple text logo */}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: "#10b981",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>M</Text>
          </View>
          <Text
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: "700",
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
          paddingHorizontal: 24,
          paddingTop: 36,
          justifyContent: "center",
          gap: 22,
        }}
      >
        <Text
          style={{
            color: "#d4d4d4",
            fontSize: 18,
            lineHeight: 26,
            textAlign: "center",
          }}
        >
          Track movement. Power the crowd. Compete on live leaderboards.
        </Text>

        <View style={{ gap: 12 }}>
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
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderTopColor: "#1f2937",
          borderTopWidth: 1,
          opacity: 0.85,
        }}
      >
        <Text
          style={{
            color: "#9ca3af",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Move • Built for motion-powered events
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** Buttons (keeps your navigation flow exactly the same) */

function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#0ea371" : "#10b981",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        shadowColor: "#10b981",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      })}
    >
      <Text style={{ color: "#051b13", fontWeight: "700", fontSize: 16 }}>
        {title}
      </Text>
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#111827" : "transparent",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#1f2937",
      })}
    >
      <Text style={{ color: "#e5e7eb", fontWeight: "600", fontSize: 16 }}>
        {title}
      </Text>
    </Pressable>
  );
}
