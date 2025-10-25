// PATH: move/src/lib/join.ts
// (3B.1) Updated to POST /api/join and handle "ended" responses without breaking existing callers.

import { apiBase } from "@/lib/apiBase";
import { fetchJson } from "@/lib/http";
import { supabase } from "@/lib/supabase/client";
import { router } from "expo-router";
import { Alert } from "react-native";

type JoinOk = { ok: true; joined?: boolean; joinable: true; event_id: string; code: string; event?: any };
type JoinEndedTop = { rank: number; user_id: string; name: string; avatar_url: string | null; score: number };
type JoinEnded = {
  ok: false;
  joinable: false;
  reason: "ended";
  event_id: string;
  code: string;
  event: { id: string; title: string; cover_url?: string | null; code: string };
  top10: JoinEndedTop[];
};
type JoinErr = { ok: false; error: string };

export type JoinResponse = JoinOk | JoinEnded | JoinErr;

// ---- internal helper: POST /api/join ----
async function postJoin(body: { code?: string; event_id?: string }): Promise<JoinResponse> {
  const base = apiBase();
  const url = new URL("/api/join", base);
  const res = await fetchJson(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res as JoinResponse;
}

// Public API that mirrors your previous surface but supports ended case
export async function joinEvent(opts: { code?: string; eventId?: string; userId: string }): Promise<JoinResponse> {
  // userId no longer required by API; keeping in signature for backward compatibility
  const { code, eventId } = opts;
  return postJoin({ code, event_id: eventId });
}

export async function joinByCode(userId: string, code: string): Promise<JoinResponse> {
  // userId kept for backward compatibility; not sent to API
  return postJoin({ code });
}

/**
 * Join event by ID and navigate to movement screen (ok path).
 * If the event has ENDED, we DO NOT navigate here; we return the ended payload to the caller.
 * Caller (3B.2) can then redirect to the Final Leaderboard page with Top 10.
 */
export async function joinEventById(eventId: string): Promise<JoinResponse> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;

  if (!uid) {
    if (typeof window !== "undefined") {
      window.alert("Please sign in first to join events.");
    } else {
      Alert.alert("Not signed in", "Please sign in first.");
    }
    return { ok: false, error: "Not signed in" };
  }

  try {
    const response = await postJoin({ event_id: eventId });

    // If the server says the event has ended, surface it to caller (no navigation here).
    if (!response.ok && (response as any).reason === "ended") {
      return response;
    }

    if (!response.ok) {
      throw new Error((response as JoinErr).error || "Join failed");
    }

    // ok + joinable → keep your existing behavior (persist + navigate to /move)
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("event_id", String(eventId));
    } catch (storageError) {
      console.warn("Failed to save event_id to storage:", storageError);
    }

    setTimeout(() => {
      router.push({
        pathname: "/move",
        params: { event_id: response.event_id },
      });
    }, 100);

    return response;
  } catch (e: any) {
    console.error("❌ Join failed:", e);
    const errorMessage = e?.message || "Failed to join event. Please try again.";
    if (typeof window !== "undefined") {
      window.alert(errorMessage);
    } else {
      Alert.alert("Join failed", errorMessage);
    }
    return { ok: false, error: errorMessage };
  }
}

/**
 * Navigate to in-app leaderboard screen (unchanged)
 */
export function openLeaderboard(eventId: string) {
  try {
    router.push({
      pathname: "/(home)/leaderboard",
      params: { event_id: eventId },
    });
  } catch (e) {
    console.error("Failed to open leaderboard:", e);
    Alert.alert("Error", "Unable to open leaderboard. Please try again.");
  }
}
