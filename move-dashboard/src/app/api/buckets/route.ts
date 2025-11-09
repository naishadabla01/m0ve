import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event_id") ?? "";
    const minutesParam = (searchParams.get("minutes") ?? "60").toLowerCase();

    if (!eventId) {
      return NextResponse.json({ ok: false, error: "missing event_id" }, { status: 400 });
    }

    // minutes can be "all" or a positive number
    let sinceISO: string | null = null;
    if (minutesParam !== "all") {
      const minutes = Number(minutesParam);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        return NextResponse.json({ ok: false, error: "invalid minutes" }, { status: 400 });
      }
      sinceISO = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    }

    // columns we actually have in motion_buckets
    // (from your screenshots): event_id, user_id, bucket_ts, sample_count, sum_accel, max_accel, last_sample_at
    let q = admin
      .from("motion_buckets")
      .select("bucket_ts,sum_accel")
      .eq("event_id", eventId)
      .order("bucket_ts", { ascending: true });

    if (sinceISO) {
      q = q.gte("bucket_ts", sinceISO);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // aggregate per-minute timestamp (bucket_ts should already be minute-bucketed,
    // but we'll defensively group in case multiple rows share the same minute)
    const byTs = new Map<string, number>();
    for (const row of data ?? []) {
      const ts: string = (row as any).bucket_ts;   // ISO string
      const sum: number = Number((row as any).sum_accel ?? 0);
      if (!ts) continue;
      byTs.set(ts, (byTs.get(ts) ?? 0) + sum);
    }

    const rows = Array.from(byTs.entries()).map(([t, total]) => ({
      t,
      // scale/round for a clean “crowd energy” number; tweak as you like
      energy: Math.round(total),
    }));

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
