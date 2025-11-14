// components/FloatingTabBar.tsx - iOS 26 Floating Tab Bar with Center QR Button
import React, { useEffect, useRef } from "react";
import { View, Pressable, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Shadows } from "../constants/Design";
import { eventEmitter } from "../lib/events";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Animation for active tab indicator swoosh
  const activeIndexAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(activeIndexAnim, {
      toValue: state.index,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [state.index]);

  const handleQRPress = () => {
    // Navigate to home if not already there
    if (state.index !== 0) {
      navigation.navigate("index");
    }
    // Emit event to open join modal
    eventEmitter.emit("openJoinModal");
  };

  // Calculate indicator position (excluding center QR button)
  const getIndicatorPosition = () => {
    const tabWidth = 70; // Width of each tab
    const spacing = 8; // Spacing between tabs

    let position;
    if (state.index === 0) position = 16; // Home
    else if (state.index === 1) position = 16 + tabWidth + spacing; // Notifications
    else if (state.index === 2) position = 16 + (tabWidth + spacing) * 2 + 80; // Search (after QR)
    else position = 16 + (tabWidth + spacing) * 3 + 80; // Profile

    return activeIndexAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [16, 16 + tabWidth + spacing, 16 + (tabWidth + spacing) * 2 + 80, 16 + (tabWidth + spacing) * 3 + 80],
    });
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        height: 70,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Floating Tab Bar Container */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.95)", "rgba(20, 20, 20, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          height: 70,
          borderRadius: 35,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
          ...Shadows.xl,
        }}
      >
        {/* Active Tab Indicator with Swoosh Animation */}
        <Animated.View
          style={{
            position: "absolute",
            width: 70,
            height: 54,
            borderRadius: 27,
            backgroundColor: "rgba(168, 85, 247, 0.2)",
            borderWidth: 1,
            borderColor: "rgba(168, 85, 247, 0.4)",
            left: getIndicatorPosition(),
            ...Shadows.lg,
          }}
        />

        {/* Home Tab */}
        <Pressable
          onPress={() => navigation.navigate("index")}
          style={{
            width: 70,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 27,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 0 ? "home" : "home-outline"}
                size={26}
                color={state.index === 0 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Notifications Tab */}
        <Pressable
          onPress={() => navigation.navigate("notifications")}
          style={{
            width: 70,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 27,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 1 ? "heart" : "heart-outline"}
                size={26}
                color={state.index === 1 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Center QR Button - Floating Above */}
        <View style={{ width: 80, alignItems: "center", justifyContent: "center" }}>
          <Pressable onPress={handleQRPress}>
            {({ pressed }) => (
              <LinearGradient
                colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -50, // Float above the tab bar
                  borderWidth: 4,
                  borderColor: "#0a0a0a",
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  ...Shadows.xl,
                }}
              >
                <Ionicons name="qr-code-outline" size={32} color="#ffffff" />
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {/* Search Tab */}
        <Pressable
          onPress={() => navigation.navigate("search")}
          style={{
            width: 70,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 27,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 2 ? "settings" : "settings-outline"}
                size={26}
                color={state.index === 2 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Profile Tab */}
        <Pressable
          onPress={() => navigation.navigate("profile")}
          style={{
            width: 70,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 27,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 3 ? "person" : "person-outline"}
                size={26}
                color={state.index === 3 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>
      </LinearGradient>
    </View>
  );
}
