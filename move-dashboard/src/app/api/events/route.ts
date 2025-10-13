// move-dashboard/src/app/api/events/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route returns events with a recent "energy" score.
// Energy = sum(sum_accel) from motion_buckets over the last N minutes (default 60).

type Row = {
  event_id: string;
  name: string | null;
  short_code: string | null;
  energy: number;
  last_activity: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!;
const admin = createClient(url, key, { auth: { persistSession: false } });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const minutesParam = (searchParams.get("minutes") || "60").toLowerCase();
    const limit = Math.max(1, Math.min(+((searchParams.get("limit") || "25")), 100));
    const minutes = minutesParam === "all" ? null : Number(minutesParam);
    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) {
      return NextResponse.json({ ok: false, error: "bad minutes" }, { status: 400 });
    }

    // time window
    const sinceIso = minutes === null
      ? null
      : new Date(Date.now() - minutes * 60_000).toISOString();

    // pull buckets in window
    let q = admin
      .from("motion_buckets")
      .select("event_id, sum_accel, last_sample_at")
      .order("last_sample_at", { ascending: false });

    if (sinceIso) q = q.gte("last_sample_at", sinceIso);

    const { data: buckets, error: bErr } = await q;
    if (bErr) throw bErr;

    // reduce -> energy per event
    const byEvent: Record<string, { energy: number; last: string | null }> = {};
    for (const b of buckets || []) {
      const id = (b as any).event_id as string;
      const s = Number((b as any).sum_accel) || 0;
      const t = ((b as any).last_sample_at as string) || null;
      if (!id) continue;
      if (!byEvent[id]) byEvent[id] = { energy: 0, last: t };
      byEvent[id].energy += s;
      if (t && (!byEvent[id].last || new Date(t) > new Date(byEvent[id].last!))) {
        byEvent[id].last = t;
      }
    }

    // ✅ FIXED: fetch event metadata using event_id instead of id
    const ids = Object.keys(byEvent);
    let meta: Record<string, { name: string | null; short_code: string | null }> = {};
    if (ids.length) {
      const { data: events, error: eventsErr } = await admin
        .from("events")
        .select("event_id, name, title, short_code")  // ← Changed from "id" to "event_id"
        .in("event_id", ids);  // ← Changed from "id" to "event_id"
      
      if (eventsErr) {
        console.error("Failed to fetch event metadata:", eventsErr);
      }

      for (const e of events || []) {
        // ✅ Use event_id as the key
        const eventId = (e as any).event_id;
        meta[eventId] = {
          name: (e as any).name ?? (e as any).title ?? null,  // ← Try both name and title
          short_code: (e as any).short_code ?? null,
        };
      }
    }

    // rows
    let rows: Row[] = ids.map(id => ({
      event_id: id,
      name: meta[id]?.name ?? null,
      short_code: meta[id]?.short_code ?? null,
      energy: +(byEvent[id].energy || 0),
      last_activity: byEvent[id].last,
    }));

    rows.sort((a, b) => b.energy - a.energy);
    rows = rows.slice(0, limit);

    return NextResponse.json({ ok: true, rows, revalidate: 0 }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}