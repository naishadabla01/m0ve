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

  // Tab bar dimensions - iOS 26 liquid glass style
  const TAB_WIDTH = 56;
  const TAB_HEIGHT = 48;
  const BAR_HEIGHT = 64; // Taller (was 54)
  const BAR_PADDING = 20; // More padding for narrower appearance
  const QR_BUTTON_SIZE = 72; // Increased from 68
  const QR_SPACING = 12; // Space for QR button

  // Calculate total bar width (much narrower - double narrow)
  const barWidth = SCREEN_WIDTH - 80; // 40px margin on each side (much narrower bar)

  // Calculate positions for tabs - CORRECTED alignment
  // The bar uses space-between, so tabs are at edges and we need to find their centers
  const leftSectionWidth = (barWidth - QR_SPACING - QR_BUTTON_SIZE) / 2;
  const rightSectionStart = leftSectionWidth + QR_BUTTON_SIZE + QR_SPACING;

  // For left section (Home, Notifications): distribute in left half
  const leftTabSpacing = (leftSectionWidth - TAB_WIDTH * 2) / 3; // space before, between, after

  // For right section (Search, Profile): distribute in right half
  const rightSectionWidth = leftSectionWidth;
  const rightTabSpacing = (rightSectionWidth - TAB_WIDTH * 2) / 3;

  // Fine-tune offsets based on visual alignment (from user feedback - round 3)
  const OFFSET_HOME = 12;          // +4px more (was 6, now 10)
  const OFFSET_NOTIFICATIONS = 5;  // +2px more (was 0, now 2)
  const OFFSET_SEARCH = -7.5;        // -2px more (was -4, now -6)
  const OFFSET_PROFILE = -14;      // -4px more (was -6, now -10)

  const tabPositions = [
    leftTabSpacing + OFFSET_HOME, // Home - adjusted right
    leftTabSpacing + TAB_WIDTH + leftTabSpacing + OFFSET_NOTIFICATIONS, // Notifications - adjusted right
    rightSectionStart + rightTabSpacing + OFFSET_SEARCH, // Search - adjusted left
    rightSectionStart + rightTabSpacing + TAB_WIDTH + rightTabSpacing + OFFSET_PROFILE, // Profile - adjusted left
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
        bottom: 12,
        left: 40, // Match narrower bar margins
        right: 40, // Match narrower bar margins
        height: BAR_HEIGHT + 36, // Extra space for floating QR button (higher)
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
              colors={[
                Colors.accent.purple.light,
                "#c084fc",
                Colors.accent.pink.light,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: QR_BUTTON_SIZE,
                height: QR_BUTTON_SIZE,
                borderRadius: QR_BUTTON_SIZE / 2,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 6,
                borderColor: "rgba(10, 10, 10, 0.95)",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
                shadowColor: Colors.accent.purple.light,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {/* QR Code Icon - Same as Enter the Experience */}
              <Ionicons name="qr-code-outline" size={36} color="#ffffff" />
            </LinearGradient>
          )}
        </Pressable>
      </View>

      {/* Tab Bar Container - iOS 26 Liquid Glass - Darker */}
      <LinearGradient
        colors={[
          "rgba(5, 5, 8, 0.95)",
          "rgba(12, 12, 18, 0.92)",
          "rgba(8, 8, 12, 0.94)",
        ]}
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
          borderWidth: 1.5,
          borderColor: "rgba(255, 255, 255, 0.1)",
          backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker backdrop
          ...Shadows.xl,
        }}
      >
        {/* Active Tab Indicator with Swoosh Animation - Liquid Glass */}
        <Animated.View
          style={{
            position: "absolute",
            width: TAB_WIDTH,
            height: TAB_HEIGHT,
            borderRadius: TAB_HEIGHT / 2,
            backgroundColor: "rgba(168, 85, 247, 0.25)",
            borderWidth: 1.5,
            borderColor: "rgba(168, 85, 247, 0.5)",
            left: getIndicatorPosition(),
            shadowColor: Colors.accent.purple.light,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 4,
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
                name={state.index === 1 ? "notifications" : "notifications-outline"}
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
                name={state.index === 2 ? "search" : "search-outline"}
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
