// components/home/SectionCard.tsx
import React from "react";
import { Text, View, ViewProps } from "react-native";

export default function SectionCard({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewProps["style"];
}) {
  return (
    <View
      style={[
        {
          backgroundColor: "#0f172a",
          borderColor: "#1f2937",
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      <View>
        <Text style={{ color: "#e5e7eb", fontWeight: "700", fontSize: 16 }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ color: "#9ca3af", fontSize: 12 }}>{subtitle}</Text>
        )}
      </View>

      {children}
    </View>
  );
}
