// app/(home)/notifications.tsx
import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from "../../constants/Design";

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing['2xl'],
          paddingBottom: 120, // Space for tab bar
        }}
      >
        {/* Header */}
        <Text
          style={{
            color: Colors.text.primary,
            fontSize: Typography.size['4xl'],
            fontWeight: Typography.weight.bold,
            marginBottom: Spacing.xl,
          }}
        >
          Notifications
        </Text>

        {/* Coming Soon Card */}
        <LinearGradient
          colors={Gradients.glass.medium}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: BorderRadius['2xl'],
            borderWidth: 1,
            borderColor: Colors.border.glass,
            padding: Spacing['3xl'],
            alignItems: "center",
            ...Shadows.lg,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.lg }}>🔔</Text>
          <Text
            style={{
              color: Colors.text.primary,
              fontSize: Typography.size.xl,
              fontWeight: Typography.weight.bold,
              marginBottom: Spacing.sm,
            }}
          >
            Coming Soon
          </Text>
          <Text
            style={{
              color: Colors.text.muted,
              fontSize: Typography.size.base,
              textAlign: "center",
            }}
          >
            Get notified about event updates, call invitations, and more
          </Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}
