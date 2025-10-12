// src/lib/ingest.ts
import { supabase } from "./supabase";


type IngestOK = { ok: true; score?: number; row?: unknown };
type IngestErr = { ok: false; error: string };
type IngestResponse = IngestOK | IngestErr;

function getProjectUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  if (!url) throw new Error("Missing Supabase URL");
  return url.replace(/\/+$/, "");
}

function getFunctionsBase(): string {
  // Toggle local functions during dev
  if (process.env.NEXT_PUBLIC_USE_LOCAL_FUNCS === "1") {
    return "http://127.0.0.1:54321";
  }
  return getProjectUrl();
}

function getAnonKey(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

export async function sendIngest({
  eventId,
  accel = 0,
  steps = 0,
  userIdOverride,
  source = "dashboard",
  data,
}: {
  eventId: string;
  accel?: number;
  steps?: number;
  /** dev-only: use when testing without auth */
  userIdOverride?: string;
  source?: string;
  data?: Record<string, unknown>;
}): Promise<IngestResponse> {
  const url = `${getFunctionsBase()}/functions/v1/ingest`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token ?? undefined;

  const body = {
    event_id: eventId,
    accel,
    steps,
    timestamp: new Date().toISOString(),
    source,
    ...(data ? { data } : {}),
    ...(token ? {} : userIdOverride ? { user_id: userIdOverride } : {}),
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apikey = getAnonKey();
  if (apikey) headers["apikey"] = apikey;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  let json: IngestResponse | null = null;
  try { json = (await res.json()) as IngestResponse; } catch {}
  if (!res.ok || json?.ok === false) {
    const msg = (json && "error" in json) ? json.error : await res.text().catch(() => "unknown");
    throw new Error(`Ingest failed: ${res.status} – ${msg}`);
  }
  return json!;
}
