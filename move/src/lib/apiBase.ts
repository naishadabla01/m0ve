import { Platform } from "react-native";

export function apiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_BASE?.trim();
  if (explicit && explicit !== "auto") return explicit;

  // WEB (Expo on :8081) -> talk to dashboard on :3000
  if (typeof window !== "undefined") {
    const { protocol, hostname, port, origin } = window.location;
    if (port && port !== "3000") return `${protocol}//${hostname}:3000`;
    return origin; // already on :3000
  }

  // NATIVE
  if (Platform.OS === "android") return "http://10.0.2.2:3000"; // ← important
  if (Platform.OS === "ios")     return "http://localhost:3000";

  return "http://localhost:3000";
}
