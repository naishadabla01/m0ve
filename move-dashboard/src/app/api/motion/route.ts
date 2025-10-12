// move-dashboard/src/app/api/motion/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type IncomingSample = {
  // what the app sends
  t?: number;         // ms epoch
  ts?: number;        // allow alt name
  mag?: number;       // magnitude from client
  accel?: number;     // allow alt name
  steps?: number;
  x?: number; y?: number; z?: number; // ignored for DB, kept for future
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event_id: string | undefined = body?.event_id;
    const user_id: string | undefined = body?.user_id;
    const samples: IncomingSample[] = Array.isArray(body?.samples) ? body.samples : [];

    if (!event_id || !user_id || samples.length === 0) {
      return NextResponse.json({ ok: false, error: "bad payload" }, { status: 400 });
    }

    // ---- Server Supabase (service role) ----
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!; // <— KEY (not SUPABASE_SERVICE_ROLE)
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 500 });
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ---- Compute delta seconds from this batch ----
    const times = samples
      .map(s => (typeof s.t === "number" ? s.t : (typeof s.ts === "number" ? s.ts : undefined)))
      .filter((v): v is number => typeof v === "number");

    const deltaSeconds =
      times.length > 0
        ? Math.max(0, Math.round((Math.max(...times) - Math.min(...times)) / 1000))
        : 0;

    // ---- Read current participant seconds ----
    const { data: existing, error: selErr } = await sb
      .from("event_participants")
      .select("seconds")
      .eq("event_id", event_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 });
    }

    const newSeconds = (existing?.seconds ?? 0) + deltaSeconds;

    // ---- Upsert participant progress ----
    const { error: upErr } = await sb
      .from("event_participants")
      .upsert({
        event_id,
        user_id,
        seconds: newSeconds,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    // ---- Store raw samples to motion_samples (matches your schema) ----
    // motion_samples columns: event_id (uuid), user_id (uuid),
    // accel (double precision), steps (int), created_at (timestamptz)
    const rows = samples.map((s) => ({
      event_id,
      user_id,
      accel: Number(s.accel ?? s.mag ?? 0),
      steps: Number(s.steps ?? 0),
      created_at: new Date((s.t ?? s.ts ?? Date.now())).toISOString(),
    }));

    if (rows.length) {
      const { error: insErr } = await sb.from("motion_samples").insert(rows);
      if (insErr) {
        // Don't fail the whole request if archival fails; just log
        console.warn("motion_samples insert warning:", insErr.message);
      }
    }

    return NextResponse.json({ ok: true, deltaSeconds, total: newSeconds });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
