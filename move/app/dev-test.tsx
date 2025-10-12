import { useRef, useState } from "react";
import { Alert, Button, Text, View } from "react-native";
import { startMotionStream } from "../src/lib/motionStream";

const EVENT_ID = "c24f989e-3551-49d2-97c0-75bd54e7ac25"; // your event uuid

export default function DevTest() {
  const handleRef = useRef<ReturnType<typeof startMotionStream> | null>(null);
  const [running, setRunning] = useState(false);

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 24 }}>
      <Text style={{ color: "#fff" }}>Streaming to event: {EVENT_ID}</Text>

      <Button
        title={running ? "Stop Motion Stream" : "Start Motion Stream"}
        onPress={() => {
          if (!running) {
            handleRef.current = startMotionStream(EVENT_ID, 1000); // post ~1/sec
            setRunning(true);
          } else {
            handleRef.current?.stop();
            handleRef.current = null;
            setRunning(false);
            Alert.alert("Stopped", "Motion stream stopped.");
          }
        }}
      />
    </View>
  );
}
