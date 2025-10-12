import { apiBase } from "@/lib/apiBase";
import { fetchJson } from "@/lib/http";
import { supabase } from "@/lib/supabase/client";
import { Alert, Linking } from "react-native";

type JoinOk  = { ok: true; joined: boolean; event_id?: string; code?: string };
type JoinErr = { ok: false; error: string };
export type JoinResponse = JoinOk | JoinErr;

export async function joinEvent(opts: { code?: string; eventId?: string; userId: string }): Promise<JoinResponse> {
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
  const url = `${apiBase()}/api/join?code=${encodeURIComponent(code)}&user_id=${encodeURIComponent(userId)}`;
  const j = await fetchJson(url, { method: "GET" });
  if (!j?.ok) throw new Error(j?.error || "join failed");
  return j.event_id as string;
}

export async function joinEventById(eventId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return Alert.alert("Not signed in", "Please sign in first.");

  const url = `${apiBase()}/api/join?event_id=${encodeURIComponent(eventId)}&user_id=${encodeURIComponent(uid)}`;
  try {
    await fetchJson(url, { method: "GET" });
    Alert.alert("Joined", "You're in! Open the movement screen to start.");
  } catch (e: any) {
    Alert.alert("Join failed", e?.message ?? "Unknown error");
  }
}

export function openLeaderboard(eventId: string) {
  const url = `${apiBase()}/leaderboard?event_id=${encodeURIComponent(eventId)}`;
  Linking.openURL(url).catch(() => Alert.alert("Unable to open leaderboard", "Please try again."));
}
