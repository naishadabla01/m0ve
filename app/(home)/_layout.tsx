// app/(home)/_layout.tsx - iOS 26 Floating Tab Bar Navigation
import { Tabs } from "expo-router";
import React from "react";
import { FloatingTabBar } from "../../components/FloatingTabBar";

export default function HomeLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
