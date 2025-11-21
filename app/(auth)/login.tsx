import { router } from "expo-router";
import { useState } from "react";
import { Alert, Button, Text, TextInput, View, Pressable } from "react-native";
import { supabase } from "../../src/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const devLogin = async () => {
    try {
      setSending(true);
      // Dev credentials - you can change these
      const DEV_EMAIL = "dev@m0ve.app";
      const DEV_PASSWORD = "dev123456";

      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      });

      if (error) {
        // If user doesn't exist, create it
        const { error: signUpError } = await supabase.auth.signUp({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });

        if (signUpError) throw signUpError;

        // Try signing in again
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });

        if (retryError) throw retryError;
      }

      router.replace("/(home)");
    } catch (e: any) {
      Alert.alert("Dev login failed", e?.message ?? "unknown error");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 8 }}>Sign in</Text>

      {/* DEV LOGIN BUTTON - Quick access */}
      <Pressable
        onPress={devLogin}
        style={{
          backgroundColor: "#10b981",
          padding: 16,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
          {sending ? "Logging in..." : "🚀 Dev Login (Quick)"}
        </Text>
      </Pressable>

      <View style={{ height: 1, backgroundColor: "#333", marginVertical: 8 }} />

      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="you@example.com"
        placeholderTextColor="#888"
        style={{ backgroundColor: "#111", borderColor: "#333", borderWidth: 1, borderRadius: 12, padding: 12, color: "#fff" }}
      />
      <Button
        title={sending ? "Sending..." : "Send magic link"}
        disabled={sending}
        onPress={async () => {
          try {
            if (!email.trim()) return Alert.alert("Email required");
            setSending(true);
            const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
            if (error) throw error;
            Alert.alert("Check your email", "Open the link to finish signing in.");
          } catch (e: any) {
            Alert.alert("Sign in failed", e?.message ?? "unknown error");
          } finally {
            setSending(false);
          }
        }}
      />
      <Button title="I'm already signed in" onPress={() => router.replace("/scan")} />
    </View>
  );
}
