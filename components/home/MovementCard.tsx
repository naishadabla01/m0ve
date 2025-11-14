// components/home/MovementCard.tsx
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function MovementCard() {
  return (
    <View
      style={{
        backgroundColor: "#0b1920",
        borderColor: "#11212b",
        borderWidth: 1,
        padding: 16,
        borderRadius: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 24 }}>🏃‍♂️</Text>
        <Text style={{ color: "#e5e7eb", fontSize: 16, fontWeight: "700" }}>
          Movement Screen
        </Text>
      </View>
      
      <Text style={{ color: "#9ca3af", fontSize: 14, lineHeight: 20 }}>
        Start moving and contributing to the crowd energy! Your movement will be tracked in real-time.
      </Text>

      <Pressable
        onPress={() => router.push("/move")}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#0d9488" : "#10b981",
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 4,
        })}
      >
        <Text style={{ color: "#000", fontWeight: "700", fontSize: 15 }}>
          Open Movement Screen
        </Text>
      </Pressable>

      <View
        style={{
          marginTop: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#1f2937",
        }}
      >
        <Text style={{ color: "#6b7280", fontSize: 12, lineHeight: 18 }}>
          💡 Tip: Join an event first, then come here to start moving!
        </Text>
      </View>
    </View>
  );
}