// components/FloatingTabBar.tsx - iOS 26 Floating Tab Bar with Center QR Button
import React, { useEffect, useRef } from "react";
import { View, Pressable, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Shadows } from "../constants/Design";
import { router } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    // Navigate directly to QR scanner
    router.push("/scan");
  };

  // Tab bar dimensions
  const TAB_WIDTH = 60;
  const TAB_HEIGHT = 50;
  const BAR_HEIGHT = 60;
  const BAR_PADDING = 12;
  const QR_BUTTON_SIZE = 64;
  const QR_SPACING = 16; // Space for QR button

  // Calculate total bar width
  const barWidth = SCREEN_WIDTH - 32; // 16px margin on each side

  // Calculate positions for tabs (evenly distributed)
  const tabPositions = [
    BAR_PADDING, // Home
    BAR_PADDING + TAB_WIDTH + 4, // Notifications
    barWidth - BAR_PADDING - (TAB_WIDTH * 2) - 4, // Search
    barWidth - BAR_PADDING - TAB_WIDTH, // Profile
  ];

  // Get animated indicator position
  const getIndicatorPosition = () => {
    return activeIndexAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: tabPositions,
    });
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        height: BAR_HEIGHT + 24, // Extra space for floating QR button
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      {/* Floating QR Button - Above the bar */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          marginLeft: -QR_BUTTON_SIZE / 2,
          zIndex: 10,
        }}
      >
        <Pressable onPress={handleQRPress}>
          {({ pressed }) => (
            <LinearGradient
              colors={[Colors.accent.purple.light, Colors.accent.pink.light]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: QR_BUTTON_SIZE,
                height: QR_BUTTON_SIZE,
                borderRadius: QR_BUTTON_SIZE / 2,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 5,
                borderColor: "#0a0a0a",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
                ...Shadows.xl,
              }}
            >
              {/* Better QR Code Icon Design */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={{ position: "relative" }}>
                  {/* QR Corner squares */}
                  <View style={{ width: 28, height: 28 }}>
                    {/* Top-left square */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 10,
                        height: 10,
                        borderWidth: 2,
                        borderColor: "#ffffff",
                        borderRadius: 2,
                      }}
                    />
                    {/* Top-right square */}
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderWidth: 2,
                        borderColor: "#ffffff",
                        borderRadius: 2,
                      }}
                    />
                    {/* Bottom-left square */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: 10,
                        height: 10,
                        borderWidth: 2,
                        borderColor: "#ffffff",
                        borderRadius: 2,
                      }}
                    />
                    {/* Center dots pattern */}
                    <View
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        marginTop: -2,
                        marginLeft: -2,
                        width: 4,
                        height: 4,
                        backgroundColor: "#ffffff",
                        borderRadius: 1,
                      }}
                    />
                  </View>
                </View>
              </View>
            </LinearGradient>
          )}
        </Pressable>
      </View>

      {/* Tab Bar Container */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.95)", "rgba(20, 20, 20, 0.9)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: BAR_HEIGHT,
          width: barWidth,
          borderRadius: BAR_HEIGHT / 2,
          paddingHorizontal: BAR_PADDING,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
          ...Shadows.xl,
        }}
      >
        {/* Active Tab Indicator with Swoosh Animation */}
        <Animated.View
          style={{
            position: "absolute",
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            borderRadius: TAB_HEIGHT / 2,
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
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: TAB_HEIGHT / 2,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 0 ? "home" : "home-outline"}
                size={24}
                color={state.index === 0 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Notifications Tab */}
        <Pressable
          onPress={() => navigation.navigate("notifications")}
          style={{
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: TAB_HEIGHT / 2,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 1 ? "heart" : "heart-outline"}
                size={24}
                color={state.index === 1 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Center Spacer for QR Button */}
        <View style={{ width: QR_BUTTON_SIZE + QR_SPACING }} />

        {/* Search Tab */}
        <Pressable
          onPress={() => navigation.navigate("search")}
          style={{
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: TAB_HEIGHT / 2,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 2 ? "settings" : "settings-outline"}
                size={24}
                color={state.index === 2 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>

        {/* Profile Tab */}
        <Pressable
          onPress={() => navigation.navigate("profile")}
          style={{
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: TAB_HEIGHT / 2,
          }}
        >
          {({ pressed }) => (
            <View style={{ opacity: pressed ? 0.6 : 1 }}>
              <Ionicons
                name={state.index === 3 ? "person" : "person-outline"}
                size={24}
                color={state.index === 3 ? Colors.accent.purple.light : Colors.text.tertiary}
              />
            </View>
          )}
        </Pressable>
      </LinearGradient>
    </View>
  );
}
