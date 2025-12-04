import Constants from "expo-constants";
import { Platform } from "react-native";

export function apiBase(): string {
  // METHOD 1: Try process.env (works in development and some production builds)
  let explicit = process.env.EXPO_PUBLIC_API_BASE?.trim();
  
  // METHOD 2: Try Constants from app.json (works in Expo web builds)
  if (!explicit || explicit === "auto") {
    explicit = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
  }
  
  // DEBUG LOGGING - Will show in browser console
  console.log("=== API BASE DEBUG ===");
  console.log("📍 From process.env:", process.env.EXPO_PUBLIC_API_BASE);
  console.log("📍 From Constants:", Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE);
  console.log("📍 Final value:", explicit);
  console.log("📍 Platform:", Platform.OS);
  console.log("=====================");
  
  // If we found a valid value from env or Constants, use it
  if (explicit && explicit !== "auto") {
    console.log("✅ Using explicit API base:", explicit);
    return explicit;
  }

  // FALLBACK FOR WEB: If on web and no env vars worked, hardcode Railway URL
  if (Platform.OS === "web") {
    console.log("⚠️  Using hardcoded Railway URL for web");
    return "https://move.up.railway.app";
  }

  // NATIVE FALLBACKS
  if (Platform.OS === "android") {
    console.log("⚠️  Using hardcoded Railway URL for Android");
    return "https://move.up.railway.app";
  }

  if (Platform.OS === "ios") {
    console.log("⚠️  Using hardcoded Railway URL for iOS");
    return "https://move.up.railway.app";
  }

  // ABSOLUTE FALLBACK
  console.log("⚠️  Using absolute fallback Railway URL");
  return "https://move.up.railway.app";
}
