import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { event_id } = await req.json();
    if (!event_id) return NextResponse.json({ ok: false, error: "Missing event_id" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // who am I?
    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    // ensure ownership
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("event_id, artist_id, start_at")
      .eq("event_id", event_id)
      .single();

    if (evErr || !ev) return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    if (ev.artist_id !== me.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    // set start_at = now() only if not already set
    const { data, error } = await supabase
      .from("events")
      .update({ start_at: ev.start_at ?? new Date().toISOString() })
      .eq("event_id", event_id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, event: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 400 });
  }
}
