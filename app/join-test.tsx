import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { joinEvent } from "../src/lib/join";

export default function JoinTestScreen() {
  const [codeOrId, setCodeOrId] = useState("");

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>
        Join Event (code or UUID)
      </Text>

      <TextInput
        value={codeOrId}
        onChangeText={setCodeOrId}
        placeholder="e.g. JRYBJB or 123e4567-e89b-12d3-a456-426614174000"
        placeholderTextColor="#999"
        autoCapitalize="characters"
        style={{
          borderWidth: 1,
          borderColor: "#333",
          backgroundColor: "#111",
          color: "#fff",
          padding: 12,
          borderRadius: 12,
        }}
      />

      <Button
        title="Join"
        onPress={async () => {
          try {
            if (!codeOrId.trim()) {
              Alert.alert("Missing", "Enter an event code or UUID");
              return;
            }
            const res = await joinEvent(codeOrId.trim());
            Alert.alert("Joined", `event_id: ${res.event_id}`);
          } catch (e: any) {
            console.log(e);
            Alert.alert("Failed", e?.message ?? "unknown error");
          }
        }}
      />

      <Text style={{ color: "#888", fontSize: 12 }}>
        Tip: On a real device, set{" "}
        <Text style={{ color: "#fff" }}>EXPO_PUBLIC_API_BASE</Text> to your
        computer’s LAN IP (e.g. http://192.168.6.30:3000).
      </Text>
    </View>
  );
}
