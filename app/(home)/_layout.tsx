// app/(home)/_layout.tsx - iOS 26 Bottom Tab Navigation
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Shadows } from "../../constants/Design";

export default function HomeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 85,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[
              'rgba(10, 10, 10, 0.95)',
              'rgba(168, 85, 247, 0.08)',
              'rgba(236, 72, 153, 0.08)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 85,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
              ...Platform.select({
                ios: {
                  shadowColor: Colors.accent.purple.light,
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                },
                android: {
                  elevation: 20,
                },
              }),
            }}
          />
        ),
        tabBarActiveTintColor: Colors.accent.purple.light,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🏠" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🔔" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🔍" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="👤" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// iOS 26 Tab Icon with glow effect
function TabIcon({ icon, focused, color }: { icon: string; focused: boolean; color: string }) {
  return (
    <LinearGradient
      colors={focused ? [
        'rgba(168, 85, 247, 0.2)',
        'rgba(236, 72, 153, 0.2)',
      ] : ['transparent', 'transparent']}
      style={{
        width: 50,
        height: 50,
        borderRadius: BorderRadius.full,
        alignItems: "center",
        justifyContent: "center",
        ...focused && {
          ...Shadows.md,
        },
      }}
    >
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.6 }}>
        {icon}
      </Text>
    </LinearGradient>
  );
}
