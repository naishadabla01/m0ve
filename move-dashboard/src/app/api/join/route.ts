// move-dashboard/src/app/api/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/service";

// Supabase service client needs Node APIs
export const runtime = "nodejs";
// Ensure this route is always dynamic (no static errors)
export const dynamic = "force-dynamic";

// ---------- CORS ----------
function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

// ---------- helpers ----------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string) => UUID_RE.test(v);

async function findEventIdByCode(code: string): Promise<string | null> {
  // Try exact code
  {
    const { data, error } = await admin
      .from("events")
      .select("event_id")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(`lookup code failed: ${error.message}`);
    if (data?.event_id) return data.event_id as string;
  }
  // Try short_code
  {
    const { data, error } = await admin
      .from("events")
      .select("event_id")
      .eq("short_code", code)
      .maybeSingle();
    if (error) throw new Error(`lookup short_code failed: ${error.message}`);
    if (data?.event_id) return data.event_id as string;
  }
  // Try case-insensitive match on code (in case input case differs)
  {
    const { data, error } = await admin
      .from("events")
      .select("event_id")
      .ilike("code", code)
      .maybeSingle();
    if (error) throw new Error(`lookup ilike code failed: ${error.message}`);
    if (data?.event_id) return data.event_id as string;
  }
  // Try case-insensitive short_code
  {
    const { data, error } = await admin
      .from("events")
      .select("event_id")
      .ilike("short_code", code)
      .maybeSingle();
    if (error) throw new Error(`lookup ilike short_code failed: ${error.message}`);
    if (data?.event_id) return data.event_id as string;
  }

  return null;
}

async function resolveEventId(raw: string): Promise<string | null> {
  const s = (raw || "").trim();
  if (!s) return null;

  // If URL, check params first
  try {
    if (s.includes("://")) {
      const u = new URL(s);
      const eid = (u.searchParams.get("event_id") || "").trim();
      const code = (u.searchParams.get("code") || "").trim();
      if (eid && isUuid(eid)) return eid;
      if (code) return (await findEventIdByCode(code)) ?? null;
    }
  } catch {
    // fall through
  }

  if (isUuid(s)) return s;

  return await findEventIdByCode(s);
}

async function ensureScoreRow(event_id: string, user_id: string) {
  // 1) fast-path: does it already exist?
  const { data, error } = await admin
    .from("scores")
    .select("event_id")
    .eq("event_id", event_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (error && (error as any).code !== "PGRST116") {
    // PGRST116 = no rows / maybeSingle empty in some versions; ignore that
    throw new Error(`scores existence check failed: ${error.message}`);
  }
  if (data) return; // already present — nothing to do

  // 2) try insert; if a race inserts first, ignore 23505 unique violation
  const { error: insErr } = await admin
    .from("scores")
    .insert({ event_id, user_id, score: 0 });

  if (insErr) {
    const code = (insErr as any).code;
    if (code === "23505") return; // duplicate key — safe to ignore
    throw new Error(`ensure scores row failed: ${insErr.message}`);
  }
}


// ---------- main handlers ----------
export async function GET(req: NextRequest) {
  const headers = cors(req);
  try {
    const url = new URL(req.url);
    const raw =
      url.searchParams.get("event") ??
      url.searchParams.get("code") ??
      url.searchParams.get("event_id") ??
      "";
    const user_id = url.searchParams.get("user_id") ?? "";

    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "missing event" },
        { status: 400, headers }
      );
    }

    const event_id = await resolveEventId(raw);
    if (!event_id) {
      return NextResponse.json(
        { ok: false, error: "event not found" },
        { status: 404, headers }
      );
    }

    if (user_id) {
      await ensureScoreRow(event_id, user_id);
    }

    return NextResponse.json({ ok: true, event_id }, { headers });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "internal error" },
      { status: 500, headers }
    );
  }
}

export async function POST(req: NextRequest) {
  const headers = cors(req);
  try {
    let body: any = null;
    try { body = await req.json(); } catch {}

    const url = new URL(req.url);
    const raw =
      body?.event ??
      url.searchParams.get("event") ??
      url.searchParams.get("code") ??
      url.searchParams.get("event_id") ??
      "";
    const user_id = body?.user_id ?? url.searchParams.get("user_id") ?? "";

    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "missing user_id" },
        { status: 400, headers }
      );
    }

    const event_id = await resolveEventId(raw);
    if (!event_id) {
      return NextResponse.json(
        { ok: false, error: "event not found" },
        { status: 404, headers }
      );
    }

    await ensureScoreRow(event_id, user_id);
    return NextResponse.json({ ok: true, event_id }, { headers });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "internal error" },
      { status: 500, headers }
    );
  }
}
