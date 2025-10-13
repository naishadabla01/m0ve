// src/lib/join.ts
import { apiBase } from "@/lib/apiBase";
import { fetchJson } from "@/lib/http";
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import { Alert } from "react-native";

type JoinOk = { ok: true; joined: boolean; event_id?: string; code?: string };
type JoinErr = { ok: false; error: string };
export type JoinResponse = JoinOk | JoinErr;

export async function joinEvent(opts: {
  code?: string;
  eventId?: string;
  userId: string;
}): Promise<JoinResponse> {
  const { code, eventId, userId } = opts;
  const base = apiBase();
  const url = new URL("/api/join", base);
  if (code) url.searchParams.set("code", code);
  if (eventId) url.searchParams.set("event_id", eventId);
  url.searchParams.set("user_id", userId);

  console.log("[join] →", url.toString());
  const j = await fetchJson(url.toString(), { method: "GET" });
  return j as JoinResponse;
}

export async function joinByCode(userId: string, code: string) {
  const url = `${apiBase()}/api/join?code=${encodeURIComponent(
    code
  )}&user_id=${encodeURIComponent(userId)}`;
  const j = await fetchJson(url, { method: "GET" });
  if (!j?.ok) throw new Error(j?.error || "join failed");
  return j.event_id as string;
}

/**
 * ✅ FIXED: Now shows custom modal and navigates to /move screen
 */
export async function joinEventById(eventId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) {
    Alert.alert("Not signed in", "Please sign in first.");
    return;
  }

  const url = `${apiBase()}/api/join?event_id=${encodeURIComponent(
    eventId
  )}&user_id=${encodeURIComponent(uid)}`;
  
  try {
    await fetchJson(url, { method: "GET" });
    
    // ✅ Show success and navigate to movement screen
    Alert.alert(
      "Joined!",
      "You're in! Press OK to start moving.",
      [
        {
          text: "OK",
          onPress: () => {
            router.push({ pathname: "/move", params: { event_id: eventId } });
          },
        },
      ]
    );
  } catch (e: any) {
    Alert.alert("Join failed", e?.message ?? "Unknown error");
  }
}

/**
 * ✅ FIXED: Now navigates within app using Expo Router instead of opening browser
 */
export function openLeaderboard(eventId: string) {
  try {
    // Navigate to in-app leaderboard screen
    router.push({
      pathname: "/(home)/leaderboard",
      params: { event_id: eventId },
    });
  } catch (e) {
    console.error("Failed to open leaderboard:", e);
    Alert.alert("Error", "Unable to open leaderboard. Please try again.");
  }
}

/**
 * Join by event ID and navigate to the events list or specified screen
 */
export async function joinByEventId(userId: string, eventId: string): Promise<string> {
  const url = `${apiBase()}/api/join?event_id=${encodeURIComponent(
    eventId
  )}&user_id=${encodeURIComponent(userId)}`;
  
  const j = await fetchJson(url, { method: "GET" });
  if (!j?.ok) throw new Error(j?.error || "join failed");
  return j.event_id as string;
}