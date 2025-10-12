// app/(auth)/signup.tsx
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [busy,        setBusy]        = useState(false);

  async function doSignup() {
    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert("Missing", "Enter email and password");
        return;
      }
      setBusy(true);

      // 1) Create auth user — names in metadata are for convenience only
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            display_name: displayName || null,
            first_name: firstName || null,
            last_name:  lastName  || null,
          },
        },
      });
      if (error) throw error;

      // 2) Upsert profiles — DO NOT write display_name (it's GENERATED in DB)
      const uid = data.user?.id;
      if (uid) {
        const { error: upErr } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: uid,
              first_name: firstName || null,
              last_name:  lastName  || null,
              email: email.trim(),
              role: "user", // ensure new users get 'user'
            },
            { onConflict: "user_id" }
          );
        if (upErr) throw upErr;
      }

      Alert.alert("Account created", "You are now signed in.");
      router.replace("/scan");
    } catch (e: any) {
      Alert.alert("Sign up failed", e?.message ?? "unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar barStyle="light-content" />

      {/* Background drops */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 240,
            height: 240,
            borderRadius: 9999,
            backgroundColor: "#10b981",
            opacity: 0.15,
            filter: Platform.OS === "web" ? "blur(60px)" : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -90,
            left: -70,
            width: 280,
            height: 280,
            borderRadius: 9999,
            backgroundColor: "#22d3ee",
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
        <Text style={{ color: "#a3a3a3", fontSize: 12, letterSpacing: 1.1 }}>
          CREATE ACCOUNT FOR
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 36 }}>
        <Text
          style={{
            color: "#d4d4d4",
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 18,
          }}
        >
          Let’s get you moving ✨
        </Text>

        <View style={{ gap: 14 }}>
          <LabeledInput
            label="Display name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="What should we call you?"
          />

          <DoubleRow>
            <LabeledInput
              flex
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Alex"
            />
            <LabeledInput
              flex
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Taylor"
            />
          </DoubleRow>

          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
          />

          <LabeledInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a strong password"
          />

          <PrimaryButton
            title={busy ? "Creating…" : "Sign up"}
            onPress={doSignup}
            disabled={busy}
          />

          <SecondaryButton
            title="I already have an account"
            onPress={() => router.replace("/(auth)/signin")}
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
        <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
          By continuing you agree to the community guidelines.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/* ——— Reusable bits to keep the same style as Sign in / Home ——— */

function LabeledInput(props: any) {
  const { label, flex, style, ...inputProps } = props;
  return (
    <View style={[{ gap: 6, flex: flex ? 1 : undefined }, style]}>
      <Text style={{ color: "#9ca3af", fontSize: 13 }}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#6b7280"
        style={{
          backgroundColor: "#0f172a",
          borderColor: "#1f2937",
          borderWidth: 1,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 14,
          color: "#e5e7eb",
        }}
      />
    </View>
  );
}

function DoubleRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {children}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#0ea371" : "#10b981",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        opacity: disabled ? 0.7 : 1,
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
