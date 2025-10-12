// src/lib/ingest.ts
import Constants from "expo-constants";
import { supabase } from "./supabase";

type IngestBody = { event_id: string; accel?: number; steps?: number };

const INGEST_URL =
  (Constants.expoConfig?.extra as any)?.ingestUrl ||
  process.env.EXPO_PUBLIC_INGEST_URL; // either app.json extra or env

const PUB_KEY =
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function sendIngest(body: IngestBody) {
  if (!INGEST_URL) throw new Error("INGEST_URL missing");

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("No session — sign in first");

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,        // <-- REQUIRED (Verify JWT: ON)
      "Content-Type": "application/json",
      // apikey is optional; kept for safety with edge runtime:
      ...(PUB_KEY ? { apikey: PUB_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(json?.error || text || `HTTP ${res.status}`);
  }
  return json as { ok: boolean; score?: number };
}
