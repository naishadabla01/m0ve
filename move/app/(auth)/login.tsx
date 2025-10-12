import { router } from "expo-router";
import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 8 }}>Sign in</Text>
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
      <Button title="I’m already signed in" onPress={() => router.replace("/scan")} />
    </View>
  );
}
