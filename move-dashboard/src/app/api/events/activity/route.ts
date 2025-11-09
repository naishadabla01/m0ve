// PATH: move-dashboard/src/app/api/events/activity/route.ts
// Returns aggregated energy bins for an event + simple “top peaks”.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");
    if (!event_id) {
      return NextResponse.json({ ok: false, error: "missing event_id" }, { status: 400 });
    }

    const sb = createClient(url, key, { auth: { persistSession: false } });

    // 1) Get event window
    const { data: ev, error: evErr } = await sb
      .from("events")
      .select("start_at, end_at")
      .eq("event_id", event_id)
      .maybeSingle();

    if (evErr || !ev?.start_at) {
      return NextResponse.json({ ok: false, error: "event not found" }, { status: 404 });
    }

    const startTs = new Date(ev.start_at).getTime();
    const endTs = ev.end_at ? new Date(ev.end_at).getTime() : Date.now();

    // 2) Pull raw buckets (per-user minute buckets in your schema)
    const { data: buckets, error: bErr } = await sb
      .from("motion_buckets")
      .select("bucket_ts, sum_accel")
      .eq("event_id", event_id)
      .gte("bucket_ts", new Date(startTs).toISOString())
      .lte("bucket_ts", new Date(endTs).toISOString());

    if (bErr) {
      return NextResponse.json({ ok: false, error: bErr.message }, { status: 400 });
    }

    // 3) Aggregate to 1-minute bins across all users
    const minute = 60_000;
    const binMap = new Map<number, number>(); // t(ms) -> energy
    for (const r of buckets ?? []) {
      const ts = new Date((r as any).bucket_ts).getTime();
      const binStart = Math.floor(ts / minute) * minute;
      binMap.set(binStart, (binMap.get(binStart) ?? 0) + Number((r as any).sum_accel ?? 0));
    }

    const bins = Array.from(binMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, energy]) => ({ t, energy }));

    // 4) Simple “top peaks”: the N highest single-minute bins
    const N = 5;
    const peaks = [...bins]
      .sort((a, b) => b.energy - a.energy)
      .slice(0, N)
      .map((b) => ({
        label: new Date(b.t).toLocaleTimeString(),
        energy: b.energy,
      }));

    return NextResponse.json({ ok: true, bins, peaks, revalidate: 0 }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
